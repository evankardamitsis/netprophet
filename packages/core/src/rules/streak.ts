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
  | { kind: 'advanced'; milestone: 3 | 5 | 7 | 10 | null; newBest: boolean; freezeGranted: boolean }
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
    return {
      state: { ...state, current, best, chain: state.chain + 1, freezes, firstFreeGranted },
      event: {
        kind: 'advanced',
        milestone: isMilestone(current) ? current : null,
        newBest: best > state.best,
        freezeGranted,
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
    state: { ...state, current: 0, chain: 0, brokeAt: at },
    event: { kind: 'broken', lostStreak: state.current },
    chainBefore,
  };
}
