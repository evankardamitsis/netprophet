// Complete Player type definition matching the calculateOdds algorithm requirements
export interface Player {
    id: string;
    firstName: string;
    lastName: string;
    ntrpRating: number;
    wins: number;
    losses: number;
    last5: string[]; // Array of 'W' or 'L' strings, length 5
    currentStreak: number;
    streakType: 'W' | 'L';
    surfacePreference: string;
    surfaceWinRates?: {
        hardCourt?: number; // 0-1
        clayCourt?: number; // 0-1
        grassCourt?: number; // 0-1
        indoor?: number; // 0-1
    };
    aggressiveness: number; // 1-10
    stamina: number; // 1-10
    consistency: number; // 1-10
    age: number; // 16-80
    hand: 'left' | 'right';
    club: string;
    notes?: string;
    lastMatchDate?: string; // ISO date string
    fatigueLevel?: number; // 0-10, 0 = fresh, 10 = exhausted
    injuryStatus?: 'healthy' | 'minor' | 'major';
    seasonalForm?: number; // 0-1, season win rate
} 