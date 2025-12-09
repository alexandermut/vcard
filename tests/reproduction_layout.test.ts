import { describe, it, expect } from 'vitest';
import { parseImpressumToVCard } from '../utils/regexParser';
import { parseVCardString } from '../utils/vcardUtils';

describe('Layout Issues Reproduction', () => {
    it('Should handle multi-column layout (Address + Phone on same line)', () => {
        const input = `
Christel A. Holster . -

Tannenhof 76 d               Tel.: (040)608 47 828
D-22397 Hamburg     Handy: 0172/5169062
E-Mail: Christel.Holster@gmx.de
        `;

        const vcard = parseImpressumToVCard(input);
        const parsed = parseVCardString(vcard).data;

        // Check Phone Types
        const phones = parsed.tel || [];
        const landline = phones.find(p => p.value.includes('4060847828')); // Normalized
        const mobile = phones.find(p => p.value.includes('1725169062')); // Normalized

        expect(landline).toBeDefined();
        // Tel. -> Should be WORK or VOICE (Default) or TEL if inferred from Landline List
        // 040 is Hamburg (Landline).
        // Parser logic favors CELL if prefix matches mobile, else ...
        // Let's check what it actually returns. likely WORK,VOICE or TEL if confident.
        // It definitely shouldn't be CELL.
        expect(landline?.type).not.toContain('CELL');

        expect(mobile).toBeDefined();
        expect(mobile?.type).toBe('CELL'); // 0172 is mobile prefix + "Handy" label -> Double confirmation

        // Check Email
        expect(parsed.email?.[0]?.value).toBe('Christel.Holster@gmx.de');

        // Check Address (Should be clean, no phone overlap)
        // Before fix: "Tannenhof 76 d Tel.: (040)608 47 828"
        // After fix: "Tannenhof 76 d"
        const street = parsed.adr?.[0]?.value.street;
        expect(street).toContain('Tannenhof 76 d');
        expect(street).not.toContain('Tel');

        expect(parsed.adr?.[0]?.value.zip).toBe('22397');
        expect(parsed.adr?.[0]?.value.city).toBe('Hamburg');

        // Check Name Cleanup (Strip trailing . -)
        // Input: "Christel A. Holster . -"
        // Expected: "Christel A. Holster"
        expect(parsed.fn).toBe('Christel A. Holster');
    });
});
