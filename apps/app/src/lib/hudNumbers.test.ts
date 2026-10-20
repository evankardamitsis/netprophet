import { describe, expect, it } from 'vitest';
import { NOTHING_HELD, hudNumbers, pinBatch, type PendingResult } from './hudNumbers';

const r = (id: string, points: number, streakBefore: number): PendingResult => ({ id, points, streakBefore });

// a launch with 14 unseen results, 170 points between them
const POINTS = [10, 15, 15, 15, 0, 15, 15, 15, 15, 15, 15, 15, 0, 10];
const batch = POINTS.map((p, i) => r(`c${i + 1}`, p, i + 2));
const none = { pointsOffset: 0, streakShown: null };

describe('hudNumbers', () => {
  it('holds back only the first card of a batch, never all of them', () => {
    expect(POINTS.reduce((a, b) => a + b, 0)).toBe(170);
    const held = pinBatch(NOTHING_HELD, batch);
    expect(hudNumbers(held, batch, new Set(), true)).toEqual({ pointsOffset: 10, streakShown: 2 });
  });

  it('the first card played: nothing held back', () => {
    const held = pinBatch(NOTHING_HELD, batch);
    expect(hudNumbers(held, batch, new Set(['c1']), true)).toEqual(none);
  });

  it('the first card dismissed, 13 left: still nothing, the number never dips', () => {
    const rest = batch.slice(1);
    const held = pinBatch(pinBatch(NOTHING_HELD, batch), rest);
    // the feed prunes applied to the ids still queued, so c1 has left it too
    expect(hudNumbers(held, rest, new Set(), true)).toEqual(none);
    // cards 2..N play: nothing moves
    expect(hudNumbers(held, rest, new Set(['c2']), true)).toEqual(none);
    const later = batch.slice(2);
    expect(hudNumbers(pinBatch(held, later), later, new Set(), true)).toEqual(none);
  });

  it('anywhere but the feed: get_me as it is, the same σερί Εγώ shows (founder, 18 Oct)', () => {
    const held = pinBatch(NOTHING_HELD, batch);
    expect(hudNumbers(held, batch, new Set(), false)).toEqual(none);
  });

  it('a fresh batch on relaunch with the same 14 holds back 10, never 170', () => {
    // a session: all 14 played and dismissed
    let held = pinBatch(NOTHING_HELD, batch);
    for (let i = 1; i <= batch.length; i++) held = pinBatch(held, batch.slice(i));
    expect(hudNumbers(held, [], new Set(), true)).toEqual(none);
    // relaunch: the provider starts again from nothing held
    const again = pinBatch(NOTHING_HELD, batch);
    expect(hudNumbers(again, batch, new Set(), true)).toEqual({ pointsOffset: 10, streakShown: 2 });
  });

  it('get_feed comes back the same: the pin stays', () => {
    const held = pinBatch(NOTHING_HELD, batch);
    expect(pinBatch(held, batch)).toBe(held);
    expect(pinBatch(held, batch.slice(3))).toBe(held);
  });

  it('a refetch with a new result pins the new card, not a card already counted', () => {
    let held = pinBatch(pinBatch(NOTHING_HELD, batch), batch.slice(1));
    const next = [...batch.slice(1), r('c15', 15, 16)];
    held = pinBatch(held, next);
    expect(held.first?.id).toBe('c15');
    expect(hudNumbers(held, next, new Set(), true)).toEqual({ pointsOffset: 15, streakShown: 16 });
  });

  it('the feed mounts empty before get_feed answers: nothing held, then the batch pins', () => {
    const empty = pinBatch(NOTHING_HELD, []);
    expect(hudNumbers(empty, [], new Set(), true)).toEqual(none);
    const held = pinBatch(empty, batch);
    expect(hudNumbers(held, batch, new Set(), true)).toEqual({ pointsOffset: 10, streakShown: 2 });
  });
});
