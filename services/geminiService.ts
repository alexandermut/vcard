import { GoogleGenAI } from "@google/genai";
import { withExponentialBackoff } from "../utils/retryUtils";

export const correctVCardWithAI = async (input: string, apiKey?: string): Promise<string> => {
  // Use provided key, or fallback to env if available (dev mode)
  const key = apiKey || process.env.API_KEY;

  if (!key) {
    throw new Error("MISSING_KEY");
  }

  const ai = new GoogleGenAI({ apiKey: key });

  try {
    const prompt = `
      Du bist ein Experte für das vCard 3.0 Format (RFC 2426).
      Aufgabe: Analysiere den folgenden Text und wandle ihn in eine absolut valide vCard 3.0 Zeichenkette um.
      
      Regeln:
      1. Korrigiere Syntaxfehler.
      2. Ergänze fehlende Standardfelder (BEGIN:VCARD, VERSION:3.0, END:VCARD) falls nötig.
      3. Formatiere Telefonnummern möglichst international (+49...).
      4. Gib NUR den reinen vCard-Text zurück. Kein Markdown, keine Erklärungen, kein JSON.
      5. Wenn der Input kein Kontakt ist, versuche trotzdem, die Informationen als Notiz (NOTE) in einer vCard zu verpacken.
      
      Input Text:
      ${input}
    `;

    const response = await withExponentialBackoff(
      () => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
      }),
      3,
      1000,
      2,
      (error: any) => {
        const msg = error?.message?.toLowerCase() || '';
        return msg.includes('overloaded') || msg.includes('503') || msg.includes('429');
      }
    );

    let text = response.text || '';
    // Clean up potential markdown block artifacts
    text = text.replace(/```vcard/g, '').replace(/```/g, '').trim();
    return text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};