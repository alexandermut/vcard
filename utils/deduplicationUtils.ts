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
 * Calculates Levenshtein Distance between two strings.
 * Returns the number of edits needed to turn a into b.
 */
export const levenshteinDistance = (a: string, b: string): number => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    // increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // increment each column in the first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1 // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
};

/**
 * Simplified Cologne Phonetics (Kölner Phonetik) for German names.
 * Maps characters to codes:
 * A,E,I,J,O,U,Y -> 0
 * B -> 1
 * P (not before H) -> 1
 * D,T (not before C,S,Z) -> 2
 * F,V,W -> 3
 * G,K,Q -> 4
 * C (at start before A,H,K,L,O,Q,R,U,X) -> 4
 * C (before A,H,K,O,Q,U,X except after S,Z) -> 4
 * X -> 48
 * L -> 5
 * M,N -> 6
 * R -> 7
 * S,Z -> 8
 * C (after S,Z) -> 8
 * C (at start before E,I,Y) -> 8
 * C (not before A,H,K,O,Q,U,X) -> 8
 * DT (before C,S,Z) -> 8
 * 
 * This is a simplified approximation for performance.
 */
export const colognePhonetics = (str: string): string => {
    let s = str.toLowerCase();
    let res = "";

    // Pre-processing
    s = s.replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss").replace(/ph/g, "f");

    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        const next = s[i + 1] || "";
        const prev = s[i - 1] || "";

        let code = "";

        if ("aeijouy".includes(c)) code = "0";
        else if (c === "b") code = "1";
        else if (c === "p") {
            if (next !== "h") code = "1";
            else code = "3"; // ph -> f -> 3
        }
        else if ("dt".includes(c)) {
            if ("csz".includes(next)) code = "8";
            else code = "2";
        }
        else if ("fvw".includes(c)) code = "3";
        else if ("gkq".includes(c)) code = "4";
        else if (c === "c") {
            if (i === 0) {
                if ("ahkloqrux".includes(next)) code = "4";
                else code = "8";
            } else {
                if ("sz".includes(prev)) code = "8";
                else if ("ahkoqux".includes(next)) code = "4";
                else code = "8";
            }
        }
        else if (c === "x") code = "48";
        else if (c === "l") code = "5";
        else if ("mn".includes(c)) code = "6";
        else if (c === "r") code = "7";
        else if ("sz".includes(c)) code = "8";

        // Remove duplicates (except first char?) No, Cologne Phonetics collapses adjacent same codes
        if (res.endsWith(code) && code !== "") continue;
        // Ignore 0 except at start? Cologne Phonetics keeps 0? No, usually removes vowels except at start.
        // Simplified: Keep all for now, or follow rule: remove 0 except at start.

        if (code === "0" && res.length > 0) continue;

        res += code;
    }

    return res;
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

import { parseVCardString, generateVCardFromData } from './vcardUtils';

/**
 * Merges multiple vCard strings into one, combining unique fields.
 */
export const mergeVCards = (masterVCard: string, duplicateVCards: string[]): string => {
    const masterParsed = parseVCardString(masterVCard).data;

    duplicateVCards.forEach(vcard => {
        const dupParsed = parseVCardString(vcard).data;

        // Merge Emails (Unique)
        if (dupParsed.email) {
            const existing = new Set(masterParsed.email?.map(e => e.value.toLowerCase()));
            dupParsed.email.forEach(e => {
                if (!existing.has(e.value.toLowerCase())) {
                    if (!masterParsed.email) masterParsed.email = [];
                    masterParsed.email.push(e);
                    existing.add(e.value.toLowerCase());
                }
            });
        }

        // Merge Phones (Unique)
        if (dupParsed.tel) {
            const existing = new Set(masterParsed.tel?.map(t => clean_number(t.value)));
            dupParsed.tel.forEach(t => {
                const clean = clean_number(t.value);
                if (!existing.has(clean)) {
                    if (!masterParsed.tel) masterParsed.tel = [];
                    masterParsed.tel.push(t);
                    existing.add(clean);
                }
            });
        }

        // Merge Addresses (Unique)
        if (dupParsed.adr) {
            // Simple string comparison for uniqueness
            const existing = new Set(masterParsed.adr?.map(a => JSON.stringify(a.value)));
            dupParsed.adr.forEach(a => {
                const str = JSON.stringify(a.value);
                if (!existing.has(str)) {
                    if (!masterParsed.adr) masterParsed.adr = [];
                    masterParsed.adr.push(a);
                    existing.add(str);
                }
            });
        }

        // Merge URLs
        if (dupParsed.url) {
            const existing = new Set(masterParsed.url?.map(u => u.value.toLowerCase()));
            dupParsed.url.forEach(u => {
                if (!existing.has(u.value.toLowerCase())) {
                    if (!masterParsed.url) masterParsed.url = [];
                    masterParsed.url.push(u);
                    existing.add(u.value.toLowerCase());
                }
            });
        }

        // Merge Note (Append)
        if (dupParsed.note) {
            if (!masterParsed.note) masterParsed.note = dupParsed.note;
            else if (dupParsed.note && !masterParsed.note.includes(dupParsed.note)) {
                masterParsed.note += `\n\n-- Merged Note --\n${dupParsed.note}`;
            }
        }

        // Merge Org/Title if missing in master
        if (!masterParsed.org && dupParsed.org) masterParsed.org = dupParsed.org;
        if (!masterParsed.title && dupParsed.title) masterParsed.title = dupParsed.title;
        if (!masterParsed.bday && dupParsed.bday) masterParsed.bday = dupParsed.bday;
    });

    return generateVCardFromData(masterParsed);
};

