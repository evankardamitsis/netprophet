import { describe, expect, it } from 'vitest';
import { hudNumbers, streakAtHead, type PendingResult } from './hudNumbers';

const r = (id: string, streakBefore: number, streak = streakBefore + 1): PendingResult => ({ id, streakBefore, streak });

// a launch with 14 unseen results; σερί 2 before the first, one more with each card
const batch = Array.from({ length: 14 }, (_, i) => r(`c${i + 1}`, i + 2));
const none = { streakShown: null };

describe('hudNumbers (σερί card by card)', () => {
  it('before the first card plays: the σερί from before it', () => {
    expect(hudNumbers(batch, new Set(), true)).toEqual({ streakShown: 2 });
  });

  it('the card played: the σερί it left, the number the card says', () => {
    expect(hudNumbers(batch, new Set(['c1']), true)).toEqual({ streakShown: 3 });
  });

  it('cards 2..N each move it: c2 waits at 3, plays to 4', () => {
    const rest = batch.slice(1);
    expect(hudNumbers(rest, new Set(), true)).toEqual({ streakShown: 3 });
    expect(hudNumbers(rest, new Set(['c2']), true)).toEqual({ streakShown: 4 });
    expect(hudNumbers(batch.slice(2), new Set(), true)).toEqual({ streakShown: 4 });
  });

  it('the queue played out or taken («Πάρε τους πόντους»): get_me again', () => {
    expect(hudNumbers([], new Set(), true)).toEqual(none);
  });

  it('anywhere but the feed: get_me as it is, the same σερί Εγώ shows (founder, 18 Oct)', () => {
    expect(hudNumbers(batch, new Set(), false)).toEqual(none);
    expect(hudNumbers(batch.slice(3), new Set(['c4']), false)).toEqual(none);
  });
});

describe('streakAtHead', () => {
  // the founder's 22 Oct 08:01 pass in match order: σερί 2, a loss, then three wins
  const pass = [r('w', 2, 0), r('a', 0), r('b', 1), r('c', 2)];

  it('the header reads what the card on screen says, before and after it plays', () => {
    expect(streakAtHead(pass, new Set())).toBe(2);
    expect(streakAtHead(pass, new Set(['w']))).toBe(0);
    expect(streakAtHead(pass.slice(1), new Set())).toBe(0);
    expect(streakAtHead(pass.slice(1), new Set(['a']))).toBe(1);
    expect(streakAtHead(pass.slice(3), new Set(['c']))).toBe(3);
  });

  it('a freeze keeps the number through the card', () => {
    const frozen = [r('f', 4, 4)];
    expect(streakAtHead(frozen, new Set())).toBe(4);
    expect(streakAtHead(frozen, new Set(['f']))).toBe(4);
  });

  it('nothing queued: no number of its own', () => {
    expect(streakAtHead([], new Set())).toBeNull();
  });
});
