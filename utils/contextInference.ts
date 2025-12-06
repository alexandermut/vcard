import { AnchorMatch } from './anchorDetection';

export interface TextRange {
    startIndex: number;
    endIndex: number;
}

/**
 * Calculates the distance between two text ranges.
 * Returns 0 if they overlap.
 * Otherwise returns the number of characters between them.
 */
export const calculateDistance = (a: TextRange, b: TextRange): number => {
    // A: [startA, endA]
    // B: [startB, endB]

    // Case 1: A is before B
    if (a.endIndex < b.startIndex) {
        return b.startIndex - a.endIndex;
    }
    // Case 2: B is before A
    if (b.endIndex < a.startIndex) {
        return a.startIndex - b.endIndex;
    }
    // Overlap
    return 0;
};

/**
 * Calculates a proximity score (0.0 to 1.0).
 * Decays as distance increases.
 * 
 * Formula: 1 / (1 + (distance / characteristicDistance)^2)
 * @param distance Character distance
 * @param halfScoreDistance Distance at which score drops to 0.5 (default 50 chars)
 */
export const calculateProximityScore = (distance: number, halfScoreDistance: number = 50): number => {
    if (distance < 0) distance = 0; // Should not happen with calcDistance
    return 1 / (1 + Math.pow(distance / halfScoreDistance, 2));
};

/**
 * Checks if an anchor is conceptually relevant to a candidate.
 */
export const isAnchorRelevant = (anchor: AnchorMatch, candidateType: string): boolean => {
    switch (candidateType) {
        case 'PHONE':
            return anchor.type === 'AREA_CODE' || anchor.type === 'KEYWORD'; // e.g. "Tel"
        case 'ADDRESS':
            return anchor.type === 'PLZ' || anchor.type === 'CITY';
        case 'NAME':
            return anchor.type === 'KEYWORD'; // e.g. "Geschäftsführer"
        default:
            return false;
    }
};

/**
 * Scores a candidate against a list of anchors.
 * Returns the highest score found from relevant anchors.
 */
export const scoreCandidate = (
    candidate: TextRange & { type: string }, // type: 'PHONE', etc.
    anchors: AnchorMatch[]
): number => {
    let maxScore = 0;

    for (const anchor of anchors) {
        if (!isAnchorRelevant(anchor, candidate.type)) continue;

        const dist = calculateDistance(candidate, anchor);

        // Custom logic: Area Code MUST closely precede the phone number to be relevant?
        // Actually, sometimes it's separated.

        let score = calculateProximityScore(dist);

        // Boost if Area Code matches candidate logic (e.g. prefix match) - this requires checking values, 
        // which we can't do generically here without more info. 
        // So we stick to spatial scoring for now.

        // Tiny penalty if anchor is AFTER candidate? (Usually labels are BEFORE: "Tel: 1234")
        if (anchor.startIndex > candidate.endIndex) {
            score *= 0.8;
        }

        if (score > maxScore) {
            maxScore = score;
        }
    }

    return maxScore;
};
