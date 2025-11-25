import { GoogleGenAI } from "@google/genai";
import { AIProvider, Language } from "../types";
import { scanCardWithCustomLLM, chatWithCustomLLM } from "./customLlmService";
import type { LLMConfig } from "../hooks/useLLMConfig";

// Helper to generate dynamic prompts based on language and context
const getSystemPrompt = (lang: Language, mode: 'text' | 'vision' | 'hybrid', isUpdate = false): string => {
  const isGerman = lang === 'de';

  const ROLE_DEFINITION = `
    ROLE: You are an elite Data Extraction Engine specialized in vCard 3.0 (RFC 2426) creation.
    YOUR GOAL: Extract contact information from unstructured text/images with 100% precision and format it into a valid vCard string.
  `;

  const INPUT_HANDLING = mode === 'hybrid' ? `
    INPUT PROCESSING RULES (HYBRID MODE):
    1. **CARD EXTRACTION**: Extract all structured data (Name, Phone, Email, etc.) from the Business Card.
    2. **NOTE EXTRACTION**: EVERYTHING else (handwritten text, printed text around the card) is VALUABLE CONTEXT.
       - **DO NOT IGNORE** text outside the card.
       - **DO NOT** treat handwritten notes as noise.
       - Transcribe handwritten notes exactly and put them into the 'NOTE' field.
       - If the text says "Meeting on...", "Interested in...", etc., capture it!
    3. **ENTITY RECOGNITION**:
       - Identify the PRIMARY contact person. If multiple people listed, prioritize the one that looks like the sender or card owner.
       - If NO person is found, create a corporate vCard (ORG only).
  ` : `
    INPUT PROCESSING RULES:
    1. **NOISE REMOVAL**: Aggressively IGNORE and DISCARD:
       - Legal disclaimers ("Confidentiality...", "Diese Nachricht ist...").
       - "Sent from my iPhone/Android".
       - GDPR/Datenschutz hints.
       - Print warnings ("Please consider the environment...").
       - Generic navigation text ("Home", "About Us", "Login").
    2. **ENTITY RECOGNITION**:
       - Identify the PRIMARY contact person. If multiple people listed, prioritize the one that looks like the sender or card owner.
       - If NO person is found, create a corporate vCard (ORG only).
  `;

  const UPDATE_INSTRUCTIONS = `
    **UPDATE MODE ACTIVE**:
    - The input contains an EXISTING vCard and INSTRUCTIONS.
    - **TASK**: Apply the instructions to the vCard.
    - **PRESERVE**: Do NOT remove existing data unless explicitly told to delete/change it.
    - **MERGE**: Add new data fields intelligently.
    - Example Instruction: "Add LinkedIn url..." -> Add URL;TYPE=LINKEDIN:...
  `;

  const FIELD_RULES = `
    STRICT FIELD MAPPING RULES:
    
    1. **N (Name - Structured)**: 
       - Format: FamilyName;GivenName;MiddleName;Prefix;Suffix
       - Logic: "Prof. Dr. Max Peter Mustermann MBA" -> "Mustermann;Max;Peter;Prof. Dr.;MBA"
       - Handle reverse names ("Mustermann, Max") correctly.
    
    2. **FN (Full Name - Display)**:
       - Format: "Prefix Given Family Suffix" (clean readable string).
    
    3. **ORG (Organization)**:
       - Format: Company Name;Department;Division
       - Example: "Siemens AG, HR Dept." -> "ORG:Siemens AG;HR Dept."
       - If legal form is present (GmbH, Inc.), keep it part of the company name.
    
    4. **ADR (Address)**:
       - Format: ;;Street Number;City;Region;Zip;Country
       - **CRITICAL**: Split Street and Number! "Musterstr. 12" -> ";;Musterstr. 12;..."
       - **INFERENCE**: 
         - If ZIP is 5 digits and language is German -> Country = "Deutschland".
         - If "A-" prefix -> Country = "Österreich".
         - If "CH-" prefix -> Country = "Schweiz".
    
    5. **TEL (Telephones)**:
       - MUST be E.164 format (e.g., +49 30 123456).
       - Map Labels intelligently:
         - "Mobil", "Cell", "Handy" -> TYPE=CELL
         - "Tel", "Phone", "Büro", "Office", "Zentrale" -> TYPE=WORK
         - "Fax" -> TYPE=FAX
         - "Privat", "Home" -> TYPE=HOME
    
    6. **EMAIL & URL**:
       - Extract all valid emails. Map personal emails to HOME, corporate to WORK if distinguishable.
       - Extract all URLs.
       - **SOCIAL MEDIA**: Detect profile links (LinkedIn, Xing, Twitter) and use: URL;TYPE=LINKEDIN:...
    
    7. **NOTE (Context)**:
       - Put useful info that doesn't fit elsewhere (e.g. opening hours, tax ID) here.
       - Do NOT put legal disclaimers here.

    8. **PHOTO / LOGO**:
       - **DO NOT** embed Base64 image data. It makes the vCard too large.
       - ONLY include PHOTO/LOGO if you can find a valid public URL (e.g. from LinkedIn profile link).
  `;

  const OUTPUT_FORMAT = `
    OUTPUT REQUIREMENTS:
    - Return ONLY the raw vCard string.
    - NO Markdown blocks (no \`\`\`vcard).
    - NO Intro/Outro text.
    - START with 'BEGIN:VCARD'
    - END with 'END:VCARD'
    - FORCE 'VERSION:3.0'
    - FORCE 'REV:${new Date().toISOString()}'
  `;

  const MODE_SPECIFIC = mode === 'vision'
    ? "TASK: OCR & Extraction. The input is an image. Look for logos, small print, and layout cues to distinguish Company from Name."
    : mode === 'hybrid'
      ? "TASK: HYBRID EXTRACTION (Card + Notes). The input contains a Business Card AND Handwritten/Printed Notes. PRIORITY: Capture the contact details AND the context from the surrounding text."
      : "TASK: Text Extraction. The input is raw text (e.g. email signature, website footer). Parse it robustly.";

  return `
    ${ROLE_DEFINITION}
    ${MODE_SPECIFIC}
    ${isUpdate ? UPDATE_INSTRUCTIONS : INPUT_HANDLING}
    ${FIELD_RULES}
    ${OUTPUT_FORMAT}
    
    LANGUAGE CONTEXT: ${isGerman ? 'GERMAN (DACH Region focus)' : 'ENGLISH (International focus)'}
  `;
};

