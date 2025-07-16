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

export interface UserStats {
    totalPoints: number;
    correctPicks: number;
    activeStreak: number;
    ranking: number;
} 