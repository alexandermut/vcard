import { AddressFmt, Address } from 'ilib-address';

export interface ParsedAddress {
    street: string;
    city: string;
    zip: string;
    country: string;
    region?: string;
}

export const parseInternationalAddress = (text: string): ParsedAddress | null => {
    try {
        // ilib-address usage:
        // new Address("text", { locale: "en-US" })
        // We might need to guess the locale or try a few common ones if not known.
        // For now, let's try a generic approach or iterate common locales.

        // Heuristic: Check for country code in text to pick locale?
        // Or just try to parse.

        // Let's try to parse as generic or US first as it's common for non-DACH.
        const address = new Address(text, {
            locale: 'en-US'
        });

        if (address) {
            return {
                street: address.streetAddress || '',
                city: address.locality || '',
                zip: address.postalCode || '',
                country: address.country || '',
                region: address.region || ''
            };
        }
        return null;
    } catch (e) {
        console.warn("ilib-address parse failed", e);
        return null;
    }
};
