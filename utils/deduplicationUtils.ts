import { HistoryItem } from '../types';
import { clean_number } from './vcardUtils';

export interface DuplicateGroup {
    id: string; // Unique ID for the group
    contactIds: string[];
    confidence: 'high' | 'medium' | 'low';
    reason: string; // e.g. "Same Email", "Same Phone"
}

/**
 * Normalizes a string for comparison (lowercase, trim, remove special chars).
 */
export const normalizeString = (str: string | undefined): string => {
    if (!str) return '';
    return str.toLowerCase().trim().replace(/\s+/g, ' ');
};

/**
 * Normalizes a name (remove titles, extra spaces).
 */
export const normalizeName = (name: string): string => {
    return normalizeString(name)
        .replace(/^(dr\.|prof\.|mr\.|mrs\.|hr\.|fr\.)\s+/i, '') // Remove common titles
        .trim();
};

/**
 * Checks if the name (first/last) appears in the email address.
 */
const isNameInEmail = (name: string, email: string): boolean => {
    if (!name || !email) return false;
    const normalizedName = normalizeName(name);
    const parts = normalizedName.split(' ').filter(p => p.length > 2); // Ignore short parts like "Dr", "von"
    const emailUser = email.split('@')[0].toLowerCase();

    // Check if any significant name part is in the email username
    return parts.some(part => emailUser.includes(part));
};

/**
 * Checks if two contacts are likely different people despite having the same name.
 * Returns true if they have conflicting Organizations, Emails, or Phones.
 */
const areDifferentPeople = (c1: HistoryItem, c2: HistoryItem): boolean => {
    // 1. Check Organization Conflict
    // If both have an org, and they are different -> Different People
    if (c1.org && c2.org) {
        if (normalizeString(c1.org) !== normalizeString(c2.org)) return true;
    }

    // 2. Check Email Conflict
    // If both have emails, and they share NO common email -> Different People
    const emails1 = (c1.vcard.match(/EMAIL[^:]*:(.*)/gi) || []).map(l => normalizeString(l.split(':')[1]));
    const emails2 = (c2.vcard.match(/EMAIL[^:]*:(.*)/gi) || []).map(l => normalizeString(l.split(':')[1]));

    if (emails1.length > 0 && emails2.length > 0) {
        const hasCommonEmail = emails1.some(e1 => emails2.includes(e1));
        if (!hasCommonEmail) {
            // Emails differ. BUT: Check if names match the emails.
            // If C1's name is in C2's email (or vice versa), it's likely the same person with different emails.
            const name1InEmail2 = emails2.some(e => isNameInEmail(c1.name, e));
            const name2InEmail1 = emails1.some(e => isNameInEmail(c2.name, e));

            if (!name1InEmail2 && !name2InEmail1) {
                return true; // Different emails and names don't match emails -> Different People
            }
        }
    }

    // 3. Check Phone Conflict
    // If both have phones, and they share NO common phone -> Different People
    const phones1 = (c1.vcard.match(/TEL[^:]*:(.*)/gi) || []).map(l => clean_number(l.split(':')[1]));
    const phones2 = (c2.vcard.match(/TEL[^:]*:(.*)/gi) || []).map(l => clean_number(l.split(':')[1]));

    if (phones1.length > 0 && phones2.length > 0) {
        const hasCommonPhone = phones1.some(p1 => phones2.includes(p1));
        if (!hasCommonPhone) return true;
    }

    return false;
};

/**
 * Checks if two contacts are duplicates based on strict criteria.
 */
