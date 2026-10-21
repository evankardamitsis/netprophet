import { getCopy } from '@netprophet/copy';
import { describe, expect, it } from 'vitest';
import { cardTap, deckFull, restAfter, restLine, showSkip, skipIds, summaryCounts, takeAll, takenToast } from './resultsSummary';

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

describe('restLine', () => {
  it('reads the founder example in el and en', () => {
    expect(restLine(thirteen, el)).toBe('Και 13 ακόμα: 11 ✓ · 2 χαμένα');
    expect(restLine(thirteen, en)).toBe('And 13 more: 11 ✓ · 2 missed');
  });

  it('leaves out a part with nothing in it, one miss is singular', () => {
    expect(restLine([r('a', true), r('b', true), r('c', true)], el)).toBe('Και 3 ακόμα: 3 ✓');
    expect(restLine([r('a', true), r('b', true), r('c', false)], el)).toBe('Και 3 ακόμα: 2 ✓ · 1 χαμένο');
    expect(restLine([r('a', false), r('b', false)], el)).toBe('Και 2 ακόμα: 2 χαμένα');
    expect(restLine([r('a', false), r('b', true)], en)).toBe('And 2 more: 1 ✓ · 1 missed');
  });
});

describe('takeAll («Πάρε τους πόντους»)', () => {
  const s = (id: string, ok: boolean, points: number, streak: number) => ({ id, ok, points, streak });
  const card = s('c', true, 10, 3);
  const rest = [s('a', true, 15, 4), s('b', false, 0, 0), s('d', true, 10, 1)];

  it('the points behind the card, σερί where the last result leaves it', () => {
    expect(takeAll(card, rest, true)).toEqual({ points: 25, streak: 1, allRight: false });
  });

  it('the card on screen counts too while its own moment has not landed', () => {
    expect(takeAll(card, rest, false)).toEqual({ points: 35, streak: 1, allRight: false });
  });

  it('«+1» to σερί only when every one was right', () => {
    expect(takeAll(card, [s('a', true, 15, 4), s('d', true, 10, 5)], true)).toEqual({ points: 25, streak: 5, allRight: true });
  });
});

describe('takenToast', () => {
  it('says the points and σερί, or that they were seen', () => {
    expect(takenToast({ points: 155, streak: 7 }, el)).toBe('+155 πόντοι · σερί 7');
    expect(takenToast({ points: 155, streak: 7 }, en)).toBe('+155 points · streak 7');
    expect(takenToast({ points: 0, streak: 0 }, el)).toBe('Τα είδες όλα · σερί 0');
  });
});

describe('skipIds', () => {
  it('the card and every result behind it, in one list', () => {
    const q = queue(5);
    expect(skipIds(q[0]!, restAfter(q))).toEqual(['c1', 'c2', 'c3', 'c4', 'c5']);
    expect(skipIds(q[0]!, [q[0]!, q[1]!])).toEqual(['c1', 'c2']);
  });
});

describe('cardTap', () => {
  it('opens the full view first, then goes to the next result', () => {
    expect(cardTap(false)).toBe('open');
    expect(cardTap(true)).toBe('next');
  });
});

describe('deckFull', () => {
  it('stays compact until a card was opened, then every next card enters full', () => {
    expect(deckFull(false, false)).toBe(false);
    expect(deckFull(false, true)).toBe(true);
    expect(deckFull(true, false)).toBe(true);
  });
  it('a tap on a full card advances, never collapses', () => {
    expect(cardTap(deckFull(true, false))).toBe('next');
  });
});
