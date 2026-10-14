import { UNLOCK_STEPS, evaluateUnlocks, unlockedFeatures, type UnlockCounters } from '@netprophet/core';

/**
 * The unlock ladder as the UI sees it: which features are open. Pure, so it is tested; the provider is unlocks.tsx.
 * The server keeps counting whatever the UI shows; only the display hides.
 */
export const ALL_STEP_IDS: string[] = UNLOCK_STEPS.map((s) => s.id);

/**
 * the steps that get a full-screen moment; the others open quietly. Three, not seven (founder, 14 Oct: «it feels
 * really overwhelming»): your level, Κατάταξη and the first badge. core.unlock_defs.celebrate says the same.
 */
export const MOMENT_KEYS: readonly string[] = ['level_bar', 'ladder_friends', 'badges_shelf'];

export const hasMoment = (key: string): boolean => MOMENT_KEYS.includes(key);

/** the open features for a list of step ids; null (still loading, mock mode) opens everything */
export function featureSet(unlocked: readonly string[] | null): Set<string> | null {
  return unlocked === null ? null : new Set(unlockedFeatures(unlocked));
}

export function hasFeature(features: Set<string> | null, feature: string): boolean {
  return features === null || features.has(feature);
}

/** quests with the locked half emptied, so the vote feedback says nothing about quests that are not open yet */
export function gateQuests<Q extends { daily: unknown[]; weekly: unknown[] }>(q: Q, has: (feature: string) => boolean): Q {
  return { ...q, daily: has('daily_quests') ? q.daily : [], weekly: has('weekly_quests') ? q.weekly : [] };
}

/* the dev «Νέος παίκτης» ladder: local counters that advance with each mock vote */
export interface NewPlayerState {
  counters: UnlockCounters;
  unlocked: string[];
}

export function newPlayerStart(): NewPlayerState {
  const counters: UnlockCounters = {
    votesCast: 0,
    votesResolved: 0,
    correctVotes: 0,
    activeDays: 1,
    kudosGiven: 0,
    matchesLogged: 0,
    matchesConfirmed: 0,
    bestStreak: 0,
    fullQuestDays: 0,
  };
  return { counters, unlocked: evaluateUnlocks(counters).unlocked };
}

/** one more vote; half of the votes are guessed right. Returns the new state and the steps this vote opened. */
export function newPlayerVote(state: NewPlayerState): { state: NewPlayerState; newlyUnlocked: string[] } {
  const votesCast = state.counters.votesCast + 1;
  const counters: UnlockCounters = { ...state.counters, votesCast, correctVotes: Math.floor(votesCast / 2), activeDays: 1 };
  const ev = evaluateUnlocks(counters, state.unlocked);
  return { state: { counters, unlocked: ev.unlocked }, newlyUnlocked: ev.newlyUnlocked };
}