export const correctVCard = async (input: string, provider: AIProvider, apiKey: string, lang: Language, llmConfig?: LLMConfig): Promise<string> => {
  // Route to OpenAI if selected
  if (llmConfig?.provider === 'openai') {
    return callOpenAI(input, llmConfig.openaiApiKey, 'text', lang, llmConfig.openaiModel || 'gpt-5.1');
  }

  // Route to Custom LLM if selected
  if (llmConfig?.provider === 'custom') {
    // Reuse custom logic but pass text input
    // Note: scanCardWithCustomLLM is designed for images, we might need a text variant or adapt it.
    // For now, let's assume custom LLM is primarily for vision or we use callGemini as fallback if not implemented.
    // Actually, the current custom implementation is vision-focused.
    // Let's stick to Gemini for text if custom is selected but not implemented for text, OR throw error.
    // Ideally we should implement text support for custom LLM too, but for this task we focus on OpenAI.
  }

  if (!apiKey) throw new Error("MISSING_KEY");

  // Check if this is an update request
  const isUpdate = input.startsWith('VCARD_UPDATE_REQUEST|');
  let contentToSend = input;

  if (isUpdate) {
    const parts = input.split('|');
    if (parts.length >= 3) {
      const currentVCard = parts[1];
      const instructions = parts.slice(2).join('|');
      contentToSend = `EXISTING VCARD:\n${currentVCard}\n\nUSER INSTRUCTIONS:\n${instructions}`;
    }
  }

  return callGeminiWithRetry(contentToSend, apiKey, 'text', lang, 0, isUpdate);
};

export interface ImageInput {
  base64: string;
  mimeType: string;
}

export const scanBusinessCard = async (
  images: ImageInput[],
  provider: AIProvider,
  apiKey: string,
  lang: Language,
  llmConfig?: LLMConfig,
  mode: 'vision' | 'hybrid' = 'vision'
): Promise<string> => {
  // Route to OpenAI if selected
  if (llmConfig && llmConfig.provider === 'openai') {
    return callOpenAI(images, llmConfig.openaiApiKey, mode, lang, llmConfig.openaiModel || 'gpt-5.1');
  }

  // Route to custom LLM if configured
  if (llmConfig && llmConfig.provider === 'custom') {
    return scanCardWithCustomLLM(images, {
      baseUrl: llmConfig.customBaseUrl,
      apiKey: llmConfig.customApiKey,
      model: llmConfig.customModel,
    }, lang);
  }

  // Default to Google Gemini
  if (!apiKey) throw new Error("MISSING_KEY");
  if (images.length === 0) throw new Error("NO_IMAGES");
  return callGeminiWithRetry(images, apiKey, mode, lang);
};

// --- OPENAI INTEGRATION ---

