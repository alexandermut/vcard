/**
 * Adds raw OCR text as a NOTE field to vCard for user review
 */
export function addOCRTextToVCard(vcard: string, rawOcrText: string): string {
    const lines = vcard.split('\n');
    const endIndex = lines.findIndex(line => line === 'END:VCARD');

    if (endIndex === -1) return vcard;

    // Format: Escape line breaks, limit length
    const cleanText = rawOcrText
        .replace(/\r\n|\r|\n/g, '\\n')
        .substring(0, 500); // Limit to 500 chars

    const noteField = `NOTE;CHARSET=utf-8:OCR Rohtext:\\n${cleanText}`;

    // Insert before END:VCARD
    lines.splice(endIndex, 0, noteField);

    return lines.join('\n');
}
