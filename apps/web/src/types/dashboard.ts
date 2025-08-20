// Shared types for dashboard components

export interface Player {
    id: string;
    first_name: string;
    last_name: string;
    ntrp_rating: number;
    surface_preference: string;
    wins?: number;
    losses?: number;
    last5?: string[];
    current_streak?: number;
    streak_type?: string;
}

export interface Tournament {
    id: string;
    name: string;
    surface: string;
    location: string | null;
    start_date?: string;
    end_date?: string;
    status?: string;
}

export interface Category {
    id: string;
    name: string;
}

export interface Match {
    id: string;
    tournament_id: string | null;
    category_id: string | null;
    player_a_id: string | null;
    player_b_id: string | null;
    winner_id: string | null;
    status: string;
    start_time: string | null;
    lock_time: string | null;
    odds_a: number | null;
    odds_b: number | null;
    a_score: number | null;
    b_score: number | null;
    points_value: number;
    web_synced: boolean;
    tournaments?: Tournament;
    tournament_categories?: Category;
    player_a?: Player;
    player_b?: Player;
    // Computed properties for web app compatibility
    tournament: string;
    player1: { name: string; odds: number };
    player2: { name: string; odds: number };
    time: string;
    status_display: 'live' | 'upcoming' | 'finished';
    points: number;
    startTime: Date;
    lockTime: Date;
    isLocked: boolean;
}

export interface PredictionItem {
    matchId: string;
    match: Match;
    prediction: string;
    points: number;
}

// New types for parlay betting system
export interface ParlayCalculation {
    baseOdds: number;
    bonusMultiplier: number;
    finalOdds: number;
    potentialWinnings: number;
    bonusPercentage: number;
    isEligibleForBonus: boolean;
}

export interface ParlayBet {
    predictions: PredictionItem[];
    totalStake: number;
    calculation: ParlayCalculation;
    isSafeBet: boolean; // Gamification: one loss doesn't bust the slip
    streakBooster: number; // Gamification: bonus for winning streaks
}

export interface UserStats {
    totalPoints: number;
    correctPicks: number;
    activeStreak: number;
    ranking: number;
    // New fields for gamification
    totalWins: number;
    totalLosses: number;
    currentStreak: number;
    bestStreak: number;
    safeBetTokens: number; // Gamification: tokens for "safe bet" feature
} 