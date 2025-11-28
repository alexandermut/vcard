import { VCardData } from '../types';
import { GoogleContact } from '../services/googleContactsService';
import { generateVCardFromData } from './vcardUtils';

export const mapGooglePersonToVCard = (person: GoogleContact): { vcard: string; data: VCardData } => {
    const name = person.names?.[0];
    const org = person.organizations?.[0];

    const data: VCardData = {
        fn: name?.displayName || '',
        n: `${name?.familyName || ''};${name?.givenName || ''};;;`,
        org: org?.name,
        title: org?.title,
        tel: person.phoneNumbers?.map(p => ({
            type: p.type ? p.type.toLowerCase() : 'voice',
            value: p.value
        })),
        email: person.emailAddresses?.map(e => ({
            type: e.type ? e.type.toLowerCase() : 'internet',
            value: e.value
        })),
        adr: person.addresses?.map(a => ({
            type: a.type ? a.type.toLowerCase() : 'home',
            value: {
                street: a.streetAddress || '',
                city: a.city || '',
                zip: a.postalCode || '',
                country: a.country || '',
                region: ''
            }
        })),
        url: person.urls?.map(u => ({
            type: u.type ? u.type.toLowerCase() : 'website',
            value: u.value
        })),
        note: person.biographies?.[0]?.value,
        photo: person.photos?.find(p => !p.default)?.url // Use non-default photo if available
    };

    // Generate vCard string
    const vcard = generateVCardFromData(data);

    return { vcard, data };
};
