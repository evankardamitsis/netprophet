/**
 * The daily σερί (founder, 18 Nov 2026): one number, the days in a row played. Pure.
 *
 *   - A day counts with one match vote or the day's quiz finished (every card of the set answered). The day is the
 *     Athens calendar day of that action (time.ts dayKey, DST included), not the quiz day (which turns at 09:00).
 *   - +1 at the first qualifying action of the day, never at result time. A wrong vote no longer touches it.
 *   - Only a fully missed day breaks it. An Ασφάλεια (freeze) covers one missed day by itself at the day rollover
 *     (just after Athens midnight, or on the next action if the nightly run has not happened): the number stays, it
 *     does not grow. A free one is spent before a paid one. Max 2, owned ones carry over, the paid one stays.
 *   - A free freeze when the σερί reaches 3 days and on every 7th day in a row (7, 14, 21...), only into a free slot
 *     (nothing is kept for later when both slots are full).
 *   - Milestones 3, 7, 10, 30, 50, 100 days. The moment rule is streak.ts streakMoment: a milestone is a moment the
 *     first time it is ever reached or when it gives a freeze; otherwise «Νέο ρεκόρ» once per run past the old ΠΡ.
 *   - The correct-calls chain that feeds the +5 bonus (points.ts) is separate and unchanged (streak.ts applyOutcome).
 *
 * The SQL mirror is core.day_streak_play / core.day_streak_rollover (shared vectors: test-vectors/daily-streak.json).
 */
import type { FreezeKind } from '../types';
import { addDays } from '../time';
import { MAX_FREEZES } from './streak';

export const DAY_MILESTONES = [3, 7, 10, 30, 50, 100] as const;
export type DayMilestone = (typeof DAY_MILESTONES)[number];
/** the first free freeze of a run */
export const DAY_FREEZE_FIRST_AT = 3;
/** and one on every 7th day in a row */
export const DAY_FREEZE_EVERY = 7;
/** the Frames the day milestones give (once each; the existing «Επτά» and «Δέκα» moved here from correct calls) */
export const DAY_MILESTONE_FRAMES: Readonly<Record<number, string>> = {
  7: 'frame_seven',
  10: 'frame_ten',
  30: 'frame_month',
  100: 'frame_hundred',
};

export interface DailyStreakState {
  /** days in a row (σερί) */
  current: number;
  /** the most days in a row ever (ΠΡ) */
  best: number;
  /** the last day with a qualifying action, `YYYY-MM-DD` (Athens) */
  lastPlayed: string | null;
  /** the last day kept: played, or covered by a freeze. The next missed day is the one after it. */
  through: string | null;
  freezes: readonly FreezeKind[];
  /** this run already went past the ΠΡ it started from (the «Νέο ρεκόρ» moment is once per run) */
  recordRun: boolean;
}

export type DayStreakEvent =
  | {
      kind: 'played';
      day: string;
      current: number;
      milestone: DayMilestone | null;
      newBest: boolean;
      freezeGranted: boolean;
      /** the new ΠΡ when this day is the first of the run past the old one (old ΠΡ at least 1), else null */
      record: number | null;
    }
  /** a second qualifying action on a day already counted (or an older day): nothing changes */
  | { kind: 'same_day'; day: string }
  | { kind: 'frozen'; day: string; freezeUsed: FreezeKind; current: number; left: number }
  | { kind: 'broken'; day: string; lostStreak: number; best: number };

export interface DayStreakResult {
  state: DailyStreakState;
  events: DayStreakEvent[];
}

export function initialDailyStreak(): DailyStreakState {
  return { current: 0, best: 0, lastPlayed: null, through: null, freezes: [], recordRun: false };
}

function isDayMilestone(n: number): n is DayMilestone {
  return (DAY_MILESTONES as readonly number[]).includes(n);
}

