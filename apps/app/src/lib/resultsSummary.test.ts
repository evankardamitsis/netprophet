import { getCopy } from '@netprophet/copy';
import { describe, expect, it } from 'vitest';
import { foldResults, idsOnFirstDone, summaryCounts, summaryLine } from './resultsSummary';

const el = getCopy('el');
const en = getCopy('en');
const r = (id: string, ok: boolean, points = ok ? 15 : 0) => ({ id, ok, points });
const queue = (n: number) => Array.from({ length: n }, (_, i) => r(`c${i + 1}`, true, 10));

describe('foldResults', () => {
  it('3 or fewer: every card plays, no line', () => {
    for (const n of [0, 1, 2, 3]) {
      const q = queue(n);
      expect(foldResults(q)).toEqual({ first: q[0], folded: [] });
    }
  });

  it('more than 3: the first plays, the rest fold into the line', () => {
    const q = queue(14);
    const { first, folded } = foldResults(q);
    expect(first).toBe(q[0]);
    expect(folded.map((x) => x.id)).toEqual(q.slice(1).map((x) => x.id));
    expect(foldResults(queue(4)).folded).toHaveLength(3);
  });
});

describe('summaryCounts', () => {
  it('counts right calls and only their points', () => {
    expect(summaryCounts([r('a', true, 15), r('b', false, 5), r('c', true, 10)])).toEqual({ n: 3, right: 2, points: 25 });
  });
});

describe('summaryLine', () => {
  // the founder's queue: 13 behind the first card, 11 right for 155
  const thirteen = [...Array.from({ length: 11 }, (_, i) => r(`ok${i}`, true, i < 9 ? 15 : 10)), r('x1', false), r('x2', false)];

  it('reads the founder example in el and en', () => {
    expect(summaryLine(thirteen, el)).toEqual({ lead: 'Και 13 ακόμα: 11 σωστά', points: '+155' });
    expect(summaryLine(thirteen, en)).toEqual({ lead: 'And 13 more: 11 right', points: '+155' });
  });

  it('all right, one right, none right', () => {
    expect(summaryLine([r('a', true), r('b', true), r('c', true)], el).lead).toBe('Και 3 ακόμα: όλα σωστά');
    expect(summaryLine([r('a', true), r('b', false), r('c', false)], el).lead).toBe('Και 3 ακόμα: 1 σωστό');
    expect(summaryLine([r('a', false), r('b', false), r('c', false)], el)).toEqual({ lead: 'Και 3 ακόμα: κανένα σωστό αυτή τη φορά', points: null });
    expect(summaryLine([r('a', false), r('b', false), r('c', false)], en).lead).toBe('And 3 more: none right this time');
  });

  it('shows the points only when there are some', () => {
    expect(summaryLine([r('a', true, 0), r('b', false), r('c', false)], el).points).toBeNull();
  });
});

describe('idsOnFirstDone', () => {
  it('the first and every folded result leave the queue together', () => {
    const q = queue(5);
    const { first, folded } = foldResults(q);
    expect(idsOnFirstDone(first!, folded)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5']);
    expect(idsOnFirstDone(q[0]!, [])).toEqual(['c1']);
  });
});
