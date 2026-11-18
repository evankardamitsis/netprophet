import { describe, expect, it } from 'vitest';
import {
  DAY_MILESTONE_FRAMES,
  DAY_MILESTONES,
  backfillDailyStreak,
  earnsDayFreeze,
  initialDailyStreak,
  recordDayPlayed,
  rolloverDays,
} from './index';

describe('daily σερί', () => {
  it('the milestones and the frames they give', () => {
    expect([...DAY_MILESTONES]).toEqual([3, 7, 10, 30, 50, 100]);
    expect(DAY_MILESTONE_FRAMES).toEqual({ 7: 'frame_seven', 10: 'frame_ten', 30: 'frame_month', 100: 'frame_hundred' });
  });
  it('a freeze at 3 and on every 7th day only', () => {
    const days = Array.from({ length: 30 }, (_, i) => i + 1).filter(earnsDayFreeze);
    expect(days).toEqual([3, 7, 14, 21, 28]);
  });
  it('is pure: the input state is not changed', () => {
    const s = { ...initialDailyStreak(), current: 2, best: 2, lastPlayed: '2026-11-10', through: '2026-11-10', freezes: ['free' as const] };
    const before = JSON.stringify(s);
    recordDayPlayed(s, '2026-11-13');
    rolloverDays(s, '2026-11-13');
    expect(JSON.stringify(s)).toBe(before);
  });
  it('playing after a covered day: the covered day keeps the number, it does not add to it', () => {
    const s = { ...initialDailyStreak(), current: 5, best: 5, lastPlayed: '2026-11-10', through: '2026-11-10', freezes: ['paid' as const] };
    const r = recordDayPlayed(s, '2026-11-12');
    expect(r.state.current).toBe(6);
    expect(r.events.map((e) => e.kind)).toEqual(['frozen', 'played']);
  });
  it('rolling over the same day twice spends one freeze', () => {
    const s = { ...initialDailyStreak(), current: 5, best: 5, lastPlayed: '2026-11-10', through: '2026-11-10', freezes: ['free' as const, 'free' as const] };
    const once = rolloverDays(s, '2026-11-12');
    const twice = rolloverDays(once.state, '2026-11-12');
    expect(once.state.freezes).toHaveLength(1);
    expect(twice.events).toEqual([]);
    expect(twice.state).toEqual(once.state);
  });
  it('backfill counts a run that ended yesterday and keeps the longest as ΠΡ', () => {
    expect(backfillDailyStreak({ days: ['2026-11-01', '2026-11-02', '2026-11-17'], today: '2026-11-18' })).toEqual({
      current: 1,
      best: 2,
      lastPlayed: '2026-11-17',
      recordRun: false,
    });
  });
});
