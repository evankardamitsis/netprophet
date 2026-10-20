import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import type { MyMatchStats } from '@netprophet/db';
import { mockMatchStats } from '../mock/matchStats';
import {
  byRoundOrder,
  dayShort,
  formatLabel,
  formSquares,
  isFinalRound,
  lockedTitles,
  matchStatsView,
  monthShort,
  pctOf,
  pctText,
  peopleNames,
  periodFold,
  periodLabel,
  pickFormat,
  pressureTiles,
  share,
  shortName,
  sideNames,
  tournamentLine,
  wl,
} from './matchStats';

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

describe('format, form and names', () => {
  const part = (played: number) => ({ played, won: 0, lost: 0, win_pct: null, more: null });

  it('opens on the format you play most; a tie stays on singles', () => {
    expect(pickFormat({ singles: part(0), doubles: part(2) })).toBe('doubles');
    expect(pickFormat({ singles: part(5), doubles: part(2) })).toBe('singles');
    expect(pickFormat({ singles: part(3), doubles: part(3) })).toBe('singles');
    expect(pickFormat({ singles: part(0), doubles: part(0) })).toBe('singles');
  });

  it('the toggle carries the count', () => {
    expect(formatLabel({ singles: part(0), doubles: part(2) }, 'doubles', el)).toBe('Διπλά · 2');
    expect(formatLabel({ singles: part(0), doubles: part(2) }, 'singles', en)).toBe('Singles · 0');
  });

  it('form: this format only, inside the period, oldest first', () => {
    const last = [
      { win: true, format: 'doubles' as const, startsAt: '2026-10-12T10:00:00Z' },
      { win: false, format: 'singles' as const, startsAt: '2026-10-05T10:00:00Z' },
      { win: false, format: 'doubles' as const, startsAt: '2026-09-01T10:00:00Z' },
      { win: true, format: 'doubles' as const, startsAt: '2025-06-01T10:00:00Z' },
    ];
    expect(formSquares(last, 'doubles', null)).toEqual([true, false, true]);
    expect(formSquares(last, 'doubles', '2026-01-01')).toEqual([false, true]);
    expect(formSquares(last, 'singles', null)).toEqual([false]);
    expect(formSquares([], 'singles', null)).toEqual([]);
  });

  it('initial and surname; one person in full, a pair short', () => {
    expect(shortName({ first_name: 'Χρήστος', surname: 'Καραγιανίδης' })).toBe('Χ. Καραγιανίδης');
    expect(shortName({ first_name: 'Χρήστος', surname: '' })).toBe('Χρήστος');
    expect(sideNames([{ first_name: 'Νίκος', surname: 'Ροδίτης' }], el)).toBe('Νίκος Ροδίτης');
    expect(sideNames([{ first_name: 'Χρήστος', surname: 'Καραγιανίδης' }, { first_name: 'Νίκος', surname: 'Ροδίτης' }], el)).toBe('Χ. Καραγιανίδης και Ν. Ροδίτης');
  });

  it('percent from won and lost, a date, the period control', () => {
    expect(pctOf(2, 1, el)).toBe('67%');
    expect(pctOf(0, 0, el)).toBeNull();
    expect(dayShort('2026-09-14T18:00:00Z', el)).toBe('14 Σεπ 2026');
    expect(periodFold('all', false, el)).toBe('Όλα ↓');
    expect(periodFold('12m', true, el)).toBe('12 μήνες ↑');
  });
});

