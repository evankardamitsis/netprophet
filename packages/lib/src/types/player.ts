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
  streakType: "W" | "L";
  surfacePreference: string;
  surfaceWinRates?: {
    hardCourt?: number; // 0-1
    clayCourt?: number; // 0-1
    grassCourt?: number; // 0-1
  };
  // Surface-specific statistics
  hardWins?: number;
  hardLosses?: number;
  hardMatches?: number;
  hardWinRate?: number;
  clayWins?: number;
  clayLosses?: number;
  clayMatches?: number;
  clayWinRate?: number;
  grassWins?: number;
  grassLosses?: number;
  grassMatches?: number;
  grassWinRate?: number;
  // Doubles-specific statistics
  doublesWins?: number;
  doublesLosses?: number;
  doublesLast5?: string[];
  doublesCurrentStreak?: number;
  doublesStreakType?: "W" | "L";
  aggressiveness: number; // 1-10
  stamina: number; // 1-10
  consistency: number; // 1-10
  age: number; // 16-80
  hand: "left" | "right";
  gender?: "men" | "women" | null; // Player gender for filtering
  notes?: string;
  lastMatchDate?: string; // ISO date string
  injuryStatus?: "healthy" | "minor" | "major";
  seasonalForm?: number; // 0-1, season win rate
  photoUrl?: string | null; // URL to the athlete photo
  isActive?: boolean; // Whether the player is active and can participate in matches
  isHidden?: boolean; // Whether the player is hidden from public view
  isDemoPlayer?: boolean; // Whether this is a demo player
  claimedByUserId?: string; // User ID who claimed this player profile
  claimedAt?: string; // When the player profile was claimed
}
