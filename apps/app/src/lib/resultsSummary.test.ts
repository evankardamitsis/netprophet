import { getCopy } from '@netprophet/copy';
import { describe, expect, it } from 'vitest';
import { addSkipped, restAfter, showSkip, skipIds, skipLine, skipStrip, summaryCounts } from './resultsSummary';

const el = getCopy('el');
const en = getCopy('en');
const r = (id: string, ok: boolean, points = ok ? 15 : 0) => ({ id, ok, points });
const queue = (n: number) => Array.from({ length: n }, (_, i) => r(`c${i + 1}`, true, 10));
// the founder's queue: 13 behind the card, 11 right for 155
const thirteen = [...Array.from({ length: 11 }, (_, i) => r(`ok${i}`, true, i < 9 ? 15 : 10)), r('x1', false), r('x2', false)];

describe('restAfter and showSkip', () => {
  it('the rest is everything behind the card that plays', () => {
    expect(restAfter(queue(0))).toEqual([]);
    expect(restAfter(queue(1))).toEqual([]);
    expect(restAfter(queue(4)).map((x) => x.id)).toEqual(['c2', 'c3', 'c4']);
  });

  it('the line shows only while 2 or more wait', () => {
    expect(showSkip(restAfter(queue(1)))).toBe(false);
    expect(showSkip(restAfter(queue(2)))).toBe(false);
    expect(showSkip(restAfter(queue(3)))).toBe(true);
    expect(showSkip(restAfter(queue(14)))).toBe(true);
  });
});

describe('summaryCounts', () => {
  it('counts right calls and only their points', () => {
    expect(summaryCounts([r('a', true, 15), r('b', false, 5), r('c', true, 10)])).toEqual({ n: 3, right: 2, points: 25 });
  });
});

describe('skipLine', () => {
  it('reads the founder example in el and en', () => {
    expect(skipLine(thirteen, el)).toBe('Και 13 ακόμα: 11 σωστά');
    expect(skipLine(thirteen, en)).toBe('And 13 more: 11 right');
  });

  it('all right, one right, none right', () => {
    expect(skipLine([r('a', true), r('b', true), r('c', true)], el)).toBe('Και 3 ακόμα: όλα σωστά');
    expect(skipLine([r('a', true), r('b', false), r('c', false)], el)).toBe('Και 3 ακόμα: 1 σωστό');
    expect(skipLine([r('a', false), r('b', false)], el)).toBe('Και 2 ακόμα: κανένα σωστό');
    expect(skipLine([r('a', true), r('b', true)], en)).toBe('And 2 more: all right');
    expect(skipLine([r('a', false), r('b', false)], en)).toBe('And 2 more: none right');
  });
});

describe('skipStrip', () => {
  it('confirms what the line said, points apart for the lime', () => {
    expect(skipStrip(thirteen, el)).toEqual({ tick: true, text: '11 σωστά', points: '+155' });
    expect(skipStrip(thirteen, en)).toEqual({ tick: true, text: '11 right', points: '+155' });
  });

  it('none right: no tick, no points', () => {
    expect(skipStrip([r('a', false), r('b', false)], el)).toEqual({ tick: false, text: 'κανένα σωστό', points: null });
  });

  it('shows the points only when there are some', () => {
    expect(skipStrip([r('a', true, 0), r('b', false)], el).points).toBeNull();
  });
});

describe('skipIds', () => {
  it('the card and every result behind it, in one list', () => {
    const q = queue(5);
    expect(skipIds(q[0]!, restAfter(q))).toEqual(['c1', 'c2', 'c3', 'c4', 'c5']);
    expect(skipIds(q[0]!, [q[0]!, q[1]!])).toEqual(['c1', 'c2']);
  });
});

describe('addSkipped', () => {
  it('batches add up, each result once', () => {
    const a = [r('a', true), r('b', false)];
    expect(addSkipped([], a)).toEqual(a);
    expect(addSkipped(a, [r('b', false), r('c', true)]).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });
});
