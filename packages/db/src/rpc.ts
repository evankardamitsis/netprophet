/**
 * Shapes of the jsonb payloads returned by the api RPCs. The generated `Database` type can only say `Json`
 * for these, so they are written by hand next to the SQL they describe (supabase-v2/migrations/*_rpc_game.sql).
 */

export type Side = 1 | 2;

export interface VoteSplit {
  total: number;
  side1: number;
  side2: number;
  pct1: number;
  pct2: number;
}

export interface CastVoteResult {
  match_id: string;
  side: Side;
  /** true when this exact vote already existed (retry or double tap): nothing changed */
  replayed: boolean;
  split: VoteSplit;
}

export interface ResolveMatchResult {
  match_id: string;
  resolved: number;
  correct: number;
  wrong: number;
  freezes_used: number;
  points_awarded: number;
  upset: boolean;
  already_resolved: number;
}

export interface SetScore {
  /** games won by the match winner in this set */
  w: number;
  /** games won by the loser */
  l: number;
  tb?: [number, number];
  /** super tie-break played as the deciding set */
  stb?: boolean;
}

export interface FeedPlayer {
  id: string;
  first_name: string;
  surname: string;
  photo_path: string | null;
  area_id: string | null;
  level_tier: number | null;
  level_direction: 'up' | 'same' | 'down' | null;
}

export interface FeedResultCard {
  kind: 'result';
  id: string;
  created_at: string;
  payload: {
    match_id: string;
    vote_id: string;
    outcome: 'correct' | 'wrong';
    points: number;
    upset: boolean;
    streak: number;
    freeze_used: boolean;
    winner_side: Side;
    score: string | null;
    sets: SetScore[];
  };
}

export interface FeedMatchCard {
  kind: 'match';
  match_id: string;
  format: 'singles' | 'doubles' | 'mixed';
  starts_at: string | null;
  venue: string | null;
  round: string | null;
  status: string;
  tournament: { id: string; name: string } | null;
  sides: { side: Side; players: FeedPlayer[] }[];
  in_circle: boolean;
  my_vote: Side | null;
  /** only present after the user voted */
  split: VoteSplit | null;
}

export interface FeedSponsoredCard {
  kind: 'sponsored';
  id: string;
  /** always «Χορηγούμενο» */
  label: string;
  sponsor: string;
  title: string;
  subtitle: string | null;
  cta_url: string | null;
}

export type FeedItem = FeedResultCard | FeedMatchCard | FeedSponsoredCard;

export interface GetFeedResult {
  items: FeedItem[];
  count: number;
}

export interface MeResult {
  user_id: string;
  profile: {
    first_name: string | null;
    surname: string | null;
    display_name: string | null;
    gender: 'm' | 'f' | null;
    area_id: string | null;
    area_ids: string[];
    primary_sport: string;
    hand: 'R' | 'L' | null;
    locale: 'el' | 'en';
    tz: string;
    hidden: boolean;
    role: 'user' | 'editor' | 'admin';
    onboarding_state: Record<string, unknown>;
    claim_status: 'none' | 'claimed' | 'skipped' | 'creation_requested';
  };
  player: {
    id: string;
    first_name: string;
    surname: string;
    photo_path: string | null;
    level_tier: number | null;
    level_direction: 'up' | 'same' | 'down' | null;
    level_status: 'pending' | 'active' | null;
    /** Pro only; null for free users */
    level_value: number | null;
    record: unknown;
    form: unknown;
  } | null;
  game: {
    total_points: number;
    month_points: number;
    streak: number;
    streak_best: number;
    chain: number;
    votes_cast: number;
    votes_correct: number;
    votes_to_next_free_freeze: number;
    freezes: { free: number; paid: number; max: number };
  };
  pro: boolean;
  unlocks: string[];
  inbox_unseen: number;
  circle_count: number;
}
