import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import { firstOpenIndex, foldSlot, resultStrip, runCategories, seenAdd, seenToggle, type CardResult, type SeenResults } from './feed';

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

describe('foldSlot («Για σένα» below the first vote)', () => {
  it('goes after the run of the first open match', () => {
    const cards = [m('1', 'a'), m('2', 'a'), m('3', 'b'), m('4', 'b')];
    expect(foldSlot(cards)).toBe(2);
  });
  it('goes right after a first open match outside a tournament', () => {
    expect(foldSlot([m('1'), m('2'), m('3', 'b')])).toBe(1);
  });
  it('passes a voted run first', () => {
    const cards = [m('1', 'a', undefined, { myVote: 'a' }), m('2', 'b'), m('3', 'b'), m('4', 'c')];
    expect(foldSlot(cards)).toBe(3);
  });
  it('stops before an ad', () => {
    expect(foldSlot([m('1', 'a'), ad('x'), m('2', 'a')])).toBe(1);
  });
  it('stays above «Αύριο και μετά»', () => {
    const cards = [m('1', 'a'), m('2', 'a'), m('3', 'a', undefined, { kind: 'match' })];
    expect(foldSlot(cards, 2)).toBe(2);
  });
  it('leads when nothing waits for a vote', () => {
    expect(foldSlot([m('1', 'a', undefined, { myVote: 'b' })])).toBe(0);
    expect(foldSlot([])).toBe(0);
  });
});

const result = (over: Partial<CardResult> = {}): CardResult => ({
  kind: 'result',
  id: 'r1',
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

describe('seen results (collapse state)', () => {
  const empty: SeenResults = { list: [], open: null };
  it('adds a played result once, in order', () => {
    let s = seenAdd(empty, result({ id: 'a' }));
    s = seenAdd(s, result({ id: 'b' }));
    s = seenAdd(s, result({ id: 'a' }));
    expect(s.list.map((c) => c.id)).toEqual(['a', 'b']);
  });
  it('a tap opens one strip, another tap folds it; opening another folds the first', () => {
    let s = seenAdd(seenAdd(empty, result({ id: 'a' })), result({ id: 'b' }));
    s = seenToggle(s, 'a');
    expect(s.open).toBe('a');
    s = seenToggle(s, 'b');
    expect(s.open).toBe('b');
    s = seenToggle(s, 'b');
    expect(s.open).toBeNull();
  });
  it('closing a reopened card through seenAdd folds it again', () => {
    let s = seenToggle(seenAdd(empty, result({ id: 'a' })), 'a');
    s = seenAdd(s, result({ id: 'a' }));
    expect(s.open).toBeNull();
  });
  it('ignores a tap on a strip that is not there', () => {
    expect(seenToggle(empty, 'x')).toBe(empty);
  });
});
