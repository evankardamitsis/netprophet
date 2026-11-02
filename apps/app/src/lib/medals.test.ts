import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import { cosmetics } from '@netprophet/tokens';
import type { LeagueCelebration, MonthMedal } from '@netprophet/db';
import { leagueCelebrationView } from './ladder';
import { medalAria, medalMonth, medalName, medalTone, monthLabel, shelfOf } from './medals';

const el = getCopy('el');
const en = getCopy('en');

describe('month medals', () => {
  it('names the medal by place, Greek first', () => {
    expect([1, 2, 3].map((p) => medalName(p as 1 | 2 | 3, el))).toEqual(['Χρυσό μετάλλιο', 'Ασημένιο μετάλλιο', 'Χάλκινο μετάλλιο']);
    expect(medalName(1, en)).toBe('Gold medal');
  });

  it('shows the month as the founder wrote it', () => {
    expect(medalMonth('2026-11', el)).toBe('Νοέμβριος 2026');
    expect(monthLabel('2026-10', el)).toEqual({ month: 'Οκτώβριος', year: '2026' });
    expect(medalMonth('2026-10', en)).toBe('October 2026');
  });

  it('reads out the medal, the month and the Κατηγορία', () => {
    expect(medalAria({ month: '2026-10', place: 2, tier: 'bronze' }, el)).toBe('Ασημένιο μετάλλιο, Οκτώβριος 2026, Χάλκινη');
  });

  it('takes its colours from the tokens', () => {
    expect(medalTone(1)).toEqual({ face: cosmetics.medal.gold, rim: cosmetics.medal.goldRim });
    expect(medalTone(3).face).toBe(cosmetics.medal.bronze);
  });

  it('puts the newest month first and drops anything malformed', () => {
    const rows = [
      { month: '2026-10', place: 1, tier: 'bronze' },
      { month: '2026-12', place: 3, tier: 'silver' },
      { month: 'bad', place: 1, tier: 'bronze' },
      { month: '2026-11', place: 4, tier: 'bronze' },
    ] as unknown as MonthMedal[];
    expect(shelfOf(rows).map((m) => m.month)).toEqual(['2026-12', '2026-10']);
    expect(shelfOf(null)).toEqual([]);
  });
});

describe('the month close moment', () => {
  const moment = (payload: Partial<LeagueCelebration['payload']>): LeagueCelebration => ({
    id: 'c',
    created_at: '2026-11-01T00:00:00Z',
    payload: { type: 'league', month: '2026-10', tier: 'bronze', position: 2, movement: 'promote', next_tier: 'silver', award: true, ...payload },
  });

  it('names the medal when there is one', () => {
    expect(leagueCelebrationView(moment({ medal: 1 }), el).reward).toBe('Χρυσό μετάλλιο, Frame και badge');
  });

  it('keeps the old line for moments from before the medals', () => {
    expect(leagueCelebrationView(moment({}), el).reward).toBe(el.ladder.league.award);
  });

  it('staff on top get the next month line, no prize', () => {
    expect(leagueCelebrationView(moment({ position: 1, award: false, medal: null }), el).reward).toBe('Κατηγορία τον άλλο μήνα: Ασημένια');
  });
});
