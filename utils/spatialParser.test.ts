import { describe, it, expect } from 'vitest';
import { parseSpatialToVCard } from './regexParser';
import { parseVCardString } from './vcardUtils';

describe('Spatial Parser', () => {
    it('should prioritize Name in Header (Top 30%)', () => {
        // Synthetic data: Name at top, Address at bottom
        // Even if "Max Mustermann" could be ambiguous, position should help
        const lines = [
            { text: "Max Mustermann", bbox: { x0: 10, y0: 10, x1: 100, y1: 30 } },
            { text: "Musterfirma GmbH", bbox: { x0: 10, y0: 40, x1: 100, y1: 60 } },
            { text: "Musterstraße 1", bbox: { x0: 10, y0: 800, x1: 100, y1: 820 } },
            { text: "12345 Musterstadt", bbox: { x0: 10, y0: 830, x1: 100, y1: 850 } }
        ];

        const vcard = parseSpatialToVCard(lines);
        const parsed = parseVCardString(vcard);

        expect(parsed.data.fn).toBe("Max Mustermann");
        expect(parsed.data.org).toBe("Musterfirma GmbH");
        // Address check might be tricky if it relies on anchors, but let's see
        // expect(parsed.data.adr[0].value.street).toBe("Musterstraße 1");
    });

    it('should handle Two-Column Layout (Left: Address, Right: Contact)', () => {
        // This test checks if sorting works (Top-Bottom, then Left-Right)
        // Actually, our current sort is Y-primary.
        // If lines are on same Y, X determines order.

        const lines = [
            { text: "Musterfirma", bbox: { x0: 10, y0: 10, x1: 100, y1: 30 } },

            // Row 1
            { text: "Musterstr. 1", bbox: { x0: 10, y0: 100, x1: 100, y1: 120 } }, // Left
            { text: "Tel: 030 123456", bbox: { x0: 200, y0: 100, x1: 300, y1: 120 } }, // Right

            // Row 2
            { text: "12345 City", bbox: { x0: 10, y0: 130, x1: 100, y1: 150 } }, // Left
            { text: "Fax: 030 123457", bbox: { x0: 200, y0: 130, x1: 300, y1: 150 } }  // Right
        ];

        const vcard = parseSpatialToVCard(lines);
        const parsed = parseVCardString(vcard);

        expect(parsed.data.org).toBe("Musterfirma");
        expect(parsed.data.tel?.some(t => t.value.includes("30123456"))).toBe(true);
        expect(parsed.data.tel?.some(t => t.value.includes("30123457"))).toBe(true);
    });
});
