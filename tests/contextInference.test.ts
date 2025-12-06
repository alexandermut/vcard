import { describe, it, expect } from 'vitest';
import { calculateDistance, calculateProximityScore, scoreCandidate } from '../utils/contextInference';
import { AnchorMatch } from '../utils/anchorDetection';

describe('Context Inference', () => {
    describe('calculateDistance', () => {
        it('should calculate distance between non-overlapping ranges', () => {
            // "Hello World"
            // Hello: [0, 5]
            // World: [6, 11]
            const a = { startIndex: 0, endIndex: 5 };
            const b = { startIndex: 6, endIndex: 11 };
            expect(calculateDistance(a, b)).toBe(1); // 1 char space
        });

        it('should return 0 for overlapping ranges', () => {
            const a = { startIndex: 0, endIndex: 10 };
            const b = { startIndex: 5, endIndex: 15 };
            expect(calculateDistance(a, b)).toBe(0);
        });

        it('should handle order independence', () => {
            const a = { startIndex: 0, endIndex: 5 };
            const b = { startIndex: 10, endIndex: 15 };
            expect(calculateDistance(a, b)).toBe(5);
            expect(calculateDistance(b, a)).toBe(5);
        });
    });

    describe('calculateProximityScore', () => {
        it('should return 1.0 for distance 0', () => {
            expect(calculateProximityScore(0)).toBe(1);
        });

        it('should return 0.5 for characteristic distance', () => {
            expect(calculateProximityScore(50, 50)).toBe(0.5);
        });

        it('should decay with distance', () => {
            const s1 = calculateProximityScore(10);
            const s2 = calculateProximityScore(100);
            expect(s1).toBeGreaterThan(s2);
        });
    });

    describe('scoreCandidate', () => {
        it('should boost score for relevant anchors', () => {
            const candidate = { type: 'PHONE', startIndex: 20, endIndex: 30, value: '123456' };
            const anchor = {
                type: 'AREA_CODE',
                value: '030',
                startIndex: 10,
                endIndex: 13,
                confidence: 1
            } as AnchorMatch;

            const score = scoreCandidate(candidate, [anchor]);
            // Distance: 20 - 13 = 7.
            // valid relevant type.
            expect(score).toBeGreaterThan(0.9);
        });

        it('should ignore irrelevant anchors', () => {
            const candidate = { type: 'PHONE', startIndex: 20, endIndex: 30, value: '123456' };
            const anchor = {
                type: 'CITY', // Not mapped as relevant to PHONE in simple logic yet (could be debated)
                value: 'Berlin',
                startIndex: 10,
                endIndex: 16,
                confidence: 1
            } as AnchorMatch;

            // isAnchorRelevant(CITY, PHONE) -> currently false in implementation
            const score = scoreCandidate(candidate, [anchor]);
            expect(score).toBe(0);
        });
    });
});
