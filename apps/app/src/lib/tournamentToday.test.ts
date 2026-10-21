import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import type { GetTournamentResult, TournamentDraw, TournamentMatch } from '@netprophet/db';
import { drawsOf, ifWins, nowNext, openingDay, pathKeys, playerPath, yoursSet, yoursToday } from './tournamentToday';

const t = getCopy('el');

const player = (id: string, surname: string, first: string) => ({ id, first_name: first, surname, photo_path: null, area_id: null, level_tier: null, level_direction: null });
const NIK = player('nik', 'Ροδίτης', 'Νίκος');
const GIO = player('gio', 'Δεσύπρης', 'Γιώργος');
const ALE = player('ale', 'Πράτσας', 'Γιάννης');
const PAV = player('pav', 'Μέμμος', 'Ηλίας');

const match = (id: string, at: string | null, a = NIK, b = GIO, over: Partial<TournamentMatch> = {}): TournamentMatch => ({
  match_id: id, starts_at: at, format: 'singles', status: 'scheduled', level: 'Μ 40+', discipline: 'MS', round: null,
  sides: [{ side: 1, players: [a] }, { side: 2, players: [b] }],
  winner_side: null, sets: null, retired: false, walkover: false, club: 'Γήπεδα Γλυφάδας', court: 'Γήπεδο 1', ...over,
});

const day = (date: string, matches: TournamentMatch[]) => ({ date, matches });

describe('openingDay', () => {
  const days = [day('2026-10-19', [match('a', '2026-10-19T07:00:00Z')]), day('2026-10-21', [match('b', '2026-10-21T07:00:00Z')]), day('2026-10-23', [match('c', '2026-10-23T07:00:00Z')])];
  it('today when it plays today', () => expect(openingDay(days, '2026-10-21')).toBe('2026-10-21'));
  it('else the next day with matches, never an earlier one', () => expect(openingDay(days, '2026-10-22')).toBe('2026-10-23'));
  it('a finished tournament opens on its last day', () => expect(openingDay(days, '2026-10-30')).toBe('2026-10-23'));
  it('before it starts, the first day', () => expect(openingDay(days, '2026-10-01')).toBe('2026-10-19'));
  it('?day= wins when the tournament has that day', () => {
    expect(openingDay(days, '2026-10-21', '2026-10-19')).toBe('2026-10-19');
    expect(openingDay(days, '2026-10-21', '2026-12-01')).toBe('2026-10-21');
  });
  it('a day with no matches is skipped', () => expect(openingDay([day('2026-10-21', []), ...days.slice(2)], '2026-10-21')).toBe('2026-10-23'));
  it('null with no matches', () => expect(openingDay([], '2026-10-21')).toBeNull());
});

describe('nowNext', () => {
  const now = new Date('2026-10-21T10:00:00Z');
  it('per court: playing now (started within 90 minutes, no result) and the next to start', () => {
    const rows = nowNext(
      [
        match('done', '2026-10-21T07:00:00Z', NIK, GIO, { winner_side: 1, sets: [{ w: 6, l: 1 }, { w: 6, l: 2 }] }),
        match('on', '2026-10-21T09:00:00Z', ALE, PAV),
        match('later', '2026-10-21T12:00:00Z', NIK, ALE),
        match('soon', '2026-10-21T11:00:00Z', GIO, PAV),
        match('c2', '2026-10-21T10:30:00Z', GIO, NIK, { court: 'Γήπεδο 2' }),
      ],
      now,
      t,
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ court: 'Γήπεδο 1', now: { matchId: 'on', pair: 'Πράτσας με Μέμμο' }, next: { matchId: 'soon' } });
    expect(rows[1]).toMatchObject({ court: 'Γήπεδο 2', now: null, next: { matchId: 'c2', pair: 'Δεσύπρης με Ροδίτη' } });
    expect(rows[0]!.next!.time).toMatch(/^\d\d:\d\d$/);
  });
  it('a match started over 90 minutes ago without a result is not «now»', () => {
    expect(nowNext([match('old', '2026-10-21T08:00:00Z')], now, t)).toEqual([]);
  });
  it('put-off and finished matches are left out', () => {
    expect(nowNext([match('p', '2026-10-21T11:00:00Z', NIK, GIO, { postponed: true })], now, t)).toEqual([]);
  });
  it('a match without a time: «μετά το …» with an order, else «χωρίς ώρα ακόμα»', () => {
    const ordered = nowNext([{ ...match('first', '2026-10-21T09:30:00Z'), order: 1 }, { ...match('then', null, ALE, PAV), order: 2 }], now, t);
    expect(ordered[0]!.next).toMatchObject({ matchId: 'then', time: 'μετά το Ροδίτης με Δεσύπρη' });
    expect(nowNext([match('x', null)], now, t)[0]!.next!.time).toBe('χωρίς ώρα ακόμα');
  });
  it('no court named: one row for the day', () => {
    const rows = nowNext([match('a', '2026-10-21T11:00:00Z', NIK, GIO, { court: null, club: null })], now, t);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.court).toBeNull();
  });
});

