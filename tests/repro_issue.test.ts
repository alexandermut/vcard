import { describe, it, expect } from 'vitest';
import { parseImpressumToVCard } from '../utils/regexParser';
import { parseVCardString } from '../utils/vcardUtils';

describe('Parser Issue Reproduction', () => {
    it('should not include stray numbers in Organization name', () => {
        // Simulating the OCR error where "9" is on the same line
        const text = `SPEYERER VERANSTALTUNGS- UND MESSE GMBH 9`;
        const vcard = parseImpressumToVCard(text);
        const parsed = parseVCardString(vcard);
        const data = parsed.data;

        console.log('Parsed Data:', data);

        expect(data.org).toBe('SPEYERER VERANSTALTUNGS- UND MESSE GMBH');
        expect(data.org).not.toContain('9');
    });
});