/**
 * Merges a list of duplicates into a master contact.
 * @param master The contact that will be kept (and updated).
 * @param duplicates The contacts that will be merged into master and then deleted.
 * @param overrides Optional manual overrides for specific fields (for UI "Arrow" selection).
 */
export const mergeContacts = (
    master: HistoryItem,
    duplicates: HistoryItem[],
    overrides?: Partial<HistoryItem>
): HistoryItem => {
    // Clone master to avoid mutation
    const result: HistoryItem = { ...master };

    // 1. Apply Overrides (Manual Decisions)
    // ... (same as before)

    // 2. Smart Merge: Fill empty fields from duplicates
    // ... (same as before)

    // 3. Merge vCards (The heavy lifting)
    const duplicateVCards = duplicates.map(d => d.vcard);
    result.vcard = mergeVCards(result.vcard, duplicateVCards);

    // Re-parse name/org from merged vCard to ensure consistency
    const reParsed = parseVCardString(result.vcard).data;
    if (reParsed.fn) result.name = reParsed.fn;
    if (reParsed.org) result.org = reParsed.org;

    return result;
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
        if (isCleanGroup) {
            addGroup(ids, 'medium', `Gleicher Name (${name})`);
        } else {
            // Optional: We could add as 'low' confidence or split into subgroups
            // For safety, let's skip for now or mark as 'low'
            // addGroup(ids, 'low', `Gleicher Name (${name}), aber unterschiedliche Details`);
        }
    }
    });

// 4. Fuzzy & Phonetic Matching (Low/Medium Confidence)
// This is O(n^2), so we must be careful. Limit to reasonable dataset size or optimize.
// For < 1000 contacts it's fine. For 10k it might be slow.
// Optimization: Block by first letter or phonetic code.

const phoneticMap = new Map<string, string[]>();
contacts.forEach(c => {
    if (processedIds.has(c.id)) return;
    const name = normalizeName(c.name);
    if (!name || name.length < 3) return;

    const code = colognePhonetics(name);
    if (!phoneticMap.has(code)) phoneticMap.set(code, []);
    phoneticMap.get(code)?.push(c.id);
});

phoneticMap.forEach((ids, code) => {
    if (ids.length > 1) {
        // We have a phonetic match group.
        // Now check Levenshtein to be sure it's not completely different
        // e.g. "Maier" vs "Meyer" -> Phonetic match, Levenshtein low -> Good.

        const groupContacts = contacts.filter(c => ids.includes(c.id));

        // Compare pairs
        for (let i = 0; i < groupContacts.length; i++) {
            for (let j = i + 1; j < groupContacts.length; j++) {
                const c1 = groupContacts[i];
                const c2 = groupContacts[j];

                if (processedIds.has(c1.id) && processedIds.has(c2.id)) continue;
                if (areDifferentPeople(c1, c2)) continue;

                const dist = levenshteinDistance(normalizeName(c1.name), normalizeName(c2.name));
                const maxLen = Math.max(c1.name.length, c2.name.length);
                const similarity = 1 - (dist / maxLen);

                if (similarity > 0.8) { // > 80% similarity
                    addGroup([c1.id, c2.id], 'medium', `Ähnlicher Name (${c1.name} / ${c2.name})`);
                }
            }
        }
    }
});

return groups;
};