describe('δικοί σου', () => {
  it('your player plus everyone you follow', () => {
    expect([...yoursSet('me', ['nik', 'gio'])].sort()).toEqual(['gio', 'me', 'nik']);
    expect([...yoursSet(null, ['nik'])]).toEqual(['nik']);
  });
  it('one row per match, by time, opponent in the accusative', () => {
    const rows = yoursToday(
      [match('b', '2026-10-21T15:30:00Z', ALE, NIK), match('a', '2026-10-21T07:00:00Z', NIK, GIO), match('c', '2026-10-21T08:00:00Z', ALE, PAV)],
      new Set(['nik', 'gio']),
      t,
    );
    expect(rows.map((r) => r.matchId)).toEqual(['a', 'b']);
    expect(rows[0]).toMatchObject({ playerId: 'nik', name: 'Ροδίτης Ν.', against: 'με Δεσύπρη' });
    expect(rows[1]).toMatchObject({ playerId: 'nik', against: 'με Πράτσα' });
  });
  it('nobody of yours: no rows', () => expect(yoursToday([match('a', '2026-10-21T07:00:00Z')], new Set(['x']), t)).toEqual([]));
});

const draw: TournamentDraw = {
  tab: 'Μ 40+', title: 'Μ 40+', discipline: 'MS', level: 'Μ 40+', format: 'knockout', size: 4, updated_at: '2026-10-19T00:00:00Z',
  entrants: [
    { pos: 1, raw: 'ΡΟΔΙΤΗΣ ΝΙΚΟΣ', seed: 1, bye: false, players: [{ raw: 'ΡΟΔΙΤΗΣ ΝΙΚΟΣ', player_id: 'nik' }] },
    { pos: 2, raw: 'ΜΕΜΜΟΣ ΗΛΙΑΣ', seed: null, bye: false, players: [{ raw: 'ΜΕΜΜΟΣ ΗΛΙΑΣ', player_id: 'pav' }] },
    { pos: 3, raw: 'ΔΕΣΥΠΡΗΣ ΓΙΩΡΓΟΣ', seed: null, bye: false, players: [{ raw: 'ΔΕΣΥΠΡΗΣ ΓΙΩΡΓΟΣ', player_id: 'gio' }] },
    { pos: 4, raw: 'ΠΡΑΤΣΑΣ ΓΙΑΝΝΗΣ', seed: null, bye: false, players: [{ raw: 'ΠΡΑΤΣΑΣ ΓΙΑΝΝΗΣ', player_id: 'ale' }] },
  ],
  rounds: [
    [
      { round: 1, slot: 1, side1: 'ΡΟΔΙΤΗΣ ΝΙΚΟΣ', side2: 'ΜΕΜΜΟΣ ΗΛΙΑΣ', winner: 1, bye: false, scoreRaw: '64 63', walkover: false, retired: false, when: '', deadline: null },
      { round: 1, slot: 2, side1: 'ΔΕΣΥΠΡΗΣ ΓΙΩΡΓΟΣ', side2: 'ΠΡΑΤΣΑΣ ΓΙΑΝΝΗΣ', winner: 2, bye: false, scoreRaw: '62 62', walkover: false, retired: false, when: '', deadline: null },
    ],
    [{ round: 2, slot: 1, side1: 'ΡΟΔΙΤΗΣ ΝΙΚΟΣ', side2: 'ΠΡΑΤΣΑΣ ΓΙΑΝΝΗΣ', winner: null, bye: false, scoreRaw: '', walkover: false, retired: false, when: 'ΣΑΒ 18.30', deadline: '2026-10-24' }],
  ],
};

