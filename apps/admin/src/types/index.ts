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
  entry_fee: number | null;
  max_participants: number | null;
  current_participants: number | null;
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
  status: string;
  start_time: string | null;
  lock_time: string | null;
  points_value: number | null;
  odds_a: number | null;
  odds_b: number | null;
  winner_id: string | null;
  web_synced: boolean | null;
  locked: boolean | null;
  updated_at: string | null;
  tournaments?: {
    id: string;
    name: string;
    surface: string;
    location: string | null;
  } | null;
  tournament_categories?: {
    id: string;
    name: string;
  } | null;
  player_a?: {
    id: string;
    first_name: string;
    last_name: string;
    ntrp_rating: number;
    surface_preference: string;
  } | null;
  player_b?: {
    id: string;
    first_name: string;
    last_name: string;
    ntrp_rating: number;
    surface_preference: string;
  } | null;
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
  current_participants: number | null;
  entry_fee: number | null;
  prize_pool: number | null;
  created_at: string | null;
  updated_at: string | null;
}

// Tournament Participant Types
export interface TournamentParticipant {
  id: string;
  tournament_id: string;
  category_id: string | null;
  player_id: string;
  registration_date: string | null;
  status: string;
  seed_position: number | null;
  final_position: number | null;
  points_earned: number | null;
  players?: {
    id: string;
    first_name: string;
    last_name: string;
    ntrp_rating: number;
    age: number;
    surface_preference: string;
  } | null;
  tournament_categories?: {
    id: string;
    name: string;
  } | null;
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
  is_admin: boolean | null;
  created_at: string | null;
  balance?: number | null;
}

// Match Results Types
export interface MatchResult {
  id: string;
  match_id: string;
  winner_id: string;
  match_result: string;
  set1_score: string | null;
  set2_score: string | null;
  set3_score: string | null;
  set4_score: string | null;
  set5_score: string | null;
  set1_winner_id: string | null;
  set2_winner_id: string | null;
  set3_winner_id: string | null;
  set4_winner_id: string | null;
  set5_winner_id: string | null;
  set1_tiebreak_score: string | null;
  set2_tiebreak_score: string | null;
  set3_tiebreak_score: string | null;
  set4_tiebreak_score: string | null;
  set5_tiebreak_score: string | null;
  super_tiebreak_score: string | null;
  super_tiebreak_winner_id: string | null;
  total_games: number | null;
  aces_leader_id: string | null;
  double_faults_count: number | null;
  break_points_count: number | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface MatchResultWithDetails extends MatchResult {
  match: {
    id: string;
    player_a_id: string;
    player_b_id: string;
    tournaments: {
      matches_type: string;
    } | null;
  } | null;
  winner: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  set1_winner: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  set2_winner: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  set3_winner: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  set4_winner: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  set5_winner: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  super_tiebreak_winner: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  aces_leader: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
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
