import { describe, it, expect } from 'vitest';
import { parseImpressumToVCard } from '../utils/regexParser';
import { parseVCardString } from '../utils/vcardUtils';

describe('Edge Case Test - generated_edge_case_1765051582775', () => {
    it('should parse anonymized contact correctly', () => {
        const text = `Anon Ymous  Anon Ymous
Example Corp
Anon Ymous 8

D-22335 Anon Ymous

nn.

Meine vCard

John Doe

Anon Ymous Anon Ymous
Anon Ymous Anon Ymous

Tel.: +49 123 456789
E-Mail: test@example.com

`;

        const vcard = parseImpressumToVCard(text);
        const parsed = parseVCardString(vcard);
        const data = parsed.data;

        console.log('--- PARSED DATA ---');
        console.log('FN:', data.fn);
        console.log('N:', data.n);
        console.log('ORG:', data.org);
        console.log('TITLE:', data.title);
        console.log('TEL:', data.tel);
        console.log('EMAIL:', data.email);
        console.log('ADR:', data.adr);
        console.log('--- END ---');

        // What we ACTUALLY expect from this anonymized text:
        expect(data.fn).toBe('John Doe');
        expect(data.org).toBe('Example Corp');
        expect(data.tel?.some(t => t.value === '+49123456789')).toBe(true);
        expect(data.email?.some(e => e.value === 'test@example.com')).toBe(true);

        // Address should be extracted (D-22335 format)
        expect(data.adr).toBeDefined();
        expect(data.adr?.length).toBeGreaterThan(0);
        if (data.adr && data.adr.length > 0) {
            expect(data.adr[0].value.zip).toBe('22335');
        }
    });
});