const tournament = (days: GetTournamentResult['days'], draws: TournamentDraw[] = [draw]): GetTournamentResult => ({
  id: 't', name: 'Open', venue: null, area_id: null, surface: null, starts_on: null, ends_on: null, entry_deadline: null, state: 'ongoing', me: null,
  draws, masked: [], days,
});

describe('path in the draw', () => {
  it('the draws a player is in, and their matches in it', () => {
    expect(drawsOf([draw], 'nik')).toEqual(['Μ 40+']);
    expect(drawsOf([draw], 'zzz')).toEqual([]);
    expect([...pathKeys(draw, 'nik')].sort()).toEqual(['1-1', '2-1']);
    expect([...pathKeys(draw, 'gio')]).toEqual(['1-2']);
  });
});

describe('playerPath', () => {
  const now = new Date('2026-10-21T10:00:00Z');
  it('from the schedule: earlier matches with scores and ✓, and the next one', () => {
    const p = playerPath(
      tournament([
        day('2026-10-19', [match('r1', '2026-10-19T07:00:00Z', NIK, PAV, { winner_side: 1, sets: [{ w: 6, l: 4 }, { w: 6, l: 3 }] })]),
        day('2026-10-21', [match('r2', '2026-10-21T15:30:00Z', NIK, ALE)]),
      ]),
      'nik',
      now,
      t,
    )!;
    expect(p.name).toBe('Ροδίτης Νίκος');
    expect(p.previous).toEqual([{ matchId: 'r1', day: 'Δευ 19/10', meta: 'Μ 40+', against: 'με Μέμμο', score: '6-4, 6-3', won: true }]);
    expect(p.next).toMatchObject({ matchId: 'r2', against: 'με Πράτσα', now: false });
    expect(p.next!.when).toMatch(/^Σήμερα \d\d:\d\d$/);
    expect(p.next!.place).toContain('Γήπεδο 1');
    expect(p.draws).toEqual(['Μ 40+']);
  });
  it('a match on now is the next one, marked now', () => {
    const p = playerPath(tournament([day('2026-10-21', [match('on', '2026-10-21T09:30:00Z')])]), 'gio', now, t)!;
    expect(p.next).toMatchObject({ matchId: 'on', now: true, against: 'με Ροδίτη' });
  });
  it('with nothing on the schedule, the draw tells the story', () => {
    const p = playerPath(tournament([]), 'nik', now, t)!;
    expect(p.previous).toHaveLength(1);
    expect(p.previous[0]).toMatchObject({ won: true, score: '64 63', against: 'με ΜΕΜΜΟΣ ΗΛΙΑΣ' });
    expect(p.next).toMatchObject({ when: 'ΣΑΒ 18.30', against: 'με ΠΡΑΤΣΑΣ ΓΙΑΝΝΗΣ' });
    expect(p.name).toBe('ΡΟΔΙΤΗΣ ΝΙΚΟΣ');
  });
  it('a player out of the tournament: null', () => expect(playerPath(tournament([]), 'zzz', now, t)).toBeNull());
});

