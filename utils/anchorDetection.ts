import { CITIES_PATTERN } from './cities';
import { getLandlineRegexPattern } from './landlinePrefixes';
import { getLegalFormsRegex } from './parserAnchors';

export type AnchorType = 'PLZ' | 'CITY' | 'AREA_CODE' | 'LEGAL_FORM' | 'EMAIL' | 'URL' | 'KEYWORD';

export interface AnchorMatch {
    type: AnchorType;
    value: string;
    startIndex: number;
    endIndex: number;
    confidence: number; // 0.0 to 1.0
}

/**
 * Detects 5-digit German Postal Codes (PLZ).
 * Validates that they are valid numbers (01000 - 99999).
 */
export const detectPLZ = (text: string): AnchorMatch[] => {
    const matches: AnchorMatch[] = [];
    // Start of string or non-digit boundary
    // 5 digits
    // End of string or non-digit boundary
    const regex = /(?:^|[^0-9])([0-9]{5})(?:$|[^0-9])/g;

    let match;
    while ((match = regex.exec(text)) !== null) {
        // match[1] is the PLZ
        // match.index is start of match (including boundary), we need to adjust
        const val = match[1];
        const offset = match[0].indexOf(val);
        const startIndex = match.index + offset;

        // Basic validation: German PLZ are 01000-99999
        // Wait, 00xxx exists? No, starts at 01. 
        // Actually Deutsche Post says 01001 to 99998.
        // Let's be slightly loose but not too loose.

        matches.push({
            type: 'PLZ',
            value: val,
            startIndex: startIndex,
            endIndex: startIndex + val.length,
            confidence: 0.95 // Very high confidence for 5 isolated digits
        });
    }
    return matches;
};

/**
 * Detects German Area Codes (Vorwahlen) using the exhaustive official list.
 */
export const detectAreaCodes = (text: string): AnchorMatch[] => {
    const matches: AnchorMatch[] = [];
    const pattern = getLandlineRegexPattern(); // This is a massive regex like (030|040|...)
    // We want to match it at start of a 'number-like' block.
    // E.g. "Tel: 030 12345" -> Match 030.
    // But "10305" (PLZ) should NOT match 030.
    // So we need a boundary check: (?:^|[^0-9])

    // NOTE: The generated regex starts with '(', ends with ')'.
    // We construct a new RegExp with flags
    const regex = new RegExp(`(?:^|[^0-9])(${pattern})(?=[0-9\\s-/])`, 'g');

    let match;
    while ((match = regex.exec(text)) !== null) {
        // match[1] is the captured group from the pattern (which is the actual code)
        // However, `pattern` itself has a capturing group `(...)`.
        // So match[1] might be the outer one? 
        // `getLandlineRegexPattern` returns `(030|...)`.
        // So `(${pattern})` becomes `((030|...))`.
        // match[1] = "030", match[2] = "030" (or undefined if internal group didn't fire?)
        // Let's just use match[0] and find the digits.

        // Actually, let's fix the regex to be safer.
        // We know the pattern is list of digits.
        const fullMatch = match[0];
        // Extract digits
        const digits = fullMatch.match(/\d+/);
        if (digits) {
            const val = digits[0];
            const startIndex = match.index + fullMatch.indexOf(val);
            matches.push({
                type: 'AREA_CODE',
                value: val,
                startIndex: startIndex,
                endIndex: startIndex + val.length,
                confidence: 0.9
            });
        }
    }
    return matches;
};

/**
 * Detects City Names using the provided extensive list.
 */
export const detectCities = (text: string): AnchorMatch[] => {
    const matches: AnchorMatch[] = [];
    // CITIES_PATTERN is (Berlin|Hamburg|...)
    const regex = new RegExp(`\\b${CITIES_PATTERN}\\b`, 'gi');

    let match;
    while ((match = regex.exec(text)) !== null) {
        matches.push({
            type: 'CITY',
            value: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            confidence: 0.85
        });
    }
    return matches;
};

/**
 * Detects Legal Forms (GmbH, AG, etc).
 */
export const detectLegalForms = (text: string): AnchorMatch[] => {
    const matches: AnchorMatch[] = [];
    const regex = getLegalFormsRegex(); // Returns RegExp object
    const globalRegex = new RegExp(regex.source, 'gi'); // Make sure it's global

    let match;
    while ((match = globalRegex.exec(text)) !== null) {
        // The regex might capture preceding spaces in group 1 or 0
        const rawVal = match[1] || match[0];
        const val = rawVal.trim();

        // Find where the trimmed value starts in the full match
        const offset = match[0].indexOf(val);
        const startIndex = match.index + offset;

        // Avoid empty matches or whitespace only
        if (!val) continue;

        matches.push({
            type: 'LEGAL_FORM',
            value: val,
            startIndex: startIndex,
            endIndex: startIndex + val.length,
            confidence: 0.95
        });
    }
    return matches;
};

/**
 * Detects Emails.
 */
export const detectEmails = (text: string): AnchorMatch[] => {
    const matches: AnchorMatch[] = [];
    const regex = /([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/gi;

    let match;
    while ((match = regex.exec(text)) !== null) {
        matches.push({
            type: 'EMAIL',
            value: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            confidence: 1.0
        });
    }
    return matches;
};

/**
 * Main function to detect all anchors in a text block.
 */
export const detectAnchors = (text: string): AnchorMatch[] => {
    const anchors: AnchorMatch[] = [
        ...detectPLZ(text),
        ...detectAreaCodes(text),
        ...detectCities(text),
        ...detectLegalForms(text),
        ...detectEmails(text)
    ];

    // Sort by position
    return anchors.sort((a, b) => a.startIndex - b.startIndex);
};