describe('matchStatsView', () => {
  it('free: the hero with wins and the earned rate, no blocks, the lock with every title', () => {
    const v = matchStatsView(mockMatchStats(now, false, 'all'), 'singles', el);
    expect(v.hero).toMatchObject({ won: 16, lost: 6, played: '22 ματς', pct: '73%', pctEarned: true, runs: null });
    expect(v.blocks).toEqual([]);
    expect(v.locked).toBe(true);
    expect(lockedTitles('singles', el)).not.toContain('Παρτενέρ');
    expect(lockedTitles('doubles', el)[0]).toBe('Σετ και γκέιμ');
    expect(lockedTitles('doubles', el)).toContain('Παρτενέρ');
  });

  it('a rate without a win is never lime', () => {
    const base = mockMatchStats(now, false, 'all');
    const v = matchStatsView({ ...base, singles: { played: 2, won: 0, lost: 2, win_pct: 0, more: null } }, 'singles', el);
    expect(v.hero.pctEarned).toBe(false);
  });

  it('Pro singles: every block in order, no partners', () => {
    const v = matchStatsView(mockMatchStats(now, true, 'all'), 'singles', el);
    expect(v.locked).toBe(false);
    expect(v.hero.runs).toEqual({ current: 2, best: 4 });
    expect(v.blocks.map((b) => b.key)).toEqual(['sets', 'pressure', 'surface', 'category', 'rounds', 'kinds', 'months', 'opponents', 'best_wins', 'tournaments']);
    const sets = v.blocks.find((b) => b.kind === 'sets')!;
    expect(sets.kind === 'sets' && sets.rows[0]).toMatchObject({ label: 'Σετ', value: '31-18', pct: '63%' });
    expect(sets.kind === 'sets' && sets.rows[1]).toMatchObject({ label: 'Γκέιμ', note: 'Από 19 ματς με σκορ σε γκέιμ' });
    const surface = v.blocks.find((b) => b.kind === 'surface')!;
    expect(surface.kind === 'surface' && surface.rows.map((r) => [r.surface, r.label, r.value])).toEqual([
      ['clay', 'Χώμα', '9-3'],
      ['hard', 'Σκληρό', '2-2'],
    ]);
    const rounds = v.blocks.find((b) => b.kind === 'rounds')!;
    expect(rounds.kind === 'rounds' && rounds.rows.map((r) => r.label)).toEqual(['Δεύτερος γύρος', 'Προημιτελικός', 'Ημιτελικός', 'Τελικός']);
    expect(rounds.kind === 'rounds' && rounds.rows[3]!.depth).toBe(1);
    const months = v.blocks.find((b) => b.kind === 'months')!;
    expect(months.kind === 'months' && Math.max(...months.bars.map((b) => b.height))).toBe(1);
    const best = v.blocks.find((b) => b.kind === 'bestWins')!;
    expect(best.kind === 'bestWins' && best.wins[0]).toMatchObject({ names: 'Νίκος Ροδίτης', partner: null });
    expect(best.kind === 'bestWins' && best.wins[0]!.meta).toMatch(/^Open Γλυφάδας · Τελικός · \d+ /);
    const tours = v.blocks.find((b) => b.kind === 'tournaments')!;
    expect(tours.title).toBe('Τα τουρνουά σου · 3 τουρνουά');
    expect(tours.kind === 'tournaments' && tours.rows.map((r) => [r.champion, r.line])).toEqual([
      [true, 'Το πήρες!'],
      [false, 'Ημιτελικός · ήττα'],
      [false, 'Δεύτερος γύρος · ήττα'],
    ]);
    expect(tours.kind === 'tournaments' && tours.more).toBeNull();
  });

  it('pressure: x of y, comebacks explained, counts, retirements and walkovers', () => {
    const m = mockMatchStats(now, true, 'all').singles.more!;
    const tiles = pressureTiles(m, el);
    expect(tiles.map((x) => [x.label, x.value])).toEqual([
      ['Καθοριστικό σετ', '4/6'],
      ['Tie-break', '5/7'],
      ['Super tie-break', '1/2'],
      ['Ανατροπές', '3/7'],
      ['Κράτησες το προβάδισμα', '13/15'],
      ['Καθαρές νίκες', '10'],
      ['Καθαρές ήττες', '3'],
      ['Εγκαταλείψεις', '1-0'],
      ['Χωρίς να παιχτεί (w.o.)', '1-0'],
    ]);
    expect(tiles.find((x) => x.key === 'comebacks')!.note).toBe('Νίκες αφού έχασες το πρώτο σετ');
    expect(tiles.find((x) => x.key === 'deciding')!.note).toBe('Ματς που πήγαν στο 3ο σετ');
    expect(pressureTiles({ ...m, best_of: 5 }, en).find((x) => x.key === 'deciding')!.note).toBe('Matches that went to set 5');
  });

  it('Pro doubles: only what sets-only results can tell; empty blocks hidden; partners before opponents', () => {
    const v = matchStatsView(mockMatchStats(now, true, 'all'), 'doubles', el);
    const keys = v.blocks.map((b) => b.key);
    expect(keys).toEqual(['sets', 'pressure', 'kinds', 'partners', 'opponents']);
    const sets = v.blocks.find((b) => b.kind === 'sets')!;
    expect(sets.kind === 'sets' && sets.rows.map((r) => r.key)).toEqual(['sets']);
    const pressure = v.blocks.find((b) => b.kind === 'pressure')!;
    expect(pressure.kind === 'pressure' && pressure.tiles.map((x) => x.key)).toEqual(['deciding', 'straight_won', 'straight_lost']);
    const mates = v.blocks.find((b) => b.key === 'partners')!;
    expect(mates.kind === 'people' && mates.rows[0]).toMatchObject({ name: 'Πέτρος Δρόσος', initials: 'ΠΔ', meta: '4 ματς μαζί', value: '3-1' });
  });

  it('a doubles best win names the pair short and the partner', () => {
    const base = mockMatchStats(now, true, 'all');
    const more = base.doubles.more!;
    const p = (first_name: string, surname: string) => ({ player_id: first_name, first_name, surname, gender: 'm' as const });
    const win = { match_id: 'w', starts_at: null, sets: [], score_summary: '2-0', retired: false, round: null, opponents: [p('Χρήστος', 'Καραγιανίδης'), p('Νίκος', 'Ροδίτης')], partners: [p('Πέτρος', 'Δρόσος')], tournament: null };
    const v = matchStatsView({ ...base, doubles: { ...base.doubles, more: { ...more, best_wins: [win], tournaments: { count: 14, list: [{ tournament_id: 't', name: 'Open', starts_on: null, played: 1, won: 1, lost: 0, last_round: null, last_won: true }] } } } }, 'doubles', el);
    const best = v.blocks.find((b) => b.kind === 'bestWins')!;
    expect(best.kind === 'bestWins' && best.wins[0]).toMatchObject({ names: 'Χ. Καραγιανίδης και Ν. Ροδίτης', partner: 'Παρτενέρ: Πέτρος Δρόσος', meta: null, score: '2-0' });
    const tours = v.blocks.find((b) => b.kind === 'tournaments')!;
    expect(tours.kind === 'tournaments' && tours.more).toBe('Και 13 ακόμα');
    expect(tours.kind === 'tournaments' && tours.rows[0]).toMatchObject({ meta: '1 ματς', line: null, champion: false });
  });

  it('no player, and a player with nothing in the period', () => {
    const base = mockMatchStats(now, true, 'year');
    const none: MyMatchStats = { ...base, has_player: false, singles: { played: 0, won: 0, lost: 0, win_pct: null, more: null } };
    const v = matchStatsView(none, 'singles', el);
    expect(v.noPlayer).toBe(true);
    expect(v.hero).toMatchObject({ won: 0, lost: 0, pct: '-', pctEarned: false });
    const empty: MyMatchStats = { ...base, singles: { played: 0, won: 0, lost: 0, win_pct: null, more: { ...base.singles.more!, walkovers: { won: 0, lost: 0 } } } };
    const e = matchStatsView(empty, 'singles', el);
    expect(e.empty).toBe(true);
    expect(e.blocks).toEqual([]);
    expect(e.hero.runs).toBeNull();
  });

  it('no vote words and no em dash in any line, in both languages', () => {
    for (const t of [el, en]) {
      const text = JSON.stringify([matchStatsView(mockMatchStats(now, true, 'all'), 'singles', t), matchStatsView(mockMatchStats(now, true, 'all'), 'doubles', t)]);
      expect(text).not.toMatch(/ψήφ|πόντ|σερί|στοίχημα|απόδοση|vote|point|bet/i);
      expect(text).not.toMatch(/\u2014/);
    }
  });
});
