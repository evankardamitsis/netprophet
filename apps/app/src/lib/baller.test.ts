import { describe, expect, it } from 'vitest';
import { nextPoke } from './baller';

describe('nextPoke', () => {
  it('squashes on a tap and gets dizzy on the fifth quick one', () => {
    let taps: number[] = [];
    const moves: string[] = [];
    for (const at of [0, 200, 400, 600, 800]) {
      const r = nextPoke(taps, at);
      taps = r.taps;
      moves.push(r.move);
    }
    expect(moves).toEqual(['squash', 'squash', 'squash', 'squash', 'dizzy']);
    expect(taps).toEqual([]);
  });
  it('forgets taps older than the window', () => {
    const r = nextPoke([0, 100, 200, 300], 1500);
    expect(r.move).toBe('squash');
    expect(r.taps).toEqual([1500]);
  });
});
