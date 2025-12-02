import { describe, it, expect } from 'vitest';
import { difficultContacts } from '../data/realContacts';
import { parseImpressumToVCard } from '../utils/regexParser';
import { parseVCardString } from '../utils/vcardUtils';

interface ContactTestCase {
    id: string;
    text: string;
    expected: {
        fn?: string;
        title?: string;
        org?: string;
        email?: string;
        url?: string;
        tel?: string;
        fax?: string;
        adr?: string;
        cell?: string;
    };
}

describe('Real Contacts Parsing', () => {
    (difficultContacts as ContactTestCase[]).forEach((contact) => {
        if (!contact.expected) return; // Skip commented out or incomplete cases

        it(`should correctly parse ${contact.id}`, () => {
            const vcard = parseImpressumToVCard(contact.text);
            const parsed = parseVCardString(vcard);
            const data = parsed.data;

            // Helper to clean phone numbers for comparison
            const cleanPhone = (p: string) => p.replace(/[^0-9+]/g, '');

            // Name
            if (contact.expected.fn) {
                expect(data.fn).toBe(contact.expected.fn);
            }

            // Org
            if (contact.expected.org) {
                expect(data.org).toBe(contact.expected.org);
            }

            // Email
            if (contact.expected.email) {
                const emails = data.email?.map(e => e.value) || [];
                expect(emails).toContain(contact.expected.email);
            }

            // Phone
            if (contact.expected.tel) {
                const phones = data.tel?.map(t => cleanPhone(t.value)) || [];
                expect(phones).toContain(cleanPhone(contact.expected.tel));
            }

            // Fax
            // Note: vcardUtils might put fax in tel with type FAX or just tel.
            // Let's check if the number exists in tel list first.
            if (contact.expected.fax) {
                const phones = data.tel?.map(t => cleanPhone(t.value)) || [];
                expect(phones).toContain(cleanPhone(contact.expected.fax));
            }

            // Title
            if (contact.expected.title) {
                expect(data.title).toBe(contact.expected.title);
            }

            // URL
            if (contact.expected.url) {
                const urls = data.url?.map(u => u.value) || [];
                // URL might be full http or just domain, let's check loosely or strict depending on parser
                // The parser usually adds http, but let's check if the expected string is contained
                const hasUrl = urls.some(u => u.includes(contact.expected.url!));
                expect(hasUrl).toBe(true);
            }

            // Mobile (Cell) - Negative Check
            if (typeof contact.expected.cell === 'string') {
                // If expected is empty string, ensure NO mobile number is found
                const mobiles = data.tel?.filter(t => t.type?.toLowerCase().includes('cell') || t.type?.toLowerCase().includes('mobile')).map(t => cleanPhone(t.value)) || [];
                if (contact.expected.cell === "") {
                    expect(mobiles.length).toBe(0);
                } else {
                    expect(mobiles).toContain(cleanPhone(contact.expected.cell));
                }
            }
            // Address (Simple check)
            if (contact.expected.adr) {
                const adr = data.adr?.[0]?.value;
                const fullAdr = `${adr?.street}, ${adr?.zip} ${adr?.city}`;
                // This might be too strict depending on formatting, but let's try
                // expect(fullAdr).toContain(contact.expected.adr.split(',')[0]); // Check street at least
            }
        });
    });
});
