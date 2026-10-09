/** Domain types. Sport-generic: nothing here assumes tennis. Time fields are ISO 8601 instants. */
import type { Instant } from './time';

export type { Instant } from './time';
export type SportId = string;
export type Locale = 'el' | 'en';
export type Gender = 'm' | 'f';

// ---- Sport, players, matches ----

export type MatchType = 'singles' | 'doubles' | 'mixed';

export interface Sport {
  id: SportId;
  name: string;
  formats: readonly MatchType[];
}

/** Players per side: 1 for singles, 2 for doubles and mixed. */
export function sideSizeFor(type: MatchType): 1 | 2 {
  return type === 'singles' ? 1 : 2;
}

export interface Player {
  id: string;
  firstName: string;
  surname: string;
  gender: Gender;
  sport: SportId;
  area: string | null;
  claimed: boolean;
  hidden: boolean;
  isMinor: boolean;
}

export type SideIndex = 0 | 1;

export interface Side {
  playerIds: readonly string[];
}

export type MatchStatus =
  | 'announced'
  | 'scheduled'
  | 'played'
  | 'confirmed'
  | 'disputed'
  | 'cancelled'
  | 'void';

/**
 * Sport-generic score. `totals` is [winner, loser] in the sport's main unit
 * (sets for tennis, padel; periods or points elsewhere). `periods` is the optional per-period
 * detail, each entry [winnerSideScore, loserSideScore], always from the match winner's side.
 */
export interface MatchScore {
  totals: readonly [number, number];
  periods?: ReadonlyArray<readonly [number, number]>;
}

export interface MatchResult {
  winnerSide: SideIndex;
  score: MatchScore | null;
}

export interface Match {
  id: string;
  sport: SportId;
  type: MatchType;
  sides: readonly [Side, Side];
  status: MatchStatus;
  startsAt: Instant;
  /** Votes close at this instant (inclusive of the instant itself: a vote at lockAt is rejected). Null means `startsAt`. */
  lockAt: Instant | null;
  tournamentId: string | null;
  result: MatchResult | null;
}

// ---- Votes and points ----

export type VoteSource = 'match' | 'quiz' | 'dynamic';
export type VoteOutcome = 'correct' | 'wrong' | 'none';

export interface Vote {
  id: string;
  userId: string;
  source: VoteSource;
  matchId: string | null;
  cardId: string | null;
  /** Index of the chosen side (0 or 1) for match votes. */
  optionIndex: number;
  createdAt: Instant;
  resolvedAt: Instant | null;
  outcome: VoteOutcome | null;
  isUpsetCall: boolean;
  points: number;
}

export type PointsReason = 'vote_correct' | 'vote_upset' | 'chain_bonus' | 'daily_quiz' | 'correction';

/** Ledger row. `key` is the idempotency key: a second insert with the same key is a no-op. Money never produces one. */
export interface PointsEvent {
  key: string;
  userId: string;
  delta: number;
  reason: PointsReason;
  at: Instant;
  /** `YYYY-MM` in Europe/Athens, taken from `at`. */
  monthKey: string;
  refId: string | null;
}

// ---- Streak ----

export type FreezeKind = 'free' | 'paid';

export interface StreakState {
  /** Consecutive correct votes (σερί). */
  current: number;
  /** Personal record (ΠΡ). */
  best: number;
  /** Bonus chain: consecutive correct votes for the +5 bonus. Equals `current` unless a paid freeze restarted it. */
  chain: number;
  freezes: readonly FreezeKind[];
  votesSinceFreeFreeze: number;
  firstFreeGranted: boolean;
  brokeAt: Instant | null;
}

// ---- Quests, badges, unlocks ----

export type QuestWindow = 'daily' | 'weekly' | 'lifetime';

export type QuestReward = {
  /** Frame or background. Granted if not owned yet. */
  cosmeticId: string | null;
  /** Fallback when the cosmetic is already owned (or null): a badge counter bonus. Never points. */
  badgeId: string;
  badgeAmount: number;
};

export type QuestEventType =
  | 'vote_card'
  | 'vote_match'
  | 'kudos_given'
  | 'match_logged'
  | 'active_day'
  | 'friend_invited'
  | 'friend_activated';

export interface QuestEvent {
  type: QuestEventType;
  at: Instant;
}

export type QuestTrigger = {
  event: QuestEventType;
  /** inc: +1 per event. distinct_day: +1 per different Athens day. at_least: progress becomes max(progress, value). */
  mode: 'inc' | 'distinct_day' | 'at_least';
  value?: number;
};

export interface QuestDef {
  id: string;
  window: QuestWindow;
  target: number;
  triggers: readonly QuestTrigger[];
  reward: QuestReward;
}

export interface QuestProgress {
  questId: string;
  /** Daily: `YYYY-MM-DD`. Weekly: the Monday `YYYY-MM-DD`. Lifetime: `all`. */
  windowKey: string;
  current: number;
  /** Day keys already counted (for distinct_day quests). */
  days: readonly string[];
  doneAt: Instant | null;
  rewardGranted: boolean;
}

export interface BadgeDef {
  id: string;
  /** Counter the badge reads. */
  unit: string;
  /** Thresholds for tiers 1, 2, 3. The third tier grants Frame Level. */
  thresholds: readonly [number, number, number];
  hasCard: boolean;
}

export interface UnlockCounters {
  votesCast: number;
  votesResolved: number;
  correctVotes: number;
  activeDays: number;
  kudosGiven: number;
  matchesLogged: number;
  matchesConfirmed: number;
  bestStreak: number;
  /** Days on which all 3 daily quests were completed. */
  fullQuestDays: number;
}

export interface UnlockState {
  unlocked: readonly string[];
}

// ---- Ladder ----

export type League = 'bronze' | 'silver' | 'gold';
export type LeaderboardScope = 'league' | 'friends' | 'area';

export interface LeaderboardEntry {
  userId: string;
  points: number;
  /** When the user last earned points this month; earlier wins a tie. */
  lastPointAt: Instant | null;
  league: League;
  groupId: string;
  area: string | null;
}

// ---- Entitlements and cosmetics ----

export type ProStatus = 'none' | 'waitlist' | 'active';

export interface Entitlement {
  userId: string;
  status: ProStatus;
  endsAt: Instant | null;
  /** Gifted Pro runs until this instant. */
  giftUntil: Instant | null;
}

export type CosmeticCategory = 'frame' | 'background' | 'kit' | 'effect';
export type CosmeticKind = 'free' | 'earned' | 'buy' | 'pack';

/** Style only. There is deliberately no field that can carry points, level or ranking. */
export interface Cosmetic {
  id: string;
  category: CosmeticCategory;
  kind: CosmeticKind;
  priceCents: number | null;
  earnRule: string | null;
}
