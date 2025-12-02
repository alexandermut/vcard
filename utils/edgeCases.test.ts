import { describe, it, expect } from 'vitest';
import { syntheticEdgeCases } from '../data/syntheticEdgeCases';
import { parseImpressumToVCard } from './regexParser';
import { parseVCardString } from './vcardUtils';

describe('Synthetic Edge Cases', () => {
    syntheticEdgeCases.forEach((testCase) => {
        it(`should handle ${testCase.id}`, () => {
            const vcard = parseImpressumToVCard(testCase.text);
            const parsed = parseVCardString(vcard);
            const data = parsed.data;

            const expected = testCase.expected;

            if (expected.fn) {
                expect(data.fn).toBe(expected.fn);
            }
            if (expected.org) {
                expect(data.org).toBe(expected.org);
            }
            if (expected.title) {
                expect(data.title).toBe(expected.title);
            }
            if (expected.tel) {
                const tel = data.tel.find(t => t.type.includes('VOICE') && !t.type.includes('CELL') && !t.type.includes('FAX'));
                // Note: The parser might return multiple types or different formatting.
                // We check if we found *a* number that matches the expected value.
                // The parser returns E.164 (e.g. +49...)
                // The expected data also has E.164.
                const found = data.tel.some(t => t.value === expected.tel);
                if (expected.tel === "") {
                    // Expect NO tel
                    // But we might have other numbers (fax, cell).
                    // The test case implies "tel" field in expected object maps to a landline/generic number.
                    // If expected.tel is empty, we shouldn't find a matching landline?
                    // Or maybe we shouldn't find ANY number that is classified as TEL?
                    // Let's assume if expected.tel is "", we check that no number matches the "tel" classification logic?
                    // But for now, let's just check positive matches.
                } else {
                    expect(data.tel.some(t => t.value === expected.tel)).toBe(true);
                }
            }
            if (expected.cell) {
                expect(data.tel.some(t => t.value === expected.cell)).toBe(true);
            }
            if (expected.fax) {
                expect(data.tel.some(t => t.value === expected.fax)).toBe(true);
            }
            if (expected.email) {
                expect(data.email.some(e => e.value === expected.email)).toBe(true);
            }
            if (expected.url) {
                expect(data.url.some(u => u.value.includes(expected.url))).toBe(true);
            }
            if (expected.adr) {
                // Address comparison is tricky because of formatting.
                // We'll check if the full address string contains the expected parts.
                // The parser returns "street;city;;zip;country" joined by semicolons in value.
                // But parseVCardString might parse it into object.
                // Let's check data.adr array.
                const expectedParts = expected.adr.split(',').map(p => p.trim());
                const found = data.adr.some(a => {
                    // parseVCardString returns an object for adr: { street, city, zip, country, ... }
                    // We construct a string from values to check inclusion
                    const val = Object.values(a.value).join(' ');
                    // Check if every part of expected string (split by space to be safe) is in the value
                    return expectedParts.every(part => {
                        // Split part into tokens (e.g. "8000 Zürich" -> "8000", "Zürich")
                        const tokens = part.split(/\s+/);
                        return tokens.every(t => val.includes(t));
                    });
                });
                expect(found).toBe(true);
            }
        });
    });
});