const callOpenAI = async (
  input: string | ImageInput[],
  apiKey: string,
  mode: 'text' | 'vision' | 'hybrid',
  lang: Language,
  model: string = 'gpt-5.1',
  retryCount = 0
): Promise<string> => {
  if (!apiKey) throw new Error("MISSING_KEY");

  const systemPrompt = getSystemPrompt(lang, mode);

  let messages: any[] = [
    { role: "system", content: systemPrompt }
  ];

  if (mode === 'text') {
    messages.push({ role: "user", content: input as string });
  } else {
    const content: any[] = [{ type: "text", text: "Extract vCard from this image:" }];
    (input as ImageInput[]).forEach(img => {
      content.push({
        type: "image_url",
        image_url: {
          url: `data:${img.mimeType};base64,${img.base64}`
        }
      });
    });
    messages.push({ role: "user", content });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.1,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "OpenAI API Error");
    }

    const data = await response.json();
    let result = cleanResponse(data.choices[0]?.message?.content || "");

    // Self-Correction
    const isValid = result.includes('BEGIN:VCARD') && result.includes('END:VCARD');
    if (!isValid && retryCount < 1) {
      console.warn("OpenAI produced invalid vCard. Retrying...");
      // Simple retry logic
      return callOpenAI(input, apiKey, mode, lang, model, retryCount + 1);
    }

    return result;

  } catch (error) {
    console.error("OpenAI Error:", error);
    throw error;
  }
};

// --- INTERNAL LOGIC ---

const callGeminiWithRetry = async (
  input: string | ImageInput[],
  apiKey: string,
  mode: 'text' | 'vision' | 'hybrid',
  lang: Language,
  retryCount = 0,
  isUpdate = false
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey });

  // Use gemini-3-pro-preview for best reasoning and extraction quality
  const modelName = 'gemini-3-pro-preview';

  const systemPrompt = getSystemPrompt(lang, mode, isUpdate);

  let promptConfig: any;

  if (mode === 'text') {
    promptConfig = {
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\n--- BEGIN INPUT DATA ---\n${input as string}\n--- END INPUT DATA ---` }] }
      ],
      generationConfig: {
        temperature: 0.1, // Very low temperature for factual extraction
        maxOutputTokens: 8192, // Increased for Pro model
      }
    };
  } else {
    const parts: any[] = [{ text: systemPrompt }];
    (input as ImageInput[]).forEach(img => {
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.base64
        }
      });
    });
    promptConfig = {
      contents: [
        { role: 'user', parts: parts }
      ],
      generationConfig: {
        temperature: 0.1,
      }
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      ...promptConfig
    });

    let result = cleanResponse(response.text || '');

    // --- SELF-CORRECTION LOOP ---
    const isValid = result.includes('BEGIN:VCARD') && result.includes('END:VCARD');

    if (!isValid && retryCount < 1) {
      console.warn("AI produced invalid vCard. Attempting self-correction...", result);
      const fixPrompt = `
        SYSTEM ALERT: Your previous output was REJECTED.
        Reason: Missing 'BEGIN:VCARD' or 'END:VCARD' or invalid format.
        
        STRICT INSTRUCTION: Return ONLY the valid vCard 3.0 string.
        
        Previous Bad Output:
        ${result}
      `;

      // Recursive retry with simple text prompt
      return callGeminiWithRetry(fixPrompt, apiKey, 'text', lang, retryCount + 1);
    }

    return result;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

const cleanResponse = (text: string): string => {
  let cleaned = text
    .replace(/```vcard/gi, '')
    .replace(/```/g, '')
    .trim();

  if (cleaned.toLowerCase().startsWith('vcard:')) {
    cleaned = cleaned.substring(6).trim();
  }

  return cleaned;
};

export const generateContent = async (
  apiKey: string,
  prompt: string,
  image?: ImageInput,
  llmConfig?: LLMConfig
): Promise<string> => {
  // Route to OpenAI
  if (llmConfig?.provider === 'openai') {
    return callOpenAI(prompt, llmConfig.openaiApiKey, 'text', 'en', llmConfig.openaiModel || 'gpt-5.1');
  }

  // Route to Custom LLM
  if (llmConfig?.provider === 'custom') {
    return chatWithCustomLLM(prompt, {
      baseUrl: llmConfig.customBaseUrl,
      apiKey: llmConfig.customApiKey,
      model: llmConfig.customModel,
    });
  }

  // Default to Gemini
  if (!apiKey) throw new Error("MISSING_KEY");

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    return response.text || '';
  } catch (e) {
    console.error("Gemini Chat Error:", e);
    throw e;
  }
};