export const findDuplicates = (contacts: HistoryItem[]): DuplicateGroup[] => {
    const groups: DuplicateGroup[] = [];
    const processedIds = new Set<string>();

    // Helper to add a group
    const addGroup = (ids: string[], confidence: 'high' | 'medium', reason: string) => {
        // Filter out already processed IDs
        const newIds = ids.filter(id => !processedIds.has(id));
        if (newIds.length < 2 && ids.length < 2) return; // Need at least 2 to be a duplicate pair

        // If we have some new IDs but some old, we might be merging clusters.
        // For simplicity in Phase 1, we just ignore already processed ones to avoid overlaps.
        // A more advanced algo would merge clusters.

        if (newIds.length > 0) {
            // Mark all as processed
            ids.forEach(id => processedIds.add(id));

            groups.push({
                id: crypto.randomUUID(),
                contactIds: ids,
                confidence,
                reason
            });
        }
    };

    // Helper to check for generic emails
    const isGenericEmail = (email: string): boolean => {
        const genericPrefixes = ['info', 'contact', 'kontakt', 'office', 'admin', 'sales', 'support', 'hello', 'mail', 'team', 'service', 'buchhaltung', 'invoice'];
        const prefix = email.split('@')[0];
        return genericPrefixes.includes(prefix);
    };

    // 1. Map by Email
    const emailMap = new Map<string, string[]>();
    contacts.forEach(c => {
        const emails = (c.vcard.match(/EMAIL[^:]*:(.*)/gi) || [])
            .map(line => normalizeString(line.split(':')[1]));

        emails.forEach(email => {
            if (!email) return;
            if (!emailMap.has(email)) emailMap.set(email, []);
            emailMap.get(email)?.push(c.id);
        });
    });

    emailMap.forEach((ids, email) => {
        if (ids.length > 1) {
            if (isGenericEmail(email)) {
                // Generic Email (e.g. info@) -> Requires additional Name or Phone match
                const groupContacts = contacts.filter(c => ids.includes(c.id));

                // Check if names are similar
                let nameMatch = true;
                const baseName = normalizeName(groupContacts[0].name);
                for (let i = 1; i < groupContacts.length; i++) {
                    if (normalizeName(groupContacts[i].name) !== baseName) {
                        nameMatch = false;
                        break;
                    }
                }

                if (nameMatch) {
                    addGroup(ids, 'medium', `Gleiche Info-Mail (${email}) & gleicher Name`);
                } else {
                    // Ignore generic email match if names differ
                    // (e.g. "Max @ info.de" vs "Moritz @ info.de")
                }
            } else {
                // Personal Email -> High Confidence
                addGroup(ids, 'high', `Gleiche E-Mail (${email})`);
            }
        }
    });

    // 2. Map by Phone (High Confidence)
    const phoneMap = new Map<string, string[]>();
    contacts.forEach(c => {
        const phones = (c.vcard.match(/TEL[^:]*:(.*)/gi) || [])
            .map(line => clean_number(line.split(':')[1]));

        phones.forEach(phone => {
            if (!phone || phone.length < 6) return; // Ignore short numbers
            if (!phoneMap.has(phone)) phoneMap.set(phone, []);
            phoneMap.get(phone)?.push(c.id);
        });
    });

    phoneMap.forEach((ids, phone) => {
        if (ids.length > 1) {
            addGroup(ids, 'high', `Gleiche Telefonnummer (${phone})`);
        }
    });

    // 3. Map by Name (Medium Confidence)
    // Only if not already matched
    const nameMap = new Map<string, string[]>();
    contacts.forEach(c => {
        if (processedIds.has(c.id)) return;
        const name = normalizeName(c.name);
        if (!name) return;
        if (!nameMap.has(name)) nameMap.set(name, []);
        nameMap.get(name)?.push(c.id);
    });

    nameMap.forEach((ids, name) => {
        if (ids.length > 1) {
            // Check for conflicts within this group
            // We need the actual contact objects to compare
            const groupContacts = contacts.filter(c => ids.includes(c.id));

            // Simple approach: Compare first to all others. 
            // If ANY conflict exists, we split or ignore.
            // For now: If any pair is "Different People", we downgrade or ignore.

            let isCleanGroup = true;
            for (let i = 0; i < groupContacts.length; i++) {
                for (let j = i + 1; j < groupContacts.length; j++) {
                    if (areDifferentPeople(groupContacts[i], groupContacts[j])) {
                        isCleanGroup = false;
                        break;
                    }
                }
                if (!isCleanGroup) break;
            }

            if (isCleanGroup) {
                addGroup(ids, 'medium', `Gleicher Name (${name})`);
            } else {
                // Optional: We could add as 'low' confidence or split into subgroups
                // For safety, let's skip for now or mark as 'low'
                // addGroup(ids, 'low', `Gleicher Name (${name}), aber unterschiedliche Details`);
            }
        }
    });

    return groups;
};