describe('ifWins', () => {
  const row = (round: number, slot: number, side1: string | null, side2: string | null, winner: 1 | 2 | null = null, when = '') =>
    ({ round, slot, side1, side2, winner, bye: false, scoreRaw: winner ? '64 64' : '', walkover: false, retired: false, when, deadline: null });
  const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const eight: TournamentDraw = {
    tab: 'Μ 50+', title: 'Μ 50+', discipline: 'MS', level: 'Μ 50+', format: 'knockout', size: 8, updated_at: '2026-10-19T00:00:00Z',
    entrants: names.map((n, i) => ({ pos: i + 1, raw: n, seed: null, bye: false, players: [{ raw: n, player_id: n.toLowerCase() }] })),
    rounds: [
      [row(1, 1, 'A', 'B', 1), row(1, 2, 'C', 'D', null, 'ΣΑΒ 10.00'), row(1, 3, 'E', 'F', 1), row(1, 4, 'G', 'H')],
      [row(2, 1, 'A', null), row(2, 2, 'E', null)],
      [row(3, 1, null, null)],
    ],
  };
  const tour = (over: Partial<GetTournamentResult> = {}): GetTournamentResult => ({ ...tournament([], [eight]), ...over });

  it('a match won: the next opponent, still «A ή B» while they play', () => {
    expect(ifWins(tour(), 'a', { tab: 'Μ 50+', round: 1, slot: 1 }, t)).toEqual({
      tab: 'Μ 50+', key: '1-1', line: 'Επόμενος: C ή D', when: 'ΣΑΒ 10.00', nextKey: '2-1',
    });
  });
  it('a match still to play: who waits if they win it, known once the other match is done', () => {
    expect(ifWins(tour(), 'c', { tab: 'Μ 50+', round: 1, slot: 2 }, t)).toMatchObject({ key: '1-2', line: 'Αν κερδίσει αυτό το ματς (Προημιτελικά): A', nextKey: '2-1' });
  });
  it('nobody known yet further up: «θα φανεί»', () => {
    expect(ifWins(tour(), 'a', { tab: 'Μ 50+', round: 2, slot: 1 }, t)!.line).toBe('Αν κερδίσει αυτό το ματς (Ημιτελικά): θα φανεί');
  });
  it('a lost match says where they went out', () => {
    expect(ifWins(tour(), 'b', { tab: 'Μ 50+', round: 1, slot: 1 }, t)).toMatchObject({ line: 'Έφυγε στα προημιτελικά', nextKey: null });
  });
  it('no match to go by: their upcoming one', () => {
    expect(ifWins(tour(), 'g', null, t)).toMatchObject({ key: '1-4', line: 'Αν κερδίσει: E' });
  });
  it('from a schedule match: the draw slot with the same two players', () => {
    const P = (id: string) => player(id, id.toUpperCase(), 'Χ');
    const d = tour({ days: [day('2026-10-21', [match('cd', '2026-10-21T15:00:00Z', P('c'), P('d'))])] });
    expect(ifWins(d, 'd', { match: 'cd' }, t)).toMatchObject({ key: '1-2', line: 'Αν κερδίσει αυτό το ματς (Προημιτελικά): A' });
  });
  it('hidden players and minors stay «–»', () => {
    expect(ifWins(tour({ masked: ['D'] }), 'a', { tab: 'Μ 50+', round: 1, slot: 1 }, t)!.line).toBe('Επόμενος: C ή –');
  });
  it('the final: playing it, the title, or out in it', () => {
    const two: TournamentDraw = { ...eight, rounds: [[row(1, 1, 'A', 'B', 1), row(1, 2, 'C', 'D', 2)], [row(2, 1, 'A', 'D')]] };
    expect(ifWins(tour({ draws: [two] }), 'a', null, t)!.line).toBe('Παίζει τον τελικό');
    const won: TournamentDraw = { ...two, rounds: [two.rounds[0]!, [row(2, 1, 'A', 'D', 1)]] };
    expect(ifWins(tour({ draws: [won] }), 'a', null, t)!.line).toBe('Πήρε τον τίτλο');
    expect(ifWins(tour({ draws: [won] }), 'd', null, t)!.line).toBe('Έχασε στον τελικό');
  });
  it('a round robin draw has no next slot', () => {
    expect(ifWins(tour({ draws: [{ ...eight, format: 'round_robin' }] }), 'a', null, t)).toBeNull();
  });
});
