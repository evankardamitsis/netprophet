/**
 * Streak (σερί) and freeze rules. Pure.
 *
 * Ordering: the streak advances in order of RESOLUTION time (the moment the result card is produced),
 * not vote time. See resolution.ts for the sort key.
 */
import type { FreezeKind, StreakState } from '../types';
import type { Instant } from '../time';

export const MILESTONES = [3, 5, 7, 10] as const;
export const MAX_FREEZES = 2;
export const FREE_FREEZE_EVERY_VOTES = 15;
export const FIRST_FREE_FREEZE_AT = 3;

export function initialStreak(): StreakState {
  return {
    current: 0,
    best: 0,
    chain: 0,
    freezes: [],
    votesSinceFreeFreeze: 0,
    firstFreeGranted: false,
    brokeAt: null,
    recordRun: false,
  };
}

export interface CastResult {
  state: StreakState;
  freezeGranted: boolean;
}

/**
 * A vote was cast (at vote time, not resolution). Every 15th vote grants a free freeze.
 * If both slots are full the counter waits at 15 and the freeze is granted on the first cast with a free slot.
 */
export function recordVoteCast(state: StreakState): CastResult {
  const n = Math.min(state.votesSinceFreeFreeze + 1, FREE_FREEZE_EVERY_VOTES);
  if (n >= FREE_FREEZE_EVERY_VOTES && state.freezes.length < MAX_FREEZES) {
    return {
      state: { ...state, votesSinceFreeFreeze: 0, freezes: [...state.freezes, 'free'] },
      freezeGranted: true,
    };
  }
  return { state: { ...state, votesSinceFreeFreeze: n }, freezeGranted: false };
}

export type BuyFreezeResult =
  | { ok: true; state: StreakState }
  | { ok: false; reason: 'max_freezes' };

/** A paid freeze (0,99 EUR) is a purchase. It only keeps the σερί number; the +5 chain restarts when it is used. */
export function buyFreeze(state: StreakState): BuyFreezeResult {
  if (state.freezes.length >= MAX_FREEZES) return { ok: false, reason: 'max_freezes' };
  return { ok: true, state: { ...state, freezes: [...state.freezes, 'paid'] } };
}

export type StreakEvent =
  | {
      kind: 'advanced';
      milestone: 3 | 5 | 7 | 10 | null;
      newBest: boolean;
      freezeGranted: boolean;
      /** the new ΠΡ when this card is the first of the run to go past the old one (old ΠΡ at least 1), else null */
      record: number | null;
    }
  | { kind: 'frozen'; freezeUsed: FreezeKind }
  | { kind: 'broken'; lostStreak: number }
  /** A wrong vote with no streak to protect: nothing changes and no freeze is spent. */
  | { kind: 'idle' };

export interface OutcomeResult {
  state: StreakState;
  event: StreakEvent;
  /** `chain` before the vote, which the bonus rule reads. */
  chainBefore: number;
}

function isMilestone(n: number): n is 3 | 5 | 7 | 10 {
  return (MILESTONES as readonly number[]).includes(n);
}

export type StreakMoment = { type: 'milestone'; streak: 3 | 5 | 7 | 10 } | { type: 'record'; streak: number };

/**
 * The σερί moment (full-screen celebration) a resolved vote earns, or null (founder, 22 Oct 2026):
 *   - milestone (3, 5, 7, 10): only when it is a new personal record, which is the first time the user ever reaches
 *     it (ΠΡ is the highest σερί ever reached), or when it actually gives something: the first free freeze, retried
 *     at a later 3 while both slots were full. Coming back to 3, 5, 7 or 10 after a reset is not a moment.
 *   - record («Νέο ρεκόρ»): once per run, on the card where σερί first goes past the ΠΡ the run started from
 *     (σερί = old ΠΡ + 1), never on the later cards of that run, never when the old ΠΡ was 0 (the 3 covers a first
 *     run). A milestone moment on the same card wins.
 */
export function streakMoment(event: StreakEvent): StreakMoment | null {
  if (event.kind !== 'advanced') return null;
  if (event.milestone !== null && (event.newBest || event.freezeGranted)) return { type: 'milestone', streak: event.milestone };
  if (event.record !== null) return { type: 'record', streak: event.record };
  return null;
}

/** Apply one resolved match vote with outcome correct or wrong. Void/cancelled matches never reach here. */
export function applyOutcome(state: StreakState, correct: boolean, at: Instant): OutcomeResult {
  const chainBefore = state.chain;
  if (correct) {
    const current = state.current + 1;
    const best = Math.max(state.best, current);
    let freezes = state.freezes;
    let firstFreeGranted = state.firstFreeGranted;
    let freezeGranted = false;
    if (current === FIRST_FREE_FREEZE_AT && !firstFreeGranted && freezes.length < MAX_FREEZES) {
      freezes = [...freezes, 'free'];
      firstFreeGranted = true;
      freezeGranted = true;
    }
    const newBest = best > state.best;
    // the first card of this run past the ΠΡ it started from; with an old ΠΡ of 0 there is nothing to beat
    const record = newBest && !state.recordRun && state.best > 0 ? current : null;
    return {
      state: { ...state, current, best, chain: state.chain + 1, freezes, firstFreeGranted, recordRun: state.recordRun || newBest },
      event: {
        kind: 'advanced',
        milestone: isMilestone(current) ? current : null,
        newBest,
        freezeGranted,
        record,
      },
      chainBefore,
    };
  }
  if (state.current === 0) {
    return { state: { ...state, chain: 0 }, event: { kind: 'idle' }, chainBefore };
  }
  if (state.freezes.length > 0) {
    // Spend a free freeze first (it keeps the chain too), else the paid one.
    const idx = state.freezes.indexOf('free');
    const at0 = idx === -1 ? 0 : idx;
    const used = state.freezes[at0] as FreezeKind;
    const freezes = state.freezes.filter((_, i) => i !== at0);
    return {
      state: { ...state, freezes, chain: used === 'free' ? state.chain : 0 },
      event: { kind: 'frozen', freezeUsed: used },
      chainBefore,
    };
  }
  return {
    state: { ...state, current: 0, chain: 0, brokeAt: at, recordRun: false },
    event: { kind: 'broken', lostStreak: state.current },
    chainBefore,
  };
}
