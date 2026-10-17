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
  gender?: 'm' | 'f' | null;
  /** the drawn avatar: a key (m1 to f6), 'default' (the app draws the default), or null for initials (no account) */
  avatar?: string | null;
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
  /** the category, «Μ 40+», when the match belongs to an event */
  level?: string | null;
  /** MS, WS, MD, WD, XD */
  discipline?: string | null;
  sides: { side: Side; players: FeedPlayer[] }[];
  in_circle: boolean;
  my_vote: Side | null;
  /** started (or locked) and waiting for its result: shown without voting */
  closed?: boolean;
  /** after the user voted, and on a closed match */
  split: VoteSplit | null;
  /** the old starts_at, when the match moved to a new day in the last 3 days */
  moved_from?: string | null;
  /** the club it is played at, when the source names it */
  club?: string | null;
  /** the club's surface, else the tournament's */
  surface?: string | null;
}

/** A match put off in the last 2 days that the user voted on or whose players they follow. Not votable. */
export interface FeedPostponedCard {
  kind: 'postponed';
  match_id: string;
  format: 'singles' | 'doubles' | 'mixed';
  /** the original time */
  starts_at: string | null;
  tournament: { id: string; name: string } | null;
  sides: { side: Side; players: FeedPlayer[] }[];
  my_vote: Side | null;
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
  /** a picture wins; else the app draws the art key */
  image_url: string | null;
  art: string | null;
}

export type FeedItem = FeedResultCard | FeedMatchCard | FeedPostponedCard | FeedSponsoredCard;

export interface GetFeedResult {
  items: FeedItem[];
  count: number;
  /** unseen celebrations, oldest first; they play after the result cards */
  celebrations?: Celebration[];
}

/** what a finished quest gives: a cosmetic the player does not own yet, else a badge bonus (never points) */
export type QuestReward =
  | { kind: 'cosmetic'; key: string; category: 'frame' | 'background' }
  | { kind: 'badge'; key: string; amount: number };

export interface QuestRow {
  key: string;
  target: number;
  progress: number;
  done: boolean;
  reward: QuestReward;
}

/** api.get_quests: today's quests and this week's */
export interface GetQuestsResult {
  daily: QuestRow[];
  weekly: QuestRow[];
}

/** «Οι ερωτήσεις της ημέρας»: a player named on a card; the text tokens {p1}, {p1.o}, {p1.ton}... refer to players[0] */
export interface QuizPlayer {
  id: string;
  first_name: string;
  surname: string;
  gender: 'm' | 'f' | null;
}

/** s Σενάριο, c Διάλεξε έναν, q Ποιος είναι;, o Άποψη, d dynamic (Πριν το ματς, Μετά το αποτέλεσμα, Εβδομαδιαίο) */
export type QuizFamily = 's' | 'c' | 'q' | 'o' | 'd';

export interface QuizCard {
  id: string;
  position: number;
  family: QuizFamily;
  content: {
    tag: string;
    q: string;
    options: { label: string }[];
    /** only on a 'q' card */
    clues?: string[];
    /** 0-based index of the right option: «Ποιος είναι;» and the dynamic cards with an answer */
    right?: number;
    /** what happened, shown after the pick on a card with an answer («{p1.o} κέρδισε 6-3, 6-4.») */
    reveal?: string;
    players: QuizPlayer[];
    /** a dynamic card about this week («αυτή τη βδομάδα») */
    week?: boolean;
    /** the match a dynamic card asks about */
    match_id?: string | null;
  };
  /** 1-based, null before the player answers */
  my_option: number | null;
  /** percent per option; null while fewer than 5 answered or before the player answers */
  split: number[] | null;
}

/** api.get_quiz: today's set, built on first open after 09:00 Athens */
export interface GetQuizResult {
  quiz_day: string;
  required: 6;
  pro: boolean;
  awarded: boolean;
  next_at: string;
  answered: number;
  cards: QuizCard[];
}

/** api.answer_card; errors: already_answered (23505), invalid_option (22023), card_expired (55000) */
export interface AnswerCardResult {
  option: number;
  /** 0-based, only for a 'q' card */
  right: number | null;
  split: number[] | null;
  answered: number;
  /** 30 on the sixth answer of the day, else 0 */
  awarded: number;
}

/** one of the 16 badges: the counter, its tier (0 locked, 3 gold), the three thresholds, and whether it can be worn on the card */
export interface BadgeRow {
  key: string;
  counter: number;
  tier: 0 | 1 | 2 | 3;
  thresholds: [number, number, number];
  on_card: boolean;
}

