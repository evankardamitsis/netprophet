/** Vote validation and result resolution. Pure and idempotent. */
import { athensInstant, dayKey, localParts, toMs, type Instant } from '../time';
import type { Match, StreakState, Vote } from '../types';
import { isUpset, pointsForVote, totalPoints, type CrowdSplit, type PointsPart } from './points';
import { applyOutcome, type StreakEvent } from './streak';

/**
 * A match with no start time takes votes until this Athens time on its day (founder, 22 Oct 2026). Each tournament
 * can set its own (core.tournaments.untimed_lock_time).
 */
export const DEFAULT_UNTIMED_LOCK_TIME = '14:00';

/**
 * Whether a start means «the day is known, the time is not»: the import stores a row with no time at 00:00 Athens on
 * its day, and no real match starts at midnight.
 */
export function isUntimedStart(startsAt: Instant): boolean {
  const p = localParts(startsAt);
  return p.hour === 0 && p.minute === 0 && p.second === 0 && toMs(startsAt) % 1000 === 0;
}

/**
 * When voting closes: a staff lock when set; else, for a start with no time, that Athens day at `untimedLockTime`;
 * else the start. The SQL twin is core.lock_instant.
 */
export function voteLockInstant(startsAt: Instant, lockAt: Instant | null, untimedLockTime: string | null = DEFAULT_UNTIMED_LOCK_TIME): Instant {
  if (lockAt !== null) return lockAt;
  if (!isUntimedStart(startsAt)) return startsAt;
  return athensInstant(dayKey(startsAt), untimedLockTime ?? DEFAULT_UNTIMED_LOCK_TIME);
}

export function lockInstant(match: Match): Instant {
  return voteLockInstant(match.startsAt, match.lockAt, match.untimedLockTime ?? null);
}

export type VoteRejection = 'not_open' | 'locked' | 'invalid_option' | 'already_voted';

export type VoteValidation = { ok: true } | { ok: false; reason: VoteRejection };

/** Votes are accepted only on announced or scheduled matches, strictly before the lock instant. */
export function validateVote(args: {
  match: Match;
  optionIndex: number;
  castAt: Instant;
  alreadyVoted: boolean;
}): VoteValidation {
  const { match, optionIndex, castAt, alreadyVoted } = args;
  if (match.status !== 'announced' && match.status !== 'scheduled') return { ok: false, reason: 'not_open' };
  if (toMs(castAt) >= toMs(lockInstant(match))) return { ok: false, reason: 'locked' };
  if (optionIndex !== 0 && optionIndex !== 1) return { ok: false, reason: 'invalid_option' };
  if (alreadyVoted) return { ok: false, reason: 'already_voted' };
  return { ok: true };
}

export interface ResolveInput {
  vote: Vote;
  match: Match;
  resolvedAt: Instant;
  crowd: CrowdSplit;
}

export type ResolveResult =
  | { status: 'already_resolved' }
  /** Match is not final (announced, scheduled, played, disputed) or has no result yet. No change. */
  | { status: 'pending' }
  | { status: 'invalid'; reason: 'wrong_match' | 'invalid_option' | 'not_a_match_vote' }
  /** Cancelled or void match: vote closes with outcome none, no points, streak unchanged. */
  | { status: 'void'; vote: Vote }
  | {
      status: 'resolved';
      vote: Vote;
      parts: PointsPart[];
      streak: StreakState;
      streakEvent: StreakEvent;
    };

export function resolveVote(streak: StreakState, input: ResolveInput): ResolveResult {
  const { vote, match, resolvedAt, crowd } = input;
  if (vote.resolvedAt !== null) return { status: 'already_resolved' };
  if (vote.source !== 'match' || vote.matchId === null) return { status: 'invalid', reason: 'not_a_match_vote' };
  if (vote.matchId !== match.id) return { status: 'invalid', reason: 'wrong_match' };
  if (match.status === 'cancelled' || match.status === 'void') {
    return { status: 'void', vote: { ...vote, resolvedAt, outcome: 'none', isUpsetCall: false, points: 0 } };
  }
  if (match.status !== 'confirmed' || match.result === null) return { status: 'pending' };
  if (vote.optionIndex !== 0 && vote.optionIndex !== 1) return { status: 'invalid', reason: 'invalid_option' };

  const correct = vote.optionIndex === match.result.winnerSide;
  const upset = correct && isUpset(crowd);
  const outcome = applyOutcome(streak, correct, resolvedAt);
  const parts = pointsForVote({ correct, upset, chainBefore: outcome.chainBefore });
  return {
    status: 'resolved',
    vote: {
      ...vote,
      resolvedAt,
      outcome: correct ? 'correct' : 'wrong',
      isUpsetCall: upset,
      points: totalPoints(parts),
    },
    parts,
    streak: outcome.state,
    streakEvent: outcome.event,
  };
}

export interface BatchItem extends ResolveInput {}

export interface BatchEntry {
  voteId: string;
  result: ResolveResult;
}

/**
 * Deterministic order for resolutions that arrive out of order:
 * resolvedAt ascending, then match startsAt ascending, then vote createdAt ascending, then vote id (binary string order).
 * The streak follows RESOLUTION time. Results that come in together (one sheet run, one worker pass) count in the
 * order the matches were played, not in the order the source listed them. A later correction never rewrites the streak.
 */
export function compareResolutions(a: BatchItem, b: BatchItem): number {
  const byResolved = toMs(a.resolvedAt) - toMs(b.resolvedAt);
  if (byResolved !== 0) return byResolved;
  const byStart = toMs(a.match.startsAt) - toMs(b.match.startsAt);
  if (byStart !== 0) return byStart;
  const byCreated = toMs(a.vote.createdAt) - toMs(b.vote.createdAt);
  if (byCreated !== 0) return byCreated;
  return a.vote.id < b.vote.id ? -1 : a.vote.id > b.vote.id ? 1 : 0;
}

/** Resolve several votes in the deterministic order. A repeated vote id inside the batch counts as already resolved. */
export function resolveBatch(
  streak: StreakState,
  items: readonly BatchItem[],
): { streak: StreakState; entries: BatchEntry[] } {
  const sorted = [...items].sort(compareResolutions);
  const seen = new Set<string>();
  let state = streak;
  const entries: BatchEntry[] = [];
  for (const item of sorted) {
    if (seen.has(item.vote.id)) {
      entries.push({ voteId: item.vote.id, result: { status: 'already_resolved' } });
      continue;
    }
    const result = resolveVote(state, item);
    if (result.status === 'resolved') {
      state = result.streak;
      seen.add(item.vote.id);
    } else if (result.status === 'void') {
      seen.add(item.vote.id);
    }
    entries.push({ voteId: item.vote.id, result });
  }
  return { streak: state, entries };
}
