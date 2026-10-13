import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import type { DrawMatchRow, GetTournamentResult, TournamentDraw, TournamentItem, TournamentMatch } from '@netprophet/db';
import { boldLine, bracketRounds, chipOf, dayChips, defaultDay, defaultSegment, mineHeadline, mineRows, openCount, roundName, scheduleRows, sectionsOf, subLine } from './tournaments';

const t = getCopy('el');

const item = (over: Partial<TournamentItem>): TournamentItem => ({
  id: 'a', name: 'Open Γλυφάδας', venue: 'Γήπεδα Γλυφάδας', area_id: null, surface: null, starts_on: '2026-10-17', ends_on: '2026-10-18',
  entry_deadline: null, level_min: null, level_max: null, state: 'upcoming', draws: 0, matches: 0, today: 0, in_it: false, ...over,
});

const player = (id: string, surname: string, first: string) => ({ id, first_name: first, surname, photo_path: null, area_id: null, level_tier: null, level_direction: null });
const match = (over: Partial<TournamentMatch>): TournamentMatch => ({
  match_id: 'm', starts_at: '2026-10-17T07:00:00Z', format: 'singles', status: 'scheduled', level: 'Μ 40+', discipline: 'MS', round: null,
  sides: [{ side: 1, players: [player('p1', 'Ροδίτης', 'Νίκος')] }, { side: 2, players: [player('p2', 'Δεσύπρης', 'Γιώργος')] }],
  winner_side: null, sets: null, retired: false, walkover: false, ...over,
});

describe('list', () => {
  it('chip: in it is lime, else by state', () => {
    expect(chipOf(item({ in_it: true }), '2026-10-13', t)).toEqual({ text: 'παίζεις', hot: true });
    expect(chipOf(item({ state: 'ongoing' }), '2026-10-13', t).text).toBe('σε εξέλιξη');
    expect(chipOf(item({ state: 'done' }), '2026-10-13', t).text).toBe('τελείωσε');
    expect(chipOf(item({}), '2026-10-13', t).text).toBe('σε 4 μέρες');
    expect(chipOf(item({}), '2026-10-16', t).text).toBe('αύριο');
  });
  it('sub and bold lines leave out what is missing', () => {
    expect(subLine(item({}), t)).toBe('Γήπεδα Γλυφάδας · 17/10 έως 18/10');
    expect(subLine(item({ venue: null, starts_on: null, ends_on: null }), t)).toBe('');
    expect(boldLine(item({ draws: 3, today: 12 }), t)).toBe('3 ταμπλό · 12 ματς σήμερα');
    expect(boldLine(item({ draws: 2 }), t)).toBe('2 ταμπλό');
    expect(boldLine(item({}), t)).toBeNull();
  });
  it('sections in order, only the ones with items; the count leaves out finished', () => {
    const items = [item({ id: '1', state: 'done' }), item({ id: '2', state: 'ongoing' }), item({ id: '3', state: 'upcoming' })];
    expect(sectionsOf(items, t).map((s) => s.title)).toEqual(['Τώρα', 'Έρχονται', 'Τελείωσαν']);
    expect(sectionsOf([], t)).toEqual([]);
    expect(openCount(items)).toBe(2);
    expect(openCount(null)).toBe(0);
  });
});

describe('Το πρόγραμμά σου', () => {
  const mine = [{ ...match({ starts_at: '2026-10-17T07:00:00Z' }), tournament_id: 't', tournament: 'Open Γλυφάδας' }];
  it('rows and headline from my first match', () => {
    expect(mineRows(mine, t)).toEqual([{ key: 'm', when: 'Σαβ 17/10 · 10:00', what: 'Open Γλυφάδας · Μ 40+' }]);
    expect(mineHeadline(mine, '2026-10-13', t)).toBe('Παίζεις Σάββατο 10:00');
    expect(mineHeadline(mine, '2026-10-17', t)).toBe('Παίζεις σήμερα 10:00');
    expect(mineHeadline(mine, '2026-10-16', t)).toBe('Παίζεις αύριο 10:00');
    expect(mineHeadline([], '2026-10-16', t)).toBeNull();
  });
});