/** api.get_badges: every badge in order, and the one worn on the card (null when none) */
export interface GetBadgesResult {
  badges: BadgeRow[];
  worn: string | null;
}

export type LookCategory = 'frame' | 'background' | 'kit' | 'gear' | 'win_effect';
export type LookKind = 'free' | 'earned' | 'buy' | 'pack';

/** one cosmetic item as it is to me (api.get_look) */
export interface LookItem {
  key: string;
  category: LookCategory;
  name_el: string;
  name_en: string;
  kind: LookKind;
  price_eur: number | null;
  /** «Το κερδίζεις με 7 σωστές στη σειρά», for earned items */
  earn_rule: string | null;
  owned: boolean;
  source: string | null;
  equipped: boolean;
}

/** api.get_look / api.equip_item: the catalogue and what I wear (no frame or background = null; the kit is always set) */
export interface GetLookResult {
  items: LookItem[];
  equipped: { frame: string | null; background: string | null; kit: string; gear?: string | null; win_effect?: string | null };
}

/** api.get_my_level: the back of the Εγώ card. The exact value and the gap to the next half are Pro only (null otherwise). */
export interface GetMyLevelResult {
  claimed: boolean;
  pro: boolean;
  status?: 'pending' | 'active';
  tier?: number | null;
  direction?: 'up' | 'same' | 'down';
  matches?: number;
  votes?: number;
  value?: number | null;
  week_ago?: number | null;
  to_next?: number | null;
  next_tier?: number | null;
}

export interface StreakCelebrationPayload {
  type: 'streak_milestone';
  streak: number;
  match_id: string;
  /** what this milestone actually gave */
  reward?: { freeze: boolean; frame: string | null; gear?: string | null };
}

export interface QuestCelebrationPayload {
  type: 'quest';
  quest: string;
  period: string;
  reward: QuestReward;
}

/** a badge reached a tier; `new` when it is the first tier */
export interface BadgeCelebrationPayload {
  type: 'badge';
  badge: string;
  tier: 1 | 2 | 3;
  new: boolean;
}

/** an unlock-ladder step opened; `key` is the step id (packages/core UNLOCK_STEPS) */
export interface UnlockCelebrationPayload {
  type: 'unlock';
  key: string;
}

export type LeagueTier = 'bronze' | 'silver' | 'gold';

/** the month closed (api.admin_league_close): where the viewer finished and where they play next month */
export interface LeagueCelebrationPayload {
  type: 'league';
  month: string;
  tier: LeagueTier;
  position: number;
  movement: 'promote' | 'relegate' | 'stay';
  next_tier: LeagueTier;
  /** top 3 with points: the Κορυφαίος του μήνα frame and badge */
  award: boolean;
}

/** a user's game level (core gameLevel): the level, points inside it, its span and what is missing for the next */
export interface GameLevelInfo {
  level: number;
  into: number;
  span: number;
  next: number;
}

/** total points crossed into a new game level («Ανέβηκες level!»), once per level */
export interface LevelCelebrationPayload {
  type: 'level';
  level: number;
}

/** a full-screen moment (prototype celOn): a σερί milestone, a finished quest, a badge tier, an unlock or the month's league result */
export interface Celebration<
  P = StreakCelebrationPayload | QuestCelebrationPayload | BadgeCelebrationPayload | UnlockCelebrationPayload | LeagueCelebrationPayload | LevelCelebrationPayload,
> {
  id: string;
  created_at: string;
  payload: P;
}

export type StreakCelebration = Celebration<StreakCelebrationPayload>;
export type QuestCelebration = Celebration<QuestCelebrationPayload>;
export type BadgeCelebration = Celebration<BadgeCelebrationPayload>;
export type UnlockCelebration = Celebration<UnlockCelebrationPayload>;
export type LeagueCelebration = Celebration<LeagueCelebrationPayload>;
export type LevelCelebration = Celebration<LevelCelebrationPayload>;

