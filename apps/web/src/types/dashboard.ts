// Shared types for dashboard components

export interface Match {
    id: number;
    tournament: string;
    player1: { name: string; country: string; ranking: number; odds: number };
    player2: { name: string; country: string; ranking: number; odds: number };
    time: string;
    court: string;
    status: 'live' | 'upcoming' | 'finished';
    points: number;
    startTime: Date;
    lockTime: Date;
    isLocked: boolean;
}

export interface PredictionItem {
    matchId: number;
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