describe('schedule', () => {
  const days: GetTournamentResult['days'] = [
    { date: '2026-10-12', matches: [match({})] },
    { date: '2026-10-14', matches: [match({})] },
    { date: '2026-10-20', matches: [match({})] },
  ];
  it('day chips and default day', () => {
    expect(dayChips(days, '2026-10-13', t).map((c) => c.label)).toEqual(['Δευ 12/10', 'Αύριο', 'Τρι 20/10']);
    expect(dayChips(days, '2026-10-12', t).map((c) => c.label)[0]).toBe('Σήμερα');
    expect(dayChips(days, '2026-10-12', t)[1]!.label).toBe('Τετ 14/10');
    // 12 and 14 are both one day from the 13th: the later wins
    expect(defaultDay(days, '2026-10-13')).toBe('2026-10-14');
    expect(defaultDay(days, '2026-10-20')).toBe('2026-10-20');
    expect(defaultDay([], '2026-10-13')).toBeNull();
  });
  it('segment: Πρόγραμμα when there are matches today, else Ταμπλό', () => {
    const draws = [{}] as TournamentDraw[];
    expect(defaultSegment({ days, draws }, '2026-10-12')).toBe('schedule');
    expect(defaultSegment({ days, draws }, '2026-10-13')).toBe('bracket');
    expect(defaultSegment({ days, draws: [] }, '2026-10-13')).toBe('schedule');
    expect(defaultSegment({ days: [], draws }, '2026-10-12')).toBe('bracket');
  });
  it('rows by time, mine marked, winner and score', () => {
    const rows = scheduleRows(
      [
        match({ match_id: 'late', starts_at: '2026-10-17T15:00:00Z' }),
        match({ match_id: 'early', starts_at: '2026-10-17T07:00:00Z', winner_side: 1, sets: [{ w: 6, l: 4 }, { w: 7, l: 6, tb: [7, 5] }] }),
      ],
      'p2',
      t,
    );
    expect(rows.map((r) => r.id)).toEqual(['early', 'late']);
    expect(rows[0]).toMatchObject({ time: '10:00', meta: 'Μ 40+ · Απλό', score: '6-4, 7-6(5)', mine: true });
    expect(rows[0]!.sides.map((s) => s.winner)).toEqual([true, false]);
    expect(rows[1]!.score).toBeNull();
    expect(rows[0]).toMatchObject({ postponed: false, movedFrom: null });
  });
  it('a put-off match says «Αναβολή» and goes last; a moved one says where from', () => {
    const rows = scheduleRows(
      [
        match({ match_id: 'off', starts_at: null, postponed: true }),
        match({ match_id: 'moved', starts_at: '2026-10-17T15:00:00Z', moved_from: '2026-10-13T15:30:00Z' }),
      ],
      null,
      t,
    );
    expect(rows.map((r) => r.id)).toEqual(['moved', 'off']);
    expect(rows[0]).toMatchObject({ time: '18:00', postponed: false, movedFrom: 'από Τρι 13/10' });
    expect(rows[1]).toMatchObject({ time: 'Αναβολή', postponed: true, movedFrom: null });
  });
});

describe('draws', () => {
  it('names the last three rounds from the end', () => {
    expect([0, 1, 2, 3, 4].map((i) => roundName(i, 5, t))).toEqual(['1ος γύρος', '2ος γύρος', 'Προημιτελικά', 'Ημιτελικά', 'Τελικός']);
    expect([0, 1].map((i) => roundName(i, 2, t))).toEqual(['Ημιτελικά', 'Τελικός']);
  });

  const m = (over: Partial<DrawMatchRow>): DrawMatchRow => ({ round: 1, slot: 1, side1: null, side2: null, winner: null, bye: false, scoreRaw: '', walkover: false, retired: false, when: '', deadline: null, ...over });
  const draw: TournamentDraw = {
    tab: 'Μ 40+', title: '', discipline: 'MS', level: 'Μ 40+', format: 'knockout', size: 4, updated_at: '',
    entrants: [
      { pos: 1, raw: 'ΡΟΔΙΤΗΣ ΝΙΚΟΣ', seed: 1, bye: false, players: [{ raw: 'ΡΟΔΙΤΗΣ ΝΙΚΟΣ', player_id: 'nik' }] },
      { pos: 2, raw: 'ΒΥΕ', seed: null, bye: true, players: [] },
      { pos: 3, raw: 'ΠΡΑΤΣΑΣ ΓΙΑΝΝΗΣ', seed: null, bye: false, players: [{ raw: 'ΠΡΑΤΣΑΣ ΓΙΑΝΝΗΣ', player_id: 'ale' }] },
      { pos: 4, raw: 'ΜΕΜΜΟΣ ΗΛΙΑΣ', seed: null, bye: false, players: [{ raw: 'ΜΕΜΜΟΣ ΗΛΙΑΣ', player_id: null }] },
    ],
    rounds: [
      [m({ side1: 'ΡΟΔΙΤΗΣ ΝΙΚΟΣ', side2: 'ΒΥΕ', bye: true }), m({ slot: 2, side1: 'ΠΡΑΤΣΑΣ ΓΙΑΝΝΗΣ', side2: 'ΜΕΜΜΟΣ ΗΛΙΑΣ', winner: 2, scoreRaw: '64 63' })],
      [m({ round: 2, side1: 'Ροδίτης Νίκος', side2: 'ΜΕΜΜΟΣ ΗΛΙΑΣ', when: 'ΔΕΥ 18.30', deadline: '2026-10-14' }), m({ round: 2, slot: 2, side1: null, side2: null, deadline: '2026-10-14' })],
    ],
  };
  it('seeds, byes, winners, links and the line under a match', () => {
    const r = bracketRounds(draw, [], t);
    expect(r.map((x) => x.name)).toEqual(['Ημιτελικά', 'Τελικός']);
    const [bye, played] = r[0]!.matches;
    expect(bye!.sides[0].seed).toBe(1);
    expect(bye!.sides[0].parts).toEqual([{ text: 'ΡΟΔΙΤΗΣ ΝΙΚΟΣ', playerId: 'nik' }]);
    expect(bye!.sides[1].bye).toBe(true);
    expect(bye!.advances).toBe(1);
    expect(bye!.line).toBe('');
    expect(played!.winner).toBe(2);
    expect(played!.line).toBe('64 63');
    expect(played!.sides[1].parts[0]!.playerId).toBeNull();
    const [later, empty] = r[1]!.matches;
    // names match across accents, case and the final sigma
    expect(later!.sides[0].parts[0]!.playerId).toBe('nik');
    expect(later!.line).toBe('ΔΕΥ 18.30');
    expect(empty!.sides[0].empty).toBe(true);
    expect(empty!.line).toBe('έως 14/10');
  });
  it('masked names show as a dash and do not link', () => {
    const r = bracketRounds(draw, ['ΠΡΑΤΣΑΣ ΓΙΑΝΝΗΣ'], t);
    expect(r[0]!.matches[1]!.sides[0].parts).toEqual([{ text: '–', playerId: null }]);
  });
});
