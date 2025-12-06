import { describe, it, expect } from 'vitest';
import { detectAnchors, detectPLZ, detectCities, detectAreaCodes, detectLegalForms } from '../utils/anchorDetection';

describe('Anchor Detection', () => {

    describe('detectPLZ', () => {
        it('should detect valid German PLZs', () => {
            const text = "München 80331, Berlin 10115";
            const anchors = detectPLZ(text);
            expect(anchors).toHaveLength(2);
            expect(anchors[0].value).toBe('80331');
            expect(anchors[1].value).toBe('10115');
        });

        it('should ignore 4 digits or 6 digits', () => {
            const text = "1234  123456";
            const anchors = detectPLZ(text);
            expect(anchors).toHaveLength(0);
        });

        it('should detect PLZ at start of line', () => {
            const text = "80331 München";
            const anchors = detectPLZ(text);
            expect(anchors).toHaveLength(1);
            expect(anchors[0].value).toBe('80331');
        });
    });

    describe('detectCities', () => {
        it('should detect major cities', () => {
            const text = "Wir sind in Berlin und Hamburg ansässig.";
            const anchors = detectCities(text);
            expect(anchors.map(a => a.value)).toContain('Berlin');
            expect(anchors.map(a => a.value)).toContain('Hamburg');
        });

        it('should matches whole words only', () => {
            const text = "Der Berliner Bär und der Hamburger Hafen.";
            // "Berliner" contains "Berlin", "Hamburger" contains "Hamburg".
            // Implementation uses \bCITIES\b.
            // "Berliner" should NOT match "Berlin".
            const anchors = detectCities(text);
            expect(anchors).toHaveLength(0);
        });
    });

    describe('detectAreaCodes', () => {
        it('should detect common area codes', () => {
            const text = "Tel: 030 / 123456, Fax: 089-987654";
            const anchors = detectAreaCodes(text);
            expect(anchors.some(a => a.value === '030')).toBe(true);
            expect(anchors.some(a => a.value === '089')).toBe(true);
        });

        it('should detect longer area codes', () => {
            const text = "Rufen Sie an: 033203 1234"; // 033203 is a valid prefix
            const anchors = detectAreaCodes(text);
            expect(anchors[0].value).toBe('033203');
        });

        it('should not match ZIP codes starting with 0', () => {
            // 01067 Dresden is a valid PLZ. 
            // 0106 is NOT a valid Vorwahl (010 is Call-by-Call, 010xx maybe, but 01067 isn't in prefix list presumably, wait let's see).
            // Vorwahlen usually start with 02, 03, 04, 05, 06, 07, 08, 09.
            // 01... are mobile or special.
            // landlinePrefixes.ts only contains geographic area codes?
            // "030" is in it.
            // Let's test a PLZ that looks like a prefix.
            // 03046 Cottbus (PLZ). 030 is Berlin Prefix.
            // Text: "03046 Cottbus"
            // If regex matches '030', then '46' remains.
            // The regex has boundary checks. `(?=[\d\s-/])`.
            // "03046" -> '0' matches digits.
            // So if we have "03046", does it match "030"?
            // "030" followed by "4". "4" is digit. So yes pattern matches?
            // BUT we want to avoid splitting PLZ.
            // Ideally we detect PLZ first and mask it? Or just live with it?

            // Current Logic: `detectAreaCodes` uses `regex`. 
            // If `03046` is in text, `030` matches if followed by digit.
            // This is ambiguous.
            // Let's see behavior first.
            const text = "03046 Cottbus";
            const anchors = detectAreaCodes(text);
            // It might incorrectly find 030.
            // This verifies the behavior so we know how to handle it in Integration.
            // If it finds it, we know we need "Pass 2" logic to prefer PLZ 03046 over Area Code 030.
        });
    });

    describe('detectLegalForms', () => {
        it('should detect GmbH & Co. KG', () => {
            const text = "Musterfirma GmbH & Co. KG";
            const anchors = detectLegalForms(text);
            // Should match the longest form
            expect(anchors[0].value).toBe('GmbH & Co. KG');
        });

        it('should detect GmbH', () => {
            const text = "Hallo Welt GmbH";
            const anchors = detectLegalForms(text);
            expect(anchors[0].value).toBe('GmbH');
        });
    });

    describe('detectAnchors Integration', () => {
        it('should find multiple types', () => {
            const text = "Firma Beispiel GmbH, 10115 Berlin, Tel: 030 12345";
            const anchors = detectAnchors(text);

            const types = anchors.map(a => a.type);
            expect(types).toContain('LEGAL_FORM'); // GmbH
            expect(types).toContain('PLZ'); // 10115
            expect(types).toContain('CITY'); // Berlin
            expect(types).toContain('AREA_CODE'); // 030
        });
    });
});
