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

const safeString = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    if (typeof val === 'object') {
        // Try to find a likely value property
        return val.value || val.number || val.text || JSON.stringify(val);
    }
    return String(val);
};

const convertToVCard = (data: ContactData): string => {
    const lines: string[] = ['BEGIN:VCARD', 'VERSION:3.0'];

    // Generate FN and N
    const firstName = safeString(data.firstName);
    const lastName = safeString(data.lastName);
    const company = safeString(data.company);

    const fullName = [firstName, lastName].filter(Boolean).join(' ') || company || 'Unknown';
    lines.push(`FN:${fullName}`);

    if (firstName || lastName) {
        const n = `${lastName};${firstName};;;`;
        lines.push(`N:${n}`);
    }

    // Company and role
    if (company) {
        lines.push(`ORG:${company}`);
    }

    const role = safeString(data.role);
    if (role) {
        lines.push(`TITLE:${role}`);
    }

    // Contact info
    const email = safeString(data.email);
    if (email) {
        lines.push(`EMAIL;TYPE=WORK:${email}`);
    }

    const phone = safeString(data.phone);
    if (phone) {
        lines.push(`TEL;TYPE=WORK:${phone}`);
    }

    const mobile = safeString(data.mobile);
    if (mobile) {
        lines.push(`TEL;TYPE=CELL:${mobile}`);
    }

    const website = safeString(data.website);
    if (website) {
        lines.push(`URL:${website}`);
    }

    // Address
    if (data.address) {
        const street = safeString(data.address.street);
        const city = safeString(data.address.city);
        const zip = safeString(data.address.zip);
        const country = safeString(data.address.country);

        if (street || city || zip || country) {
            const adr = `;;${street};${city};${zip};${country}`;
            lines.push(`ADR;TYPE=WORK:${adr}`);
        }
    }

    // Social media
    if (data.socialMedia && Array.isArray(data.socialMedia)) {
        data.socialMedia.forEach(url => {
            const u = safeString(url);
            if (u) {
                lines.push(`URL:${u}`);
            }
        });
    }

    // Metadata
    lines.push(`REV:${new Date().toISOString()}`);
    lines.push('END:VCARD');

    return lines.join('\n');
};

export const chatWithCustomLLM = async (
    prompt: string,
    config: CustomLLMConfig
): Promise<string> => {
    if (!config.baseUrl) throw new Error('Custom LLM Base URL is required');

    const messages = [
        {
            role: 'system',
            content: 'You are a helpful assistant for a vCard contact database. Keep answers concise.',
        },
        {
            role: 'user',
            content: prompt,
        },
    ];

    const requestBody = {
        model: config.model,
        messages,
        temperature: 0.7,
    };

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (config.apiKey && config.apiKey.trim() !== '') {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    // Smart URL construction
    let url = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash

    // If it looks like a root URL (no /v1), append /v1/chat/completions
    // Otherwise assume it's already a full base path like .../v1
    if (!url.endsWith('/v1') && !url.endsWith('/chat/completions')) {
        // Heuristic: If it's localhost:11434, it's likely Ollama root
        if (url.includes(':11434')) {
            url += '/v1/chat/completions';
        } else {
            // Default OpenAI style: append /chat/completions
            url += '/chat/completions';
        }
    } else if (url.endsWith('/v1')) {
        url += '/chat/completions';
    }

    console.log('[CustomLLM] Calling URL:', url);

    try {
        const response = await fetch(url, {
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

        return content;
    } catch (error: any) {
        console.error('Custom LLM Chat Error:', error);
        throw new Error(`Custom LLM failed: ${error.message}`);
    }
};
