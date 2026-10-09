import { describe, expect, it } from 'vitest';
import { advanceStreak, pointsForVote } from './index';

describe('core smoke', () => {
  it('advances and resets a streak', () => {
    const s = advanceStreak({ current: 2, best: 2 }, true);
    expect(s).toEqual({ current: 3, best: 3 });
    expect(advanceStreak(s, false)).toEqual({ current: 0, best: 3 });
    expect(pointsForVote(true)).toBe(1);
  });
});
