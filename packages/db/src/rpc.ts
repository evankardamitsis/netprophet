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
  /** votes closed with outcome 'none' because the match is cancelled or void */
  voided: number;
  /** true when the match is not confirmed yet (played, disputed, ...): nothing was changed */
  pending: boolean;
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
    /** both sides, as on match cards (added in M1; older cards may lack it) */
    sides?: { side: Side; players: FeedPlayer[] }[];
    /** what happened to the σερί: advanced, frozen (a freeze saved it), broken (lostStreak), idle */
    streak_event?: { kind: 'advanced' | 'frozen' | 'broken' | 'idle'; milestone?: number | null; lostStreak?: number; freezeUsed?: string };
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

/** One finished match on the Αποτελέσματα scoreboard (api.get_results, newest first). */
export interface ResultRow {
  match_id: string;
  sport_id: string;
  format: 'singles' | 'doubles' | 'mixed';
  starts_at: string;
  round: string | null;
  venue: string | null;
  area_id: string | null;
  /** null for friendlies */
  tournament: string | null;
  sides: { side: Side; players: FeedPlayer[] }[];
  winner_side: Side;
  /** winner first */
  sets: SetScore[];
  retired: boolean;
  walkover: boolean;
  /** vote counts; null when nobody voted */
  split: { side1: number; side2: number; total: number } | null;
  /** the winner had under the upset share of enough votes (same rule as resolve_match) */
  upset: boolean;
  /** the viewer's own vote; null when they did not vote */
  my: { pick: Side; outcome: 'correct' | 'wrong' | 'none' | null; points: number } | null;
}

/** Someone named in a match line («με Δημήτρη Γκότση»). name_forms holds the grammatical forms when known. */
export interface PlayerRef {
  id: string;
  first_name: string;
  surname: string;
  gender: 'm' | 'f' | null;
  name_forms: { accusative?: string; genitive?: string; vocative?: string } & Record<string, unknown>;
}

/** One row of the Παίκτες list (api.get_players_home / api.find_players). */
export interface PlayerCard extends PlayerRef {
  area_id: string | null;
  level_tier: number | null;
  level_direction: 'up' | 'same' | 'down' | null;
  is_followed: boolean;
  relation: 'known' | 'friend' | null;
  /** last 5 results, OLDEST first, as the prototype's «ΝΝΗΝΝ» */
  form: ('W' | 'L')[];
}

/** «Ποια είναι η παρέα σου;» (api.suggest_players): a list row plus how many follow them. */
export interface SuggestedPlayer extends PlayerCard {
  followers: number;
}

/** api.find_matching_players: unclaimed players whose name matches the user's, best first. */
export interface ClaimCandidate {
  id: string;
  first_name: string;
  surname: string;
  area_id: string | null;
  match_score: number;
}

export interface PlayersHome {
  total_players: number;
  /** friends who do not play today, then today's players; never the viewer's own player */
  players: PlayerCard[];
}

export interface PlayerMatchLine {
  match_id: string;
  starts_at: string;
  format: 'singles' | 'doubles' | 'mixed';
  partner: PlayerRef[];
  opponents: PlayerRef[];
}

/** One player's profile (api.get_player). */
export interface PlayerProfile extends PlayerCard {
  is_me: boolean;
  /** «Φέτος»: this Athens year */
  record_year: { w: number; l: number };
  /** «Τελευταία ματς», newest first, at most 5 */
  last_matches: (PlayerMatchLine & { won: boolean; score: string | null; retired: boolean; walkover: boolean })[];
  next_match: PlayerMatchLine | null;
}

/** Κατάταξη scopes in M1; leagues («Κατηγορία») come with M3. */
export type LadderScope = 'friends' | 'all';

export interface LadderRow {
  position: number;
  user_id: string;
  first_name: string | null;
  surname: string | null;
  display_name: string | null;
  points: number;
  last_point_at: string | null;
  is_me: boolean;
}

/** This month's Κατάταξη (api.get_ladder). */
export interface Ladder {
  scope: LadderScope;
  month_key: string;
  /** days until the month ends, Athens time; 1 on the last day */
  days_left: number;
  total: number;
  /** the top rows, then the viewer's own row if it is lower */
  rows: LadderRow[];
  me: {
    position: number;
    points: number;
    /** points to pass the row above (the gap plus one); null at the top */
    to_next: number | null;
    above: Pick<LadderRow, 'first_name' | 'surname' | 'display_name'> | null;
  } | null;
  streak: number;
  /** what the votes still waiting for a result pay if they come in */
  pending: number;
  /** open matches the viewer has not voted on */
  open_votes: number;
}

export interface WinLoss {
  w: number;
  l: number;
}

/** The numbers on Εγώ beyond get_me and get_player (api.get_me_page). */
export interface MePage {
  /** this Athens year, singles and doubles apart; null without a player */
  record_year: { singles: WinLoss; doubles: WinLoss } | null;
  /** results of your player ever */
  matches: number;
  votes: {
    resolved: number;
    correct: number;
    /** votes waiting for a result and what they pay if they come in */
    waiting: number;
    pending_points: number;
    /** open matches you have not voted on */
    open: number;
  };
  /** players you follow: how many, and the newest five */
  friends: { count: number; first: PlayerRef[] };
}

/** One player on the other side of your match (api.get_scout), from their results. */
export interface ScoutPlayer extends PlayerCard {
  hand: 'R' | 'L' | null;
  year: WinLoss;
  /** matches that went to a deciding set */
  deciding: WinLoss;
  /** sets decided in a tie-break */
  tiebreaks: WinLoss;
  /** you against them, from your side */
  h2h: WinLoss & { last: { won: boolean; score: string | null; starts_at: string } | null };
  /** players you both played: your record and theirs against each */
  common: (PlayerRef & { me: WinLoss; them: WinLoss })[];
  /** their record against the players you follow */
  known: WinLoss;
}

export type WinLossKey =
  | 'morning'
  | 'evening'
  | 'deciding'
  | 'lost_first'
  | 'tiebreaks'
  | 'lefties'
  | 'singles'
  | 'doubles'
  | 'tournament'
  | 'friendly';

/** «Πού κερδίζεις, πού χάνεις» (Pro, api.get_win_loss): your results split; empty splits are left out. */
export interface WinLossSplits {
  total: WinLoss | null;
  rows: (WinLoss & { key: WinLossKey })[];
}

/** «Ο αντίπαλος πριν το ματς» (Pro): only your own upcoming match. */
export interface Scout {
  match_id: string;
  starts_at: string | null;
  format: 'singles' | 'doubles' | 'mixed';
  partner: PlayerRef[];
  opponents: ScoutPlayer[];
}

/** The Pro screen (api.get_pro). Pro belongs to the account, whichever platform paid for it. */
export interface ProState {
  pro: boolean;
  current: { source: 'subscription' | 'gift' | 'promo' | 'migration'; starts_at: string; ends_at: string | null } | null;
  /** pressed «Γίνε μέλος» while checkout was not live */
  waitlisted: boolean;
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
