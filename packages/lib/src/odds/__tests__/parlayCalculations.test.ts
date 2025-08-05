import { describe, it, expect } from 'vitest';
import { calculateParlayOdds, calculateStreakBooster, calculateSafeBetCost, validateParlayBet, PredictionItem } from '../parlayCalculations';

// Define Match type locally for testing
interface Match {
    id: number;
    tournament: string;
    player1: { name: string; odds: number };
    player2: { name: string; odds: number };
    time: string;
    status: 'upcoming';
    points: number;
    startTime: Date;
    lockTime: Date;
    isLocked: boolean;
}

// Mock data for testing
const createMockMatch = (id: number, player1Odds: number, player2Odds: number): Match => ({
    id,
    tournament: 'Test Tournament',
    player1: { name: 'Player One', odds: player1Odds },
    player2: { name: 'Player Two', odds: player2Odds },
    time: '14:00',
    status: 'upcoming' as const,
    points: 100,
    startTime: new Date(),
    lockTime: new Date(),
    isLocked: false
});

const createMockPrediction = (matchId: number, match: Match, prediction: string): PredictionItem => ({
    matchId,
    match,
    prediction,
    points: 10
});

describe('Parlay Calculations', () => {
    describe('calculateParlayOdds', () => {
        it('should return base values for empty predictions', () => {
            const result = calculateParlayOdds([], 10);
            expect(result.baseOdds).toBe(1);
            expect(result.finalOdds).toBe(1);
            expect(result.potentialWinnings).toBe(0);
        });

        it('should calculate correct base odds for single prediction', () => {
            const match = createMockMatch(1, 2.0, 1.8);
            const prediction = createMockPrediction(1, match, 'Winner: Player One');
            const result = calculateParlayOdds([prediction], 10);
            
            expect(result.baseOdds).toBe(2.0);
            expect(result.finalOdds).toBe(2.0);
            expect(result.potentialWinnings).toBe(20);
        });

        it('should calculate correct parlay odds for multiple predictions', () => {
            const match1 = createMockMatch(1, 2.0, 1.8);
            const match2 = createMockMatch(2, 1.5, 2.5);
            const prediction1 = createMockPrediction(1, match1, 'Winner: Player One');
            const prediction2 = createMockPrediction(2, match2, 'Winner: Player One');
            
            const result = calculateParlayOdds([prediction1, prediction2], 10);
            
            expect(result.baseOdds).toBe(3.0); // 2.0 * 1.5
            expect(result.finalOdds).toBe(3.0);
            expect(result.potentialWinnings).toBe(30);
        });

        it('should apply bonus multiplier for 3+ predictions', () => {
            const matches = [
                createMockMatch(1, 2.0, 1.8),
                createMockMatch(2, 1.5, 2.5),
                createMockMatch(3, 1.8, 2.2)
            ];
            const predictions = matches.map((match, index) => 
                createMockPrediction(index + 1, match, 'Winner: Player One')
            );
            
            const result = calculateParlayOdds(predictions, 10);
            
            expect(result.baseOdds).toBe(5.4); // 2.0 * 1.5 * 1.8
            expect(result.bonusMultiplier).toBe(1.05); // 5% bonus
            expect(result.finalOdds).toBeCloseTo(5.67, 2); // 5.4 * 1.05
            expect(result.isEligibleForBonus).toBe(true);
        });
    });

    describe('calculateStreakBooster', () => {
        it('should return 1 for streaks below threshold', () => {
            expect(calculateStreakBooster(0)).toBe(1);
            expect(calculateStreakBooster(1)).toBe(1);
            expect(calculateStreakBooster(2)).toBe(1);
        });

        it('should calculate correct booster for valid streaks', () => {
            expect(calculateStreakBooster(3)).toBe(1.02); // 2% boost
            expect(calculateStreakBooster(4)).toBe(1.04); // 4% boost
            expect(calculateStreakBooster(5)).toBe(1.06); // 6% boost
        });

        it('should cap booster at maximum', () => {
            expect(calculateStreakBooster(15)).toBe(1.20); // Max 20% boost
            expect(calculateStreakBooster(20)).toBe(1.20); // Still max 20% boost
        });
    });

    describe('calculateSafeBetCost', () => {
        it('should calculate correct cost based on prediction count', () => {
            expect(calculateSafeBetCost(2)).toBe(100); // 50 * 2
            expect(calculateSafeBetCost(3)).toBe(150); // 50 * 3
            expect(calculateSafeBetCost(5)).toBe(250); // 50 * 5
        });
    });

    describe('validateParlayBet', () => {
        it('should validate correct parlay bet', () => {
            const match = createMockMatch(1, 2.0, 1.8);
            const prediction = createMockPrediction(1, match, 'Winner: Player One');
            const result = validateParlayBet([prediction, prediction], 10, 100);
            
            expect(result.isValid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('should reject insufficient predictions', () => {
            const match = createMockMatch(1, 2.0, 1.8);
            const prediction = createMockPrediction(1, match, 'Winner: Player One');
            const result = validateParlayBet([prediction], 10, 100);
            
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Parlay requires at least 2 predictions');
        });

        it('should reject invalid stake', () => {
            const match = createMockMatch(1, 2.0, 1.8);
            const prediction = createMockPrediction(1, match, 'Winner: Player One');
            const result = validateParlayBet([prediction, prediction], 0, 100);
            
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Stake must be greater than 0');
        });

        it('should reject insufficient balance', () => {
            const match = createMockMatch(1, 2.0, 1.8);
            const prediction = createMockPrediction(1, match, 'Winner: Player One');
            const result = validateParlayBet([prediction, prediction], 50, 10);
            
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Insufficient balance');
        });
    });
}); 