/** One finished match on the Αποτελέσματα scoreboard (api.get_results, newest first). */
/** a tournament with results lately, for the filter on Αποτελέσματα; yours first */
export interface ResultsTournament {
  id: string;
  name: string;
  results: number;
}

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
  tournament_id?: string | null;
  /** the category, «Μ 40+», when the match belongs to an event */
  level?: string | null;
  /** MS, WS, MD, WD, XD */
  discipline?: string | null;
  sides: { side: Side; players: FeedPlayer[] }[];
  winner_side: Side;
  /** winner first; empty when only the sets are known (player-logged), see score_summary */
  sets: SetScore[];
  /** «2-1», sets won by the winner first */
  score_summary?: string | null;
  retired: boolean;
  walkover: boolean;
  /** vote counts; null when nobody voted */
  split: { side1: number; side2: number; total: number } | null;
  /** the winner had under the upset share of enough votes (same rule as resolve_match) */
  upset: boolean;
  /** the viewer's own vote; null when they did not vote */
  my: { pick: Side; outcome: 'correct' | 'wrong' | 'none' | null; points: number } | null;
  /** the two chips on the card, their counts and the viewer's pick */
  reactions?: Reactions;
  /** «Πες κάτι στον …»: an opponent the viewer has not thanked, or a player they follow; null when nobody */
  kudo_to?: { player_id: string; first_name: string; gender: 'm' | 'f' | null } | null;
}

export interface Reactions {
  options: { key: string; label: string }[];
  counts: Record<string, number>;
  mine: string | null;
}

/** a line of «Πες μια καλή κουβέντα» in its three forms (the app picks by gender, plural for doubles) */
export interface KudoOption {
  key: string;
  forms: { m: string; f: string; plural: string };
}

/** «Τι λένε για σένα» */
export interface ReceivedKudo extends KudoOption {
  doubles_only: boolean;
  n: number;
}

/** «Πώς παίζει» on a profile (api.get_traits, vote_trait, suggest_trait) */
export interface TraitRow {
  id: string;
  /** the Greek phrase in both forms; pick by the player's gender */
  label_el: { m: string; f: string };
  label_en: string;
  /** null on my own pending phrases */
  count: number | null;
  mine: boolean;
  pending: boolean;
}

export interface PlayerTraits {
  player_id: string;
  gender: 'm' | 'f' | null;
  is_me: boolean;
  can_vote: boolean;
  voters: number;
  traits: TraitRow[];
}

/** «Πώς σε βλέπουν» on Εγώ (api.get_my_traits): the top three, counts for Pro only */
export interface MyTraits {
  pro: boolean;
  gender: 'm' | 'f' | null;
  voters: number;
  traits: { id: string; label_el: { m: string; f: string }; label_en: string; count: number | null; share: number }[];
}

/** «Αναφορά» */
export type ReportReason = 'wrong_result' | 'never_played' | 'offensive' | 'fake' | 'other';

/** Εγώ › «Μπλοκαρισμένοι» */
export interface BlockedUser {
  user_id: string;
  first_name: string | null;
  surname: string | null;
}

