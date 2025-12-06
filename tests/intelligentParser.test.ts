import { describe, it, expect } from 'vitest';
import { parseImpressumToVCard } from '../utils/regexParser';

describe('Intelligent Parser Features', () => {

    it('should confirm Landline type using Area Code anchor even without Address', () => {
        // "030" is Berlin. 
        // No address provided.
        // Old logic would fallback to WORK,VOICE (unconfirmed).
        const text = `
            Ingenieurbüro Test
            Tel: 030 12345678
            Max Mustermann
        `;

        const vcard = parseImpressumToVCard(text);

        // E.164 conversion (+4930...) is expected.
        // We mainly care about TYPE=TEL (High confidence)
        expect(vcard).toContain('TYPE=TEL:+493012345678');
        expect(vcard).not.toContain('TYPE=WORK,VOICE');
    });

    it('should detect Address via Fallback when Regex fails', () => {
        // "PLZ: 10115" breaks standard "10115 Berlin" regex which expects digit-space-word.
        // But Anchors detect "10115" and "Berlin" anywhere in line.
        const text = `
            Musterfirma
            Musterstraße 1, PLZ: 10115, Stadt: Berlin
        `;

        const vcard = parseImpressumToVCard(text);

        // Should find address (even if Street extraction includes "PLZ:" it proves it found the line)
        expect(vcard).toContain('10115');
        expect(vcard).toContain('Berlin');
        expect(vcard).toContain('ADR;CHARSET=utf-8');
    });

    it('should detect Company via Legal Form Anchor (Implicit Check)', () => {
        // If consumption works, it captures the full name including legal form
        const text = `
            Super Enterprise GmbH & Co. KG
            Musterstraße 1
            10115 Berlin
        `;
        const vcard = parseImpressumToVCard(text);
        expect(vcard).toContain('ORG;CHARSET=utf-8:Super Enterprise GmbH & Co. KG');
    });

});
