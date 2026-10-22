import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import type { TournamentMatch } from '@netprophet/db';
import { nowNext, openingDay, yoursSet, yoursToday } from './tournamentToday';

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
  it('a match without a time: «μετά το …» with an order, else its day («Σήμερα»)', () => {
    const ordered = nowNext([{ ...match('first', '2026-10-21T09:30:00Z'), order: 1 }, { ...match('then', null, ALE, PAV), order: 2 }], now, t);
    expect(ordered[0]!.next).toMatchObject({ matchId: 'then', time: 'μετά το Ροδίτης με Δεσύπρη' });
    expect(nowNext([match('x', null)], now, t)[0]!.next!.time).toBe('Σήμερα');
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
