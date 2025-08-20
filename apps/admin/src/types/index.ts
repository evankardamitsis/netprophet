// Tournament Types
export interface Tournament {
    id: string;
    name: string;
    description: string | null;
    start_date: string;
    end_date: string;
    status: string;
    surface: string;
    location: string | null;
    prize_pool: number | null;
    entry_fee: number;
    max_participants: number | null;
    current_participants: number;
    tournament_type: string;
    format: string;
    matches_type: string;
    tournament_categories?: Array<{
        id: string;
        name: string;
    }>;
}

// Match Types
export interface Match {
    id: string;
    player_a_id: string | null;
    player_b_id: string | null;
    tournament_id: string | null;
    category_id: string | null;
    round: string | null;
    court_number: number | null;
    status: string;
    start_time: string | null;
    lock_time: string | null;
    points_value: number;
    odds_a: number | null;
    odds_b: number | null;
    winner_id: string | null;
    web_synced: boolean;
    tournaments?: {
        id: string;
        name: string;
        surface: string;
        location: string | null;
    };
    tournament_categories?: {
        id: string;
        name: string;
    };
    player_a?: {
        id: string;
        first_name: string;
        last_name: string;
        ntrp_rating: number;
        surface_preference: string;
    };
    player_b?: {
        id: string;
        first_name: string;
        last_name: string;
        ntrp_rating: number;
        surface_preference: string;
    };
}

// Category Types
export interface Category {
    id: string;
    tournament_id: string;
    name: string;
    description: string | null;
    age_min: number | null;
    age_max: number | null;
    skill_level_min: string | null;
    skill_level_max: string | null;
    gender: string | null;
    max_participants: number | null;
    current_participants: number;
    entry_fee: number;
    prize_pool: number | null;
    created_at: string;
    updated_at: string;
}

// Player Types
export interface Player {
    id: string;
    firstName: string;
    lastName: string;
    ntrpRating: number;
    wins: number;
    losses: number;
    last5: string[];
    currentStreak: number;
    streakType: string;
    surfacePreference: string;
    surfaceWinRates?: any;
    aggressiveness: number;
    stamina: number;
    consistency: number;
    age: number;
    hand: string;
    notes?: string;
    lastMatchDate?: string;
    fatigueLevel?: number;
    injuryStatus?: string;
    seasonalForm?: any;
}

// Participant Types
export interface Participant {
    id: string;
    player_id: string;
    category_id: string | null;
    status: string;
    seed_position: number | null;
    final_position: number | null;
    points_earned: number;
}

// Profile Types
export interface Profile {
    id: string;
    email: string;
    username?: string | null;
    avatar_url?: string | null;
    is_admin: boolean;
    suspended?: boolean;
    created_at: string;
}

// Form Data Types
export interface MatchFormData {
    player_a_id: string;
    player_b_id: string;
    tournament_id: string;
    category_id: string;
    round: string;
    status: string;
    start_time: string;
    lock_time: string;
}

export interface TournamentFormData {
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    status: string;
    surface: string;
    location: string;
    prize_pool: string;
    entry_fee: string;
    max_participants: string;
    tournament_type: string;
    format: string;
    matches_type: string;
}

export interface CategoryFormData {
    name: string;
    description: string;
    age_min: string;
    age_max: string;
    skill_level_min: string;
    skill_level_max: string;
    gender: string;
    max_participants: string;
    entry_fee: string;
    prize_pool: string;
} 