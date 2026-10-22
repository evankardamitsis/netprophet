import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import { categoryCase, firstOpenIndex, foldSlot, resultStrip, runCategories, type CardResult } from './feed';

const t = getCopy('el');

type C = { kind: string; id: string; group?: { key: string }; category?: string; myVote?: 'a' | 'b'; closed?: boolean };
const m = (id: string, group?: string, category?: string, over: Partial<C> = {}): C => ({
  kind: 'match',
  id,
  group: group ? { key: group } : undefined,
  category,
  ...over,
});
const ad = (id: string): C => ({ kind: 'sponsored', id });

describe('runCategories', () => {
  it('hides a category the whole tournament run shares and says it once on the head', () => {
    const r = runCategories([m('1', 'open', '40+'), m('2', 'open', '40+'), m('3', 'open', '40+')]);
    expect([...r.hide]).toEqual([0, 1, 2]);
    expect(r.head.get(0)).toBe('40+');
  });

  it('keeps the tag on every card when it tells matches apart', () => {
    const r = runCategories([m('1', 'open', '40+'), m('2', 'open', '50+'), m('3', 'open', '-45 Γυναικών')]);
    expect(r.hide.size).toBe(0);
    expect(r.head.size).toBe(0);
  });

  it('keeps it when only some cards have a category', () => {
    const r = runCategories([m('1', 'open', '40+'), m('2', 'open')]);
    expect(r.hide.size).toBe(0);
  });

  it('always keeps it on a match outside a tournament', () => {
    const r = runCategories([m('1', undefined, 'Μικτό'), m('2', undefined, 'Μικτό')]);
    expect(r.hide.size).toBe(0);
    expect(r.head.size).toBe(0);
  });

  it('reads each run on its own; an ad in between does not break a run', () => {
    const r = runCategories([m('1', 'a', '40+'), ad('x'), m('2', 'a', '40+'), m('3', 'b', '40+'), m('4', 'b', '50+')]);
    expect([...r.hide]).toEqual([0, 2]);
    expect(r.head.get(0)).toBe('40+');
    expect(r.head.has(3)).toBe(false);
  });

  it('hides nothing on the head when the run has no category at all', () => {
    const r = runCategories([m('1', 'a'), m('2', 'a')]);
    expect(r.head.size).toBe(0);
  });
});

describe('firstOpenIndex', () => {
  it('skips voted, closed and non-match cards', () => {
    const cards = [ad('x'), m('1', 'a', undefined, { myVote: 'a' }), m('2', 'a', undefined, { closed: true }), m('3', 'a')];
    expect(firstOpenIndex(cards)).toBe(3);
  });
  it('counts the votes cast since the feed loaded', () => {
    expect(firstOpenIndex([m('1', 'a'), m('2', 'a')], new Set(['1']))).toBe(1);
    expect(firstOpenIndex([m('1', 'a')], new Set(['1']))).toBe(-1);
  });
});

describe('foldSlot («Για σένα» after the 3rd match)', () => {
  it('goes after the 3rd match card, even inside a long tournament run', () => {
    const cards = Array.from({ length: 14 }, (_, i) => m(String(i), 'aok'));
    expect(foldSlot(cards)).toBe(3);
  });
  it('reads across tournament runs and matches outside one', () => {
    expect(foldSlot([m('1', 'a'), m('2'), m('3', 'b'), m('4', 'c')])).toBe(3);
    expect(foldSlot([m('1'), m('2'), m('3'), m('4')])).toBe(3);
  });
  it('ads and put-off cards do not count', () => {
    const cards = [m('1', 'a'), ad('x'), m('2', 'a'), { kind: 'postponed', id: 'p' }, m('3', 'a'), m('4', 'a')];
    expect(foldSlot(cards)).toBe(5);
  });
  it('counts voted matches too', () => {
    const cards = [m('1', 'a', undefined, { myVote: 'a' }), m('2', 'a', undefined, { myVote: 'b' }), m('3', 'a'), m('4', 'a')];
    expect(foldSlot(cards)).toBe(3);
  });
  it('never splits a head from its run: a run that starts at the 3rd match gets it before its head', () => {
    expect(foldSlot([m('1', 'a'), m('2', 'a'), m('3', 'b'), m('4', 'b')])).toBe(2);
    expect(foldSlot([m('1', 'a'), m('2', 'a'), m('3', 'b'), ad('x'), m('4', 'b')])).toBe(2);
  });
  it('a run of one at the 3rd match is not split, so it goes after it', () => {
    expect(foldSlot([m('1', 'a'), m('2', 'a'), m('3', 'b'), m('4', 'c')])).toBe(3);
  });
  it('a shorter day: at the end of it', () => {
    expect(foldSlot([m('1', 'a'), m('2', 'a')])).toBe(2);
    expect(foldSlot([m('1', 'a'), ad('x')])).toBe(2);
  });
  it('stays above «Αύριο και μετά»', () => {
    const cards = [m('1', 'a'), m('2', 'a'), m('3', 'b'), m('4', 'b')];
    expect(foldSlot(cards, 2)).toBe(2);
    expect(foldSlot([m('1', 'a'), m('2', 'a'), m('3', 'a', undefined, { myVote: 'a' }), m('4', 'a')], 3)).toBe(3);
  });
  it('leads when nothing waits for a vote', () => {
    expect(foldSlot([m('1', 'a', undefined, { myVote: 'b' })])).toBe(0);
    expect(foldSlot([])).toBe(0);
  });
});

describe('categoryCase', () => {
  it('turns an organiser sheet\'s capitals into a normal case', () => {
    expect(categoryCase('MEDIUM')).toBe('Medium');
    expect(categoryCase('MEDIUM · Γυναικών')).toBe('Medium · Γυναικών');
    expect(categoryCase('ADVANCED 40+')).toBe('Advanced 40+');
    expect(categoryCase('ROOKIES 2')).toBe('Rookies 2');
    expect(categoryCase('MASTER')).toBe('Master');
  });
  it('keeps acronyms and short forms in capitals', () => {
    for (const s of ['ITF', 'ITF 40+', 'ATRP 2.5', 'AT 250 @ PRC ATRP 2.0', 'MED/ADV', 'ADV']) {
      expect(categoryCase(s)).toBe(s);
    }
  });
  it('leaves the rest as it is', () => {
    for (const s of ['40+', '-45 · Γυναικών', 'Μ 50+', 'Medium', 'Open', 'Μικτό', 'ΑΝΔΡΩΝ', 'U14', 'A1', 'ΜΕ', 'MD']) {
      expect(categoryCase(s)).toBe(s);
    }
  });
  it('does not touch a Latin word mixed with Greek or digits', () => {
    expect(categoryCase('MEDIUM2')).toBe('MEDIUM2');
    expect(categoryCase('ΑMEDIUM')).toBe('ΑMEDIUM');
  });
});

const result = (over: Partial<CardResult> = {}): CardResult => ({
  kind: 'result',
  id: 'r1',
  at: '2026-10-09T20:00:00Z',
  matchId: 'm1',
  ok: true,
  points: 10,
  streakBefore: 1,
  streak: 2,
  frozen: false,
  winnerSurname: 'Δρουλιάς',
  winnerFirst: 'Γιώργος',
  line: '',
  sets: '6-3, 6-4',
  pill: '+10 · σερί 2',
  ...over,
});

describe('resultStrip', () => {
  it('a right call: ✓, the winner and the pill', () => {
    expect(resultStrip(result(), t)).toEqual({ tick: true, name: 'Δρουλιάς', pill: '+10 · σερί 2' });
  });
  it('a miss says who won, neutral', () => {
    expect(resultStrip(result({ ok: false, pill: null }), t)).toEqual({ tick: false, name: 'Δρουλιάς κέρδισε', pill: null });
  });
  it('a doubles miss uses the plural', () => {
    expect(resultStrip(result({ ok: false, pill: null, winnerSurname: 'Δρουλιάς & Πράτσας' }), t).name).toBe('Δρουλιάς & Πράτσας κέρδισαν');
  });
});
