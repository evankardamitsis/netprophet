import type { Streak } from '../types';

/** Streak (σερί) rules. Stub. */
export function advanceStreak(streak: Streak, correct: boolean): Streak {
  const current = correct ? streak.current + 1 : 0;
  return { current, best: Math.max(streak.best, current) };
}
