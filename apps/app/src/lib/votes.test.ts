import { describe, expect, it } from 'vitest';
import { fmt, voteSplit } from './votes';
import { parseBezier } from './ease';

describe('voteSplit', () => {
  it('is 50/50 with no votes', () => {
    expect(voteSplit(0, 0)).toEqual({ pctA: 50, pctB: 50, total: 0 });
  });

  it('adds the viewer vote to the picked side', () => {
    expect(voteSplit(6, 3)).toEqual({ pctA: 67, pctB: 33, total: 9 });
    expect(voteSplit(6, 3, 'b')).toEqual({ pctA: 60, pctB: 40, total: 10 });
  });

  it('always sums to 100', () => {
    for (let a = 0; a < 30; a += 1) {
      for (let b = 0; b < 30; b += 1) {
        const s = voteSplit(a, b, a % 2 ? 'a' : 'b');
        expect(s.pctA + s.pctB).toBe(100);
      }
    }
  });
});

describe('fmt', () => {
  it('fills placeholders and leaves unknown ones', () => {
    expect(fmt('level {level} · {area}', { level: 4, area: 'Γλυφάδα' })).toBe('level 4 · Γλυφάδα');
    expect(fmt('{x}', {})).toBe('{x}');
  });
});

describe('parseBezier', () => {
  it('parses the token easing', () => {
    expect(parseBezier('cubic-bezier(.16,1,.3,1)')).toEqual([0.16, 1, 0.3, 1]);
  });
  it('rejects junk', () => {
    expect(() => parseBezier('ease')).toThrow();
  });
});