/** Someone named in a match line («με Δημήτρη Γκότση»). name_forms holds the grammatical forms when known. */
export interface PlayerRef {
  id: string;
  first_name: string;
  surname: string;
  gender: 'm' | 'f' | null;
  name_forms: { accusative?: string; genitive?: string; vocative?: string } & Record<string, unknown>;
  /** the drawn avatar: a key, 'default', or null for initials (a roster player without an account) */
  avatar?: string | null;
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
  /** the category, «Μ 40+», when the match belongs to an event */
  level?: string | null;
  /** MS, WS, MD, WD, XD */
  discipline?: string | null;
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

/** Κατάταξη scopes: «Κατηγορία» (my league group), «Όσοι ξέρεις», «Όλη η Αττική». */
export type LadderScope = 'league' | 'friends' | 'all';

/** my league group this month (null when I have none yet) */
export interface LadderLeague {
  tier: LeagueTier;
  group_no: number;
  size: number;
  promote_top: 5;
  relegate_from: 16;
  award_top: 3;
}

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
  /** true when I am in a league group this month */
  has_league: boolean;
  league: LadderLeague | null;
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

/** a person on a season recap or a win card: the name only, never a level */
export interface SeasonPerson {
  first_name: string;
  surname: string;
  gender: 'm' | 'f' | null;
}

/** One month of «Η σεζόν σου» (api.my_season). Free gets the first four; the rest are Pro (missing for free). */
export interface SeasonNumbers {
  played: number;
  won: number;
  lost: number;
  points: number;
  sets_won?: number;
  sets_lost?: number;
  /** the longest run of wins in a row */
  win_run?: number;
  /** matches that went to a deciding set */
  deciding?: WinLoss;
  /** tie-break sets */
  tiebreaks?: WinLoss;
  tournaments?: number;
  /** the best σερί reached this month */
  best_streak?: number;
  /** the win over the strongest opponent (no level is ever sent) */
  best_win?: {
    match_id: string;
    starts_at: string;
    sets: SetScore[];
    score_summary: string | null;
    opponents: SeasonPerson[];
    tournament: string | null;
  } | null;
  /** your Ladder group this month: the final rank once the month closed */
  ladder?: { tier: LeagueTier; position: number | null; size: number; closed: boolean } | null;
}

/** «Η σεζόν σου» (api.my_season): a month and, with Pro, the month before for the arrows. */
export interface MySeason {
  /** '2026-10' (Athens) */
  month: string;
  prev_month: string;
  pro: boolean;
  has_player: boolean;
  now: SeasonNumbers;
  /** null without Pro */
  prev: SeasonNumbers | null;
  /** the first win of the month: its card is free for everyone */
  free_card: string | null;
}

/** A share card of one of your own wins (api.win_card). Pro: every win; free: the first win of each month. */
export interface WinCard {
  match_id: string;
  starts_at: string;
  format: MatchFormat;
  tournament: string | null;
  /** the event, «Ανδρών Α» */
  category: string | null;
  round: string | null;
  /** winner first, so yours first */
  sets: SetScore[];
  score_summary: string | null;
  retired: boolean;
  me: SeasonPerson[];
  opponents: SeasonPerson[];
  pro: boolean;
  /** this was the month's free card */
  free: boolean;
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

/** A tournament for the «+ Ματς» picker (api.list_tournaments: active, not long finished). */
export interface PublicTournament {
  id: string;
  name: string;
  venue: string | null;
  area_id: string | null;
  starts_on: string | null;
  ends_on: string | null;
}

/** Someone in the «+ Ματς» form: a roster player, or a new name (a pending player). */
export type LogPerson = { player_id: string } | { new: { first: string; surname: string } };

export type MatchFormat = 'singles' | 'doubles' | 'mixed';

export interface LogMatchInput {
  mode: 'played' | 'soon';
  /** «2026-10-12», Athens day */
  date: string;
  format: MatchFormat;
  tournament_id?: string | null;
  /** «Άλλο»: a tournament we do not have yet, for the moderation queue */
  tournament_suggestion?: string | null;
  partner?: LogPerson;
  opponents?: LogPerson[];
  result?: { won: boolean; sets: '2-0' | '2-1' };
  /** «Αυτό είναι το ματς σου;»: add the result to this match instead of a new one */
  match_id?: string;
}

/** A match of yours with the same people, a day either way, no result yet (api.find_my_matches). */
export interface MyMatchCandidate {
  match_id: string;
  starts_at: string;
  format: MatchFormat;
  tournament: string | null;
  sides: { side: Side; players: FeedPlayer[] }[];
}

/** A player-logged match against your player, waiting for your answer (api.get_confirmations). */
export interface PendingConfirmation {
  match_id: string;
  format: MatchFormat;
  starts_at: string;
  tournament: string | null;
  sides: { side: Side; players: FeedPlayer[] }[];
  my_side: Side;
  winner_side: Side;
  /** «2-1», winner first */
  score: string | null;
  logged_by: { first_name: string | null; surname: string | null } | null;
}

/** «Έτσι έγινε», a fix from your side, or «Δεν έπαιξα εγώ» */
export type ConfirmationAnswer = { answer: 'yes' } | { answer: 'fix'; fix: { winner: 'me' | 'them'; sets: '2-0' | '2-1' } } | { answer: 'not_me' };

/** a link the logger sends to an opponent not in the app (api.match_links) */
export interface MatchLink {
  player_id: string;
  first_name: string;
  surname: string;
  gender: 'm' | 'f' | null;
  token: string;
}

/** «Πες κι εσύ μια καλή κουβέντα» */
export type LinkKudo = 'serve' | 'backhand' | 'calm' | 'feet' | 'fair_play' | 'company';

/** what /m/<token> shows: the match from the opponent's side (api.get_match_link, no account needed) */
export interface MatchLinkView {
  match_id: string;
  format: MatchFormat;
  starts_at: string;
  tournament: string | null;
  sides: { side: Side; players: FeedPlayer[] }[];
  my_side: Side;
  winner_side: Side | null;
  /** «2-1», winner first */
  score: string | null;
  player: { id: string; first_name: string; surname: string; gender: 'm' | 'f' | null; hidden: boolean; claimed: boolean };
  logged_by: { player_id: string; first_name: string; surname: string; gender: 'm' | 'f' | null } | null;
  state: 'pending' | 'confirmed' | 'disputed' | 'not_me';
  kudo: LinkKudo | null;
  expires_at: string;
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
    /** the drawn avatar picked (m1 to m6, f1 to f6); null or missing: the default for the account */
    avatar?: string | null;
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
    /** the game level from total points (core gameLevel); missing on servers before 14 Oct 2026 */
    level?: GameLevelInfo;
  };
  pro: boolean;
  unlocks: string[];
  inbox_unseen: number;
  circle_count: number;
  /** the newest result of the user's sport in the last two weeks: the dot on «Αποτελέσματα» */
  results_at?: string | null;
}

/* Tournaments page (api.get_tournaments, api.get_tournament): «Τα τουρνουά σου» */

export type TournamentState = 'ongoing' | 'upcoming' | 'done';

/** One match as the page shows it (core.tournament_match_json) */
export interface TournamentMatch {
  match_id: string;
  starts_at: string | null;
  format: 'singles' | 'doubles' | 'mixed';
  status: string;
  /** the category, «Μ 40+» */
  level: string | null;
  /** MS, WS, MD, WD, XD */
  discipline: string | null;
  round: string | null;
  sides: { side: Side; players: FeedPlayer[] }[];
  winner_side: Side | null;
  sets: SetScore[] | null;
  retired: boolean | null;
  walkover: boolean | null;
  /** put off, no new time yet */
  postponed?: boolean;
  /** the old starts_at, when the match moved to another time or day */
  moved_from?: string | null;
  /** the club and court it is played at, when the source names them */
  club?: string | null;
  court?: string | null;
  /** the club's surface, else the tournament's */
  surface?: string | null;
}

export interface TournamentItem {
  id: string;
  name: string;
  venue: string | null;
  area_id: string | null;
  surface: string | null;
  starts_on: string | null;
  ends_on: string | null;
  entry_deadline: string | null;
  level_min: number | null;
  level_max: number | null;
  state: TournamentState;
  /** number of draws (brackets) */
  draws: number;
  matches: number;
  /** matches today */
  today: number;
  in_it: boolean;
}

/** api.get_tournaments. `mine` is null unless you have Pro (and a claimed player). */
export interface GetTournamentsResult {
  pro: boolean;
  items: TournamentItem[];
  mine: (TournamentMatch & { tournament_id: string; tournament: string })[] | null;
}

export interface DrawEntrantRow {
  pos: number;
  raw: string;
  seed: number | null;
  bye: boolean;
  players: { raw: string; player_id: string | null }[];
}

export interface DrawMatchRow {
  round: number;
  slot: number;
  side1: string | null;
  side2: string | null;
  winner: 1 | 2 | null;
  bye: boolean;
  scoreRaw: string;
  walkover: boolean;
  retired: boolean;
  /** «ΔΕΥ 18.30» as written by the organiser */
  when: string;
  /** the round's last day, «2026-10-14» */
  deadline: string | null;
}

/** a round robin group (api.get_tournament, draws[].groups) */
export interface DrawGroupRow {
  /** «Όμιλος 1» */
  name: string;
  teams: { pos: number; raw: string; people: { surname: string; first: string; key: string }[] }[];
  matches: {
    /** positions of the two teams */
    a: number;
    b: number;
    scoreRaw: string;
    /** games per set, team a first */
    sets: { g: [number, number]; tb: boolean }[];
    /** 1 = team a */
    winner: 1 | 2 | null;
    walkover: boolean;
  }[];
  standings: { pos: number; won: number; played: number }[];
}

export interface TournamentDraw {
  /** the sheet's tab, «Μ 40+», «MD MASTER» */
  tab: string;
  title: string;
  discipline: string;
  level: string;
  format: 'knockout' | 'round_robin';
  size: number;
  updated_at: string;
  entrants: DrawEntrantRow[];
  rounds: DrawMatchRow[][];
  /** round robin only */
  groups?: DrawGroupRow[];
}

/** api.get_tournament */
export interface GetTournamentResult {
  id: string;
  name: string;
  venue: string | null;
  area_id: string | null;
  surface: string | null;
  starts_on: string | null;
  ends_on: string | null;
  entry_deadline: string | null;
  state: TournamentState;
  /** your player id, when you have claimed one */
  me: string | null;
  draws: TournamentDraw[];
  /** raw names in the draws that belong to hidden players or minors */
  masked: string[];
  days: { date: string; matches: TournamentMatch[] }[];
}
