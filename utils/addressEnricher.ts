import { getStreetsByZip } from './db';
import { VCardData } from '../types';

// Simple Levenshtein distance
const levenshtein = (a: string, b: string): number => {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) == a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
                );
            }
        }
    }

    return matrix[b.length][a.length];
};

export const enrichAddress = async (data: VCardData): Promise<VCardData> => {
    // Only process if we have an address with a ZIP
    if (!data.adr || data.adr.length === 0) return data;

    const newData = { ...data };
    newData.adr = [...data.adr]; // Shallow copy array

    for (let i = 0; i < newData.adr.length; i++) {
        const adr = newData.adr[i];
        const zip = adr.value.zip;
        const currentStreet = adr.value.street;

        if (zip && zip.length === 5) {
            // 1. Fetch candidates
            const candidates = await getStreetsByZip(zip);

            if (candidates.length === 0) continue;

            // 2. If we have a street, try to correct it
            if (currentStreet) {
                // Find best match
                let bestMatch = "";
                let minDist = Infinity;

                // Heuristic: If the current street is very short, it might be just the house number or garbage
                // If it's long, it might be a typo

                // Normalize current street (remove numbers for matching)
                const streetNameOnly = currentStreet.replace(/\d+.*$/, '').trim();

                for (const candidate of candidates) {
                    const dist = levenshtein(streetNameOnly.toLowerCase(), candidate.toLowerCase());
                    if (dist < minDist) {
                        minDist = dist;
                        bestMatch = candidate;
                    }
                }

                // Threshold: Allow 2-3 typos max, or 20% of length
                const threshold = Math.max(3, Math.floor(bestMatch.length * 0.3));

                if (minDist <= threshold) {
                    // We found a likely match!
                    // Preserve the house number from the original input
                    const houseNumberMatch = currentStreet.match(/\d+.*$/);
                    const houseNumber = houseNumberMatch ? houseNumberMatch[0] : "";

                    // Update the street
                    // If we found a house number, append it. Otherwise just use the street name.
                    if (houseNumber) {
                        adr.value.street = `${bestMatch} ${houseNumber}`;
                    } else {
                        adr.value.street = bestMatch;
                    }

                    // Also update city if it was missing or different (optional, but safe for German Zips)
                    // Actually, one ZIP can map to multiple cities/suburbs, so be careful.
                    // We only stored 'city' in DB, so we could update it too.
                }
            }
        }
    }

    return newData;
};
