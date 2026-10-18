import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import type { MyMatchStats } from '@netprophet/db';
import { mockMatchStats } from '../mock/matchStats';
import { byRoundOrder, isFinalRound, matchStatsView, monthShort, pctText, peopleNames, periodLabel, share, tournamentLine, wl } from './matchStats';

const el = getCopy('el');
const en = getCopy('en');
const now = new Date('2026-10-18T10:00:00Z');

describe('match stats helpers', () => {
  it('won-lost, the share for a bar, the percent', () => {
    expect(wl(5, 2)).toBe('5-2');
    expect(share(3, 1)).toBe(0.75);
    expect(share(0, 0)).toBeNull();
    expect(pctText(65, el)).toBe('65%');
    expect(pctText(null, el)).toBe('-');
  });

  it('short months in Greek and English', () => {
    expect(monthShort('2026-10', el)).toBe('Οκτ 2026');
    expect(monthShort('2026-05', el)).toBe('Μαΐ 2026');
    expect(monthShort('2026-06', el)).not.toBe(monthShort('2026-07', el));
    expect(monthShort('2026-01', en)).toBe('Jan 2026');
  });

  it('a final, as imports store it or as an organiser types it; a semi-final is not', () => {
    expect(isFinalRound('final')).toBe(true);
    expect(isFinalRound('Τελικός')).toBe(true);
    expect(isFinalRound('ΤΕΛΙΚΟΣ')).toBe(true);
    expect(isFinalRound('Ημιτελικός')).toBe(false);
    expect(isFinalRound('semi')).toBe(false);
    expect(isFinalRound(null)).toBe(false);
  });

  it('how far you went: the title, the round you stopped at, or the record', () => {
    expect(tournamentLine({ won: 5, lost: 0, last_round: 'final', last_won: true }, el)).toBe('5-0 · Το πήρες!');
    expect(tournamentLine({ won: 3, lost: 1, last_round: 'semi', last_won: false }, el)).toBe('3-1 · Ημιτελικός · ήττα');
    expect(tournamentLine({ won: 2, lost: 1, last_round: 'Ομίλους', last_won: true }, el)).toBe('2-1 · Ομίλους · νίκη');
    expect(tournamentLine({ won: 1, lost: 1, last_round: null, last_won: false }, el)).toBe('1-1');
  });

  it('names, pairs joined', () => {
    expect(peopleNames([{ first_name: 'Νίκος', surname: 'Ψηλός' }, { first_name: 'Γιώργος', surname: 'Μέσος' }], el)).toBe('Νίκος Ψηλός και Γιώργος Μέσος');
  });

  it('rounds in draw order, an organiser\'s own words after', () => {
    const r = [{ key: 'final' }, { key: 'Όμιλοι' }, { key: 'quarter' }, { key: 'semi' }, { key: 'round16' }];
    expect(byRoundOrder(r).map((x) => x.key)).toEqual(['round16', 'quarter', 'semi', 'final', 'Όμιλοι']);
  });

  it('the period chips', () => {
    expect(['all', 'year', '12m'].map((p) => periodLabel(p as 'all', el))).toEqual(['Όλα', 'Φέτος', '12 μήνες']);
  });
});

describe('matchStatsView', () => {
  it('free: the big four, wins in lime, no sections, the lock', () => {
    const v = matchStatsView(mockMatchStats(now, false, 'all'), 'singles', el);
    expect(v.head.map((h) => h.value)).toEqual(['22', '16', '6', '73%']);
    expect(v.head.filter((h) => h.earned).map((h) => h.key)).toEqual(['won']);
    expect(v.sections).toEqual([]);
    expect(v.locked).toBe(true);
  });

  it('Pro singles: the sections in order, games noted, no partners', () => {
    const v = matchStatsView(mockMatchStats(now, true, 'all'), 'singles', el);
    expect(v.locked).toBe(false);
    expect(v.sections.map((s) => s.key)).toEqual(['form', 'months', 'sets', 'tight', 'where', 'tournaments', 'rounds', 'opponents', 'best_wins', 'other']);
    const sets = v.sections.find((s) => s.key === 'sets')!;
    expect(sets.rows[0]).toMatchObject({ label: 'Σετ', value: '31-18 · 63%' });
    expect(sets.rows[1]).toMatchObject({ label: 'Γκέιμ', note: 'Από 19 ματς με σκορ σε γκέιμ' });
    const tight = v.sections.find((s) => s.key === 'tight')!;
    expect(tight.rows.map((r) => [r.label, r.value])).toEqual([
      ['Tie-break', '5-2'],
      ['Super tie-break', '1-1'],
      ['Στο καθοριστικό σετ', '4-2'],
      ['Όταν χάνεις το πρώτο σετ', '3-4'],
      ['Όταν παίρνεις το πρώτο σετ', '13-2'],
    ]);
    const where = v.sections.find((s) => s.key === 'where')!;
    expect(where.rows.map((r) => r.label)).toEqual(['Χώμα', 'Σκληρό', 'Σε τουρνουά', 'Σε φιλικά', 'Ανδρών Β']);
    expect(v.sections.find((s) => s.key === 'tournaments')!.title).toBe('Τα τουρνουά σου · 3 τουρνουά');
    expect(v.sections.find((s) => s.key === 'rounds')!.rows.map((r) => r.label)).toContain('Τελικός');
    expect(v.sections.find((s) => s.key === 'best_wins')!.rows[0]).toMatchObject({ label: 'Νίκος Ροδίτης', note: 'Open Γλυφάδας · Τελικός' });
    expect(v.sections.find((s) => s.key === 'partners')).toBeUndefined();
  });

  it('Pro doubles: only what sets-only results can tell, and the partners', () => {
    const v = matchStatsView(mockMatchStats(now, true, 'all'), 'doubles', el);
    const keys = v.sections.map((s) => s.key);
    expect(keys).toContain('partners');
    expect(keys).not.toContain('months');
    const sets = v.sections.find((s) => s.key === 'sets')!;
    expect(sets.rows.map((r) => r.key)).toEqual(['sets', 'straight_won', 'straight_lost']);
    expect(v.sections.find((s) => s.key === 'tight')!.rows.map((r) => r.key)).toEqual(['deciding']);
    expect(keys).not.toContain('other');
  });

  it('no player, and a player with nothing in the period', () => {
    const base = mockMatchStats(now, true, 'year');
    const none: MyMatchStats = { ...base, has_player: false, singles: { played: 0, won: 0, lost: 0, win_pct: null, more: null } };
    const v = matchStatsView(none, 'singles', el);
    expect(v.noPlayer).toBe(true);
    expect(v.head.map((h) => h.value)).toEqual(['0', '0', '0', '-']);
    const empty: MyMatchStats = { ...base, singles: { played: 0, won: 0, lost: 0, win_pct: null, more: { ...base.singles.more!, walkovers: { won: 0, lost: 0 } } } };
    const e = matchStatsView(empty, 'singles', el);
    expect(e.empty).toBe(true);
    expect(e.sections).toEqual([]);
  });

  it('no vote words in any line', () => {
    const v = matchStatsView(mockMatchStats(now, true, 'all'), 'singles', el);
    const text = JSON.stringify(v);
    expect(text).not.toMatch(/ψήφ|πόντ|σερί|στοίχημα|απόδοση/);
    expect(text).not.toMatch(/—/);
  });
});
