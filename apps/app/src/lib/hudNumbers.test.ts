import { describe, expect, it } from 'vitest';
import { hudNumbers } from './hudNumbers';

const r = (id: string, points: number, streakBefore: number) => ({ id, points, streakBefore });

describe('hudNumbers', () => {
  const pending = [r('a', 10, 3), r('b', 10, 4)];
  it('on the feed: σερί from before the first card waiting, its points held back', () => {
    expect(hudNumbers(pending, new Set(), true)).toEqual({ pointsOffset: 20, streakShown: 3 });
    expect(hudNumbers(pending, new Set(['a']), true)).toEqual({ pointsOffset: 10, streakShown: 4 });
    expect(hudNumbers(pending, new Set(['a', 'b']), true)).toEqual({ pointsOffset: 0, streakShown: null });
  });
  it('anywhere else: get_me as it is, the same σερί Εγώ shows (founder, 18 Oct)', () => {
    expect(hudNumbers(pending, new Set(), false)).toEqual({ pointsOffset: 0, streakShown: null });
  });
});
