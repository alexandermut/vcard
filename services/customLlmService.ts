import { ImageInput } from './aiService';
import { Language } from '../types';

export interface CustomLLMConfig {
    baseUrl: string;
    apiKey: string;
    model: string;
}

const SYSTEM_PROMPT = `You are a specialized Data Extraction AI designed to parse business cards. 
Your task is to extract contact information from the provided image and return it as a strict JSON object.

RULES:
1. Output MUST be valid JSON only. No Markdown formatting (no \`\`\`json blocks), no conversational text.
2. If a field is not found, use null.
3. Auto-correct obvious OCR errors.
4. Format phone numbers to international standard if possible.

Return ONLY this JSON structure:
{
  "firstName": "string or null",
  "lastName": "string or null",
  "company": "string or null",
  "role": "string or null",
  "website": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "mobile": "string or null",
  "address": {
    "street": "string or null",
    "city": "string or null",
    "zip": "string or null",
    "country": "string or null"
  },
  "socialMedia": ["string"]
}`;

export const scanCardWithCustomLLM = async (
    images: ImageInput[],
    config: CustomLLMConfig,
    lang: Language
): Promise<string> => {
    if (!config.baseUrl) throw new Error('Custom LLM Base URL is required');
    if (images.length === 0) throw new Error('NO_IMAGES');

    // Build OpenAI-compatible request
    const messages = [
        {
            role: 'system',
            content: SYSTEM_PROMPT,
        },
        {
            role: 'user',
            content: [
                {
                    type: 'text',
                    text: 'Extract contact information from this business card image.',
                },
                ...images.map(img => ({
                    type: 'image_url',
                    image_url: {
                        url: `data:${img.mimeType};base64,${img.base64}`,
                    },
                })),
            ],
        },
    ];

    const requestBody = {
        model: config.model,
        messages,
        temperature: 0,
    };

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    // Only add Authorization header if API key is provided
    if (config.apiKey && config.apiKey.trim() !== '') {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    try {
        const response = await fetch(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Custom LLM API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error('No response from custom LLM');
        }

        // Parse JSON response and convert to vCard
        const contactData = parseJSONResponse(content);
        return convertToVCard(contactData);
    } catch (error: any) {
        console.error('Custom LLM Error:', error);
        throw new Error(`Custom LLM failed: ${error.message}`);
    }
};

interface ContactData {
    firstName: string | null;
    lastName: string | null;
    company: string | null;
    role: string | null;
    website: string | null;
    email: string | null;
    phone: string | null;
    mobile: string | null;
    address: {
        street: string | null;
        city: string | null;
        zip: string | null;
        country: string | null;
    } | null;
    socialMedia: string[];
}

const parseJSONResponse = (response: string): ContactData => {
    // Clean response (remove potential markdown blocks)
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```\n?/g, '');
    }

    try {
        return JSON.parse(cleaned);
    } catch (e) {
        console.error('Failed to parse JSON:', cleaned);
        throw new Error('Invalid JSON response from custom LLM');
    }
};

const convertToVCard = (data: ContactData): string => {
    const lines: string[] = ['BEGIN:VCARD', 'VERSION:3.0'];

    // Generate FN and N
    const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ') || data.company || 'Unknown';
    lines.push(`FN:${fullName}`);

    if (data.firstName || data.lastName) {
        const n = `${data.lastName || ''};${data.firstName || ''};;;`;
        lines.push(`N:${n}`);
    }

    // Company and role
    if (data.company) {
        lines.push(`ORG:${data.company}`);
    }

    if (data.role) {
        lines.push(`TITLE:${data.role}`);
    }

    // Contact info
    if (data.email) {
        lines.push(`EMAIL;TYPE=WORK:${data.email}`);
    }

    if (data.phone) {
        lines.push(`TEL;TYPE=WORK:${data.phone}`);
    }

    if (data.mobile) {
        lines.push(`TEL;TYPE=CELL:${data.mobile}`);
    }

    if (data.website) {
        lines.push(`URL:${data.website}`);
    }

    // Address
    if (data.address && (data.address.street || data.address.city || data.address.zip || data.address.country)) {
        const adr = `;;${data.address.street || ''};${data.address.city || ''};${data.address.zip || ''};${data.address.country || ''}`;
        lines.push(`ADR;TYPE=WORK:${adr}`);
    }

    // Social media
    if (data.socialMedia && data.socialMedia.length > 0) {
        data.socialMedia.forEach(url => {
            if (url) {
                lines.push(`URL:${url}`);
            }
        });
    }

    // Metadata
    lines.push(`REV:${new Date().toISOString()}`);
    lines.push('END:VCARD');

    return lines.join('\n');
};
