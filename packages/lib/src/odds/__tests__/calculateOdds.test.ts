import { describe, test, expect } from 'vitest';
import { calculateOdds, PlayerOddsData, MatchContext } from '../calculateOdds';

// Mock player data for testing
const mockPlayer1: PlayerOddsData = {
    id: '1',
    firstName: 'Γιώργος',
    lastName: 'Παπαδόπουλος',
    ntrpRating: 4.5,
    wins: 15,
    losses: 8,
    last5: ['W', 'W', 'L', 'W', 'L'] as const,
    currentStreak: 3,
    streakType: 'W',
    surfacePreference: 'Hard Court',
    aggressiveness: 7,
    stamina: 8,
    consistency: 6,
    age: 28,
    hand: 'right',
    club: 'Ολυμπιακός',
    notes: 'Strong baseline player'
};

const mockPlayer2: PlayerOddsData = {
    id: '2',
    firstName: 'Μαρία',
    lastName: 'Κωνσταντίνου',
    ntrpRating: 3.5,
    wins: 12,
    losses: 10,
    last5: ['L', 'W', 'W', 'L', 'W'] as const,
    currentStreak: 1,
    streakType: 'W',
    surfacePreference: 'Clay Court',
    aggressiveness: 5,
    stamina: 7,
    consistency: 8,
    age: 25,
    hand: 'right',
    club: 'Παναθηναϊκός',
    notes: 'Consistent player'
};

const mockContext: MatchContext = {
    surface: 'Hard Court'
};

describe('calculateOdds', () => {
    test('should return valid odds structure', () => {
        const result = calculateOdds(mockPlayer1, mockPlayer2, mockContext);
        
        expect(result).toHaveProperty('player1WinProbability');
        expect(result).toHaveProperty('player2WinProbability');
        expect(result).toHaveProperty('player1Odds');
        expect(result).toHaveProperty('player2Odds');
        expect(result).toHaveProperty('confidence');
        expect(result).toHaveProperty('factors');
        expect(result).toHaveProperty('recommendations');
    });

    test('should return probabilities that sum to 1', () => {
        const result = calculateOdds(mockPlayer1, mockPlayer2, mockContext);
        
        const sum = result.player1WinProbability + result.player2WinProbability;
        expect(sum).toBeCloseTo(1, 2);
    });

    test('should return valid decimal odds', () => {
        const result = calculateOdds(mockPlayer1, mockPlayer2, mockContext);
        
        expect(result.player1Odds).toBeGreaterThan(1);
        expect(result.player2Odds).toBeGreaterThan(1);
        expect(result.player1Odds).toBeLessThan(20); // Reasonable upper bound
        expect(result.player2Odds).toBeLessThan(20);
    });

    test('should favor higher NTRP rating', () => {
        const strongPlayer = { ...mockPlayer1, ntrpRating: 5.5 };
        const weakPlayer = { ...mockPlayer2, ntrpRating: 3.0 };
        
        const result = calculateOdds(strongPlayer, weakPlayer, mockContext);
        
        expect(result.player1WinProbability).toBeGreaterThan(0.6);
        expect(result.factors.ntrpAdvantage).toBeGreaterThan(0.3);
    });

    test('should consider surface preference', () => {
        const hardCourtPlayer = { 
            ...mockPlayer1, 
            surfacePreference: 'Hard Court',
            surfaceWinRates: {
                hardCourt: 0.80,
                clayCourt: 0.40,
                grassCourt: 0.50,
                indoor: 0.60
            }
        };
        const clayCourtPlayer = { 
            ...mockPlayer2, 
            surfacePreference: 'Clay Court',
            surfaceWinRates: {
                hardCourt: 0.30,
                clayCourt: 0.85,
                grassCourt: 0.35,
                indoor: 0.45
            }
        };
        const hardCourtContext = { ...mockContext, surface: 'Hard Court' as const };
        
        const result = calculateOdds(hardCourtPlayer, clayCourtPlayer, hardCourtContext);
        
        expect(result.factors.surfaceAdvantage).toBeGreaterThan(0.1);
    });

    test('should consider recent form', () => {
        const inFormPlayer = { ...mockPlayer1, last5: ['W', 'W', 'W', 'W', 'W'] as ('W' | 'L')[] };
        const outOfFormPlayer = { ...mockPlayer2, last5: ['L', 'L', 'L', 'L', 'L'] as ('W' | 'L')[] };
        
        const result = calculateOdds(inFormPlayer, outOfFormPlayer, mockContext);
        
        expect(result.factors.formAdvantage).toBeGreaterThan(0.3);
    });

    test('should handle edge cases gracefully', () => {
        const newPlayer = { ...mockPlayer1, wins: 0, losses: 0, last5: ['L', 'L', 'L', 'L', 'L'] as ('W' | 'L')[] };
        const experiencedPlayer = { ...mockPlayer2, wins: 50, losses: 10, last5: ['W', 'W', 'W', 'W', 'W'] as ('W' | 'L')[] };
        
        const result = calculateOdds(newPlayer, experiencedPlayer, mockContext);
        
        // Should still return valid odds
        expect(result.player1WinProbability).toBeGreaterThan(0.05);
        expect(result.player1WinProbability).toBeLessThan(0.95);
        expect(result.player2WinProbability).toBeGreaterThan(0.05);
        expect(result.player2WinProbability).toBeLessThan(0.95);
    });

    test('should generate meaningful recommendations', () => {
        const result = calculateOdds(mockPlayer1, mockPlayer2, mockContext);
        
        expect(result.recommendations).toBeInstanceOf(Array);
        expect(result.recommendations.length).toBeLessThanOrEqual(3);
        expect(result.recommendations.length).toBeGreaterThan(0);
    });

    test('should calculate confidence based on data quality', () => {
        const result = calculateOdds(mockPlayer1, mockPlayer2, mockContext);
        
        expect(result.confidence).toBeGreaterThan(0.3);
        expect(result.confidence).toBeLessThan(0.95);
    });

    test('should handle same player data', () => {
        const result = calculateOdds(mockPlayer1, mockPlayer1, mockContext);
        
        // Should be close to 50/50
        expect(result.player1WinProbability).toBeCloseTo(0.5, 1);
        expect(result.player2WinProbability).toBeCloseTo(0.5, 1);
    });

    test('should give a moderate but clear advantage for 0.5 NTRP difference', () => {
        const playerA = { ...mockPlayer1, ntrpRating: 4.5 };
        const playerB = { ...mockPlayer2, ntrpRating: 4.0 };
        const result = calculateOdds(playerA, playerB, mockContext);
        expect(result.player1WinProbability).toBeGreaterThan(0.60);
        expect(result.player1WinProbability).toBeLessThan(0.75);
    });
}); 