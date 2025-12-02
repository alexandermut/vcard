import { describe, it, expect } from 'vitest';
import { parseImpressumToVCard } from '../utils/regexParser';

describe('PLZ vs Phone Regression', () => {
    it('should recognize PLZ and City as Address, not Phone', () => {
        const input = `
            Max Mustermann
            Musterstraße 1
            10115 Berlin
        `;
        const vcard = parseImpressumToVCard(input);

        // Should contain Address
        expect(vcard).toContain('ADR;CHARSET=utf-8;TYPE=WORK:;;Musterstraße 1;Berlin;;10115;Deutschland');

        // Should NOT contain Phone "10115"
        expect(vcard).not.toContain('TEL;CHARSET=utf-8;TYPE=WORK,VOICE:10115');
        expect(vcard).not.toContain('TEL;CHARSET=utf-8;TYPE=WORK,VOICE:+4910115');
    });

    it('should recognize PLZ even if it looks like a phone number prefix', () => {
        // 04109 is Leipzig PLZ, but 04109 is also a valid area code prefix start? 
        // Actually 041 is Leipzig area code.
        const input = `
            Firma GmbH
            Hauptstr. 10
            04109 Leipzig
        `;
        const vcard = parseImpressumToVCard(input);

        expect(vcard).toContain('ADR;CHARSET=utf-8;TYPE=WORK:;;Hauptstr. 10;Leipzig;;04109;Deutschland');
        expect(vcard).not.toContain('TEL;CHARSET=utf-8;TYPE=WORK,VOICE:04109');
    });
});
