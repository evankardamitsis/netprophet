import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import type { MySeason, WinCard } from '@netprophet/db';
import { arrowOf, isMyWin, monthIn, monthName, opponentsWho, seasonMessage, seasonView, winCardMessage, winCardView } from './season';
import { SHARE_URL } from './ballerShare';

const el = getCopy('el');
const en = getCopy('en');

const nikos = { first_name: 'Νίκος', surname: 'Ψηλός', gender: 'm' as const };
const maria = { first_name: 'Μαρία', surname: 'Καρρά', gender: 'f' as const };
const eleni = { first_name: 'Ελένη', surname: 'Ροδίτη', gender: null };

const free: MySeason = {
  month: '2026-10',
  prev_month: '2026-09',
  pro: false,
  has_player: true,
  now: { played: 5, won: 4, lost: 1, points: 40 },
  prev: null,
  free_card: 'm1',
};

const pro: MySeason = {
  ...free,
  pro: true,
  now: {
    played: 5,
    won: 4,
    lost: 1,
    points: 40,
    sets_won: 9,
    sets_lost: 3,
    win_run: 3,
    deciding: { w: 1, l: 1 },
    tiebreaks: { w: 1, l: 0 },
    tournaments: 2,
    best_streak: 4,
    best_win: { match_id: 'm3', starts_at: '2026-10-13T07:00:00Z', sets: [{ w: 7, l: 6, tb: [7, 4] }, { w: 6, l: 2 }], score_summary: '2-0', opponents: [nikos], tournament: 'Κύπελλο' },
    ladder: { tier: 'silver', position: 2, size: 20, closed: false },
  },
  prev: { played: 1, won: 1, lost: 0, points: 40, sets_won: 2, sets_lost: 0, win_run: 1, deciding: { w: 0, l: 0 }, tiebreaks: { w: 0, l: 0 }, tournaments: 0, best_streak: 10, best_win: null, ladder: null },
};

describe('months', () => {
  it('names the month and puts it in the accusative in Greek', () => {
    expect(monthName('2026-10', el)).toBe('Οκτώβριος');
    expect(monthIn('2026-09', el)).toBe('τον Σεπτέμβριο');
    expect(monthIn('2026-05', el)).toBe('τον Μάιο');
    expect(monthIn('2026-10', en)).toBe('October');
  });
});

describe('opponents in a sentence', () => {
  it('uses the article and the accusative', () => {
    expect(opponentsWho([nikos], el)).toBe('τον Νίκο Ψηλό');
    expect(opponentsWho([maria], el)).toBe('την Μαρία Καρρά');
    expect(opponentsWho([nikos, maria], el)).toBe('τους Νίκο Ψηλό και Μαρία Καρρά');
    expect(opponentsWho([maria, eleni], el)).toBe('τις Μαρία Καρρά και Ελένη Ροδίτη');
    expect(opponentsWho([nikos], en)).toBe('Νίκος Ψηλός');
  });
});

describe('arrows', () => {
  it('compares with last month', () => {
    expect(arrowOf(4, 1)).toBe('↑');
    expect(arrowOf(1, 4)).toBe('↓');
    expect(arrowOf(2, 2)).toBe('=');
    expect(arrowOf(2, undefined)).toBeNull();
  });
});

