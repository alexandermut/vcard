import { describe, it, expect } from 'vitest';
import { syntheticEdgeCases } from '../data/syntheticEdgeCases';
import { parseImpressumToVCard } from './regexParser';
import { parseVCardString } from './vcardUtils';

interface SyntheticEdgeCase {
    id: string;
    text: string;
    expected: {
        fn?: string;
        org?: string;
        title?: string;
        tel?: string | Array<{ value: string; type: string }>;
        cell?: string;
        fax?: string;
        email?: string;
        url?: string;
        adr?: string | Array<{ city: string; zip: string; street: string; country?: string }>;
    };
}

describe('Synthetic Edge Cases', () => {
    syntheticEdgeCases.forEach((testCase: SyntheticEdgeCase) => {
        it(`should handle ${testCase.id} `, () => {
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
                if (Array.isArray(expected.tel)) {
                    expected.tel.forEach(exp => {
                        const found = (data.tel || []).some(t => t.value === exp.value);
                        if (!found) console.log(`DEBUG FAILURE ${testCase.id}: Expected tel ${exp.value} in`, data.tel);
                        expect(found).toBe(true);
                    });
                } else {
                    const found = (data.tel || []).some(t => t.value === expected.tel);
                    if (!found) console.log(`DEBUG FAILURE ${testCase.id}: Expected tel ${expected.tel} in`, data.tel);
                    expect(found).toBe(true);
                }
            }

            if (expected.cell) {
                expect((data.tel || []).some(t => t.value === expected.cell)).toBe(true);
            }
            if (expected.fax) {
                expect((data.tel || []).some(t => t.value === expected.fax)).toBe(true);
            }
            if (expected.email) {
                expect((data.email || []).some(e => e.value === expected.email)).toBe(true);
            }
            if (expected.url) {
                expect((data.url || []).some(u => u.value.includes(expected.url!))).toBe(true);
            }

            if (expected.adr) {
                if (Array.isArray(expected.adr)) {
                    expected.adr.forEach(exp => {
                        const found = (data.adr || []).some(a =>
                            a.value.city === exp.city &&
                            a.value.zip === exp.zip &&
                            (exp.street ? a.value.street === exp.street : true)
                        );
                        if (!found) console.log(`DEBUG FAILURE ${testCase.id}: Expected adr ${JSON.stringify(exp)} in`, data.adr);
                        expect(found).toBe(true);
                    });
                } else {
                    const expectedParts = expected.adr.split(',').map(p => p.trim());
                    const found = (data.adr || []).some(a => {
                        const val = Object.values(a.value).join(' ');
                        return expectedParts.every(part => {
                            const tokens = part.split(/\s+/);
                            return tokens.every(t => val.includes(t));
                        });
                    });
                    expect(found).toBe(true);
                }
            }
        });
    });
});