/** a freeze is earned on this day of a run */
export function earnsDayFreeze(current: number): boolean {
  return current === DAY_FREEZE_FIRST_AT || (current > 0 && current % DAY_FREEZE_EVERY === 0);
}

/**
 * Close every day before `today` that was neither played nor covered: each one takes a freeze (free first) while
 * there is one, the first one without breaks the σερί. Idempotent: running it twice for the same day changes nothing.
 */
export function rolloverDays(state: DailyStreakState, today: string): DayStreakResult {
  if (state.current === 0) return { state, events: [] };
  let s = state;
  const events: DayStreakEvent[] = [];
  let next = addDays(s.through ?? s.lastPlayed ?? addDays(today, -1), 1);
  while (next < today) {
    if (s.freezes.length > 0) {
      const idx = s.freezes.indexOf('free');
      const at = idx === -1 ? 0 : idx;
      const used = s.freezes[at] as FreezeKind;
      const freezes = s.freezes.filter((_, i) => i !== at);
      s = { ...s, freezes, through: next };
      events.push({ kind: 'frozen', day: next, freezeUsed: used, current: s.current, left: freezes.length });
    } else {
      events.push({ kind: 'broken', day: next, lostStreak: s.current, best: s.best });
      s = { ...s, current: 0, through: null, recordRun: false };
      break;
    }
    next = addDays(next, 1);
  }
  return { state: s, events };
}

/** A qualifying action on `day` (a match vote, or the day's quiz finished). Rolls over the days before it first. */
export function recordDayPlayed(state: DailyStreakState, day: string): DayStreakResult {
  if (state.lastPlayed !== null && day <= state.lastPlayed) {
    return { state, events: [{ kind: 'same_day', day }] };
  }
  const rolled = rolloverDays(state, day);
  const s = rolled.state;
  const current = s.current + 1;
  const best = Math.max(s.best, current);
  const newBest = best > s.best;
  let freezes = s.freezes;
  let freezeGranted = false;
  if (earnsDayFreeze(current) && freezes.length < MAX_FREEZES) {
    freezes = [...freezes, 'free'];
    freezeGranted = true;
  }
  const record = newBest && !s.recordRun && s.best > 0 ? current : null;
  return {
    state: { current, best, lastPlayed: day, through: day, freezes, recordRun: s.recordRun || newBest },
    events: [
      ...rolled.events,
      { kind: 'played', day, current, milestone: isDayMilestone(current) ? current : null, newBest, freezeGranted, record },
    ],
  };
}

/** The full-screen moment a played day earns, or null: the same rule as a σερί moment (streak.ts streakMoment). */
export type DayStreakMoment = { type: 'milestone'; streak: DayMilestone } | { type: 'record'; streak: number };

export function dayStreakMoment(event: DayStreakEvent): DayStreakMoment | null {
  if (event.kind !== 'played') return null;
  if (event.milestone !== null && (event.newBest || event.freezeGranted)) return { type: 'milestone', streak: event.milestone };
  if (event.record !== null) return { type: 'record', streak: event.record };
  return null;
}

export interface DailyStreakBackfill {
  current: number;
  best: number;
  lastPlayed: string | null;
  recordRun: boolean;
}

/**
 * The starting σερί of an existing player when the daily σερί is switched on: their real consecutive Athens days with
 * a qualifying action, ending today or yesterday (else 0), and the longest such run ever as the ΠΡ. No freezes are
 * spent on the past. A run that is the record already counts as past it (no «Νέο ρεκόρ» the next day).
 */
export function backfillDailyStreak(input: { days: readonly string[]; today: string }): DailyStreakBackfill {
  const days = [...new Set(input.days)].filter((d) => d <= input.today).sort();
  if (days.length === 0) return { current: 0, best: 0, lastPlayed: null, recordRun: false };
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  const last = days[days.length - 1]!;
  const current = last >= addDays(input.today, -1) ? run : 0;
  return { current, best, lastPlayed: last, recordRun: current > 0 && current === best };
}