describe('season view', () => {
  it('free: the four numbers, no Pro part, no arrows', () => {
    const v = seasonView(free, el);
    expect(v.kicker).toBe('ΟΚΤΩΒΡΙΟΣ 2026');
    expect(v.free.map((s) => `${s.value} ${s.label}`)).toEqual(['5 ματς', '4 νίκες', '1 ήττες', '40 πόντοι']);
    expect(v.free.every((s) => s.arrow === null)).toBe(true);
    expect(v.more).toBeNull();
    expect(v.vsLast).toBeNull();
    expect(v.bestWin).toBeNull();
    expect(v.freeCard).toBe('m1');
  });
  it('lime only on what was earned', () => {
    const v = seasonView(pro, el);
    expect([...v.free, ...v.more!].filter((s) => s.earned).map((s) => s.key)).toEqual(['won', 'points', 'win_run', 'best_streak']);
  });
  it('Pro: the whole month with arrows against the one before', () => {
    const v = seasonView(pro, el);
    expect(v.free.map((s) => s.arrow)).toEqual(['↑', '↑', '↑', '=']);
    expect(v.more!.map((s) => `${s.key}:${s.value}:${s.arrow}`)).toEqual([
      'sets:9-3:↑',
      'win_run:3:↑',
      'best_streak:4:↓',
      'deciding:1-1:↑',
      'tiebreaks:1-0:↑',
      'tournaments:2:↑',
    ]);
    expect(v.vsLast).toBe('↑ ↓ σε σχέση με τον Σεπτέμβριο');
    expect(v.bestWin).toEqual({ matchId: 'm3', line: 'Νίκη απέναντι στον Νίκο Ψηλό', score: '7-6(4), 6-2', where: 'Κύπελλο' });
    expect(v.ladder).toEqual({ label: 'Ladder · Ασημένια', value: '2ος από 20' });
  });
  it('says when there is no player or no match', () => {
    expect(seasonView({ ...free, has_player: false, now: { played: 0, won: 0, lost: 0, points: 12 } }, el).noPlayer).toBe(true);
    const none = seasonView({ ...free, now: { played: 0, won: 0, lost: 0, points: 12 } }, el);
    expect(none.noPlayer).toBe(false);
    expect(none.noMatches).toBe(true);
  });
  it('the share message counts wins, or points without matches', () => {
    expect(seasonMessage(free, el)).toBe(`Η σεζόν μου στο NetProphet: 4 νίκες σε 5 ματς τον Οκτώβριο. ${SHARE_URL}`);
    expect(seasonMessage({ ...free, now: { played: 0, won: 0, lost: 0, points: 12 } }, el)).toBe(`Η σεζόν μου στο NetProphet: 12 πόντοι τον Οκτώβριο. ${SHARE_URL}`);
  });
});

const card: WinCard = {
  match_id: 'm3',
  starts_at: '2026-10-13T21:30:00Z',
  format: 'singles',
  tournament: 'Κύπελλο Σεζόν',
  category: 'Ανδρών Α',
  round: 'final',
  sets: [{ w: 7, l: 6, tb: [7, 4] }, { w: 6, l: 2 }],
  score_summary: '2-0',
  retired: false,
  me: [{ first_name: 'Βαγγέλης', surname: 'Σεζόν', gender: 'm' }],
  opponents: [nikos],
  pro: true,
  free: false,
};

describe('win card', () => {
  it('the score big, whom you beat, where and when (Athens)', () => {
    const v = winCardView(card, el);
    expect(v.label).toBe('ΝΙΚΗ');
    expect(v.sets).toEqual(['7-6', '6-2']);
    expect(v.score).toBe('7-6(4), 6-2');
    expect(v.against).toBe('απέναντι στον Νίκο Ψηλό');
    expect(v.event).toBe('Κύπελλο Σεζόν · Ανδρών Α · Τελικός');
    expect(v.date).toBe('14/10/2026');
    expect(v.owner).toBe('Βαγγέλης Σ.');
  });
  it('a player-logged win has only the sets; a friendly says so', () => {
    const v = winCardView({ ...card, sets: [], score_summary: '2-1', tournament: null, category: null, round: null }, el);
    expect(v.sets).toEqual(['2-1']);
    expect(v.score).toBe('2-1');
    expect(v.event).toBe('Φιλικά');
  });
  it('doubles: both opponents and both of you', () => {
    const v = winCardView({ ...card, format: 'doubles', me: [card.me[0]!, { first_name: 'Γιώργος', surname: 'Μέσος', gender: 'm' }], opponents: [nikos, maria] }, el);
    expect(v.against).toBe('απέναντι στους Νίκο Ψηλό και Μαρία Καρρά');
    expect(v.owner).toBe('Βαγγέλης Σ. & Γιώργος Μ.');
  });
  it('the message', () => {
    expect(winCardMessage(card, el)).toBe(`Νίκη 7-6(4), 6-2 απέναντι στον Νίκο Ψηλό. Παίξε κι εσύ: ${SHARE_URL}`);
  });
});

describe('your own wins', () => {
  const row = {
    winner_side: 1 as const,
    walkover: false,
    sides: [
      { side: 1 as const, players: [{ id: 'me' }] },
      { side: 2 as const, players: [{ id: 'them' }] },
    ],
  } as unknown as Parameters<typeof isMyWin>[0];
  it('only when your player won, never a walkover', () => {
    expect(isMyWin(row, 'me')).toBe(true);
    expect(isMyWin(row, 'them')).toBe(false);
    expect(isMyWin(row, null)).toBe(false);
    expect(isMyWin({ ...row, walkover: true }, 'me')).toBe(false);
  });
});
