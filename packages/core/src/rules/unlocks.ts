/**
 * Unlock ladder: 13 action-based steps, each with a backup trigger counted in votes cast.
 * Data-driven so the SQL implementation can read the same table. Unlocks are sticky.
 */
import type { UnlockCounters } from '../types';

export type CounterName = keyof UnlockCounters;

export interface Condition {
  counter: CounterName;
  min: number;
}

export interface UnlockStep {
  id: string;
  step: number;
  /** All conditions must hold. */
  primary: readonly Condition[];
  /** Or: votes cast reaches this number. */
  backupVotes: number;
  features: readonly string[];
}

const c = (counter: CounterName, min: number): Condition => ({ counter, min });

export const UNLOCK_STEPS: readonly UnlockStep[] = [
  { id: 'day1', step: 1, primary: [], backupVotes: 0, features: ['vote_cards', 'results', 'streak', 'points', 'daily_quiz', 'log_match_quiet'] },
  { id: 'level_bar', step: 2, primary: [c('correctVotes', 3), c('activeDays', 2)], backupVotes: 5, features: ['level_bar'] },
  { id: 'first_freeze', step: 3, primary: [c('bestStreak', 3)], backupVotes: 8, features: ['streak_moment', 'free_freeze'] },
  { id: 'daily_quests', step: 4, primary: [c('votesCast', 10), c('activeDays', 2)], backupVotes: 12, features: ['daily_quests'] },
  { id: 'bridge_line', step: 5, primary: [c('votesResolved', 1), c('activeDays', 2)], backupVotes: 15, features: ['bridge_line'] },
  { id: 'ladder_friends', step: 6, primary: [c('votesCast', 20), c('activeDays', 3)], backupVotes: 25, features: ['ladder_friends', 'invite_friend_quest'] },
  { id: 'kudos_reactions', step: 7, primary: [c('matchesConfirmed', 1)], backupVotes: 20, features: ['kudos', 'reactions'] },
  { id: 'avatar_profile', step: 8, primary: [c('fullQuestDays', 3)], backupVotes: 35, features: ['avatar_3d', 'backgrounds', 'frames'] },
  { id: 'badges_shelf', step: 9, primary: [c('correctVotes', 10)], backupVotes: 28, features: ['badges_shelf'] },
  { id: 'pro_first_view', step: 10, primary: [c('bestStreak', 5)], backupVotes: 30, features: ['pro_sheet', 'win_effect'] },
  { id: 'weekly_quests', step: 11, primary: [c('activeDays', 6)], backupVotes: 40, features: ['weekly_quests'] },
  { id: 'gifts', step: 12, primary: [c('kudosGiven', 3)], backupVotes: 50, features: ['gifts'] },
  { id: 'stats_area', step: 13, primary: [c('votesCast', 45)], backupVotes: 45, features: ['stats', 'ladder_area'] },
];

export function isStepMet(step: UnlockStep, counters: UnlockCounters): boolean {
  if (counters.votesCast >= step.backupVotes) return true;
  return step.primary.every((cond) => counters[cond.counter] >= cond.min);
}

export interface UnlockEvaluation {
  /** All unlocked step ids, in ladder order. */
  unlocked: string[];
  newlyUnlocked: string[];
}

/**
 * Evaluate the ladder. Previously unlocked steps stay unlocked even if counters were later corrected down.
 * `existingPlayer` unlocks everything at once (players who joined before the ladder existed).
 */
export function evaluateUnlocks(
  counters: UnlockCounters,
  previouslyUnlocked: readonly string[] = [],
  options: { existingPlayer?: boolean } = {},
): UnlockEvaluation {
  const prev = new Set(previouslyUnlocked);
  const unlocked: string[] = [];
  const newlyUnlocked: string[] = [];
  for (const step of UNLOCK_STEPS) {
    const has = prev.has(step.id) || options.existingPlayer === true || isStepMet(step, counters);
    if (has) {
      unlocked.push(step.id);
      if (!prev.has(step.id)) newlyUnlocked.push(step.id);
    }
  }
  return { unlocked, newlyUnlocked };
}

export function unlockedFeatures(unlocked: readonly string[]): string[] {
  const ids = new Set(unlocked);
  return UNLOCK_STEPS.filter((s) => ids.has(s.id)).flatMap((s) => [...s.features]);
}
