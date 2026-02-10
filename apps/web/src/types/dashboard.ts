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
  organizer?: string | null;
  surface: string;
  location: string | null;
  start_date?: string;
  end_date?: string;
  status?: string;
  matches_type?: string;
  is_team_tournament?: boolean;
}

export interface Category {
  id: string;
  name: string;
}

export interface Match {
  id: string;
  match_type: "singles" | "doubles";
  tournament_id: string | null;
  category_id: string | null;
  player_a_id: string | null;
  player_a1_id: string | null;
  player_a2_id: string | null;
  player_b_id: string | null;
  player_b1_id: string | null;
  player_b2_id: string | null;
  winner_id: string | null;
  status: string;
  round:
    | "Round of 64"
    | "Round of 32"
    | "Round of 16"
    | "Quarterfinals"
    | "Semifinals"
    | "Finals"
    | null;
  start_time: string | null;
  lock_time: string | null;
  odds_a: number | null;
  odds_b: number | null;
  web_synced: boolean;
  locked: boolean | null;
  updated_at: string | null;
  tournaments?: Tournament;
  tournament_categories?: Category;
  player_a?: Player;
  player_b?: Player;
  // Doubles players
  player_a1?: Player;
  player_a2?: Player;
  player_b1?: Player;
  player_b2?: Player;
  // Computed properties for web app compatibility
  tournament: string;
  player1: { name: string; odds: number; teamName?: string | null };
  player2: { name: string; odds: number; teamName?: string | null };
  // For doubles matches, these represent teams
  team1?: { name: string; odds: number; players: Player[] };
  team2?: { name: string; odds: number; players: Player[] };
  time: string;
  status_display: "live" | "upcoming" | "finished";
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
