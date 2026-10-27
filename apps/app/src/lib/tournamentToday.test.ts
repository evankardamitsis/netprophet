import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import type { TournamentMatch } from '@netprophet/db';
import { mineToday, nowNext, openingDay, scheduleVoteMatch, todayGroups, yoursSet, yoursToday } from './tournamentToday';

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

describe('Σήμερα', () => {
  const now = new Date('2026-10-22T06:00:00Z'); // 09:00 Athens
  const at = (hhmm: string) => `2026-10-22T${hhmm}:00Z`;
  const fedCard = (id: string, over: Record<string, unknown> = {}) => ({ id, kind: 'match', myVote: 'a', split: { pctA: 60, pctB: 40 }, ...over }) as never;

  it('«Ο αγώνας σου»: the earliest match of the day where your player plays, with whom', () => {
    const ms = [match('late', at('12:00'), NIK, PAV), match('early', at('07:30'), GIO, NIK), match('other', at('07:00'), ALE, PAV)];
    const mine = mineToday(ms, 'nik', t)!;
    expect(mine.matchId).toBe('early');
    expect(mine.playerId).toBe('nik');
    expect(mine.today).toBe(true);
    expect(mine.when).toBe('10:30');
    expect(mine.who).toBe('με Δεσύπρη');
    expect(mine.category).toBe('Μ 40+');
    expect(mine.startsAt).toBe(at('07:30'));
  });
  it('«Ο αγώνας σου» is null without a player, when yours is played or put off, or is not on', () => {
    const ms = [match('a', at('07:30'), NIK, GIO, { winner_side: 1 }), match('b', at('08:30'), NIK, GIO, { postponed: true })];
    expect(mineToday(ms, 'nik', t)).toBeNull();
    expect(mineToday(ms, null, t)).toBeNull();
    expect(mineToday([match('c', at('08:30'), ALE, PAV)], 'nik', t)).toBeNull();
  });
  it('a match with no time reads «Σήμερα»', () => {
    expect(mineToday([match('u', '2026-10-21T21:00:00Z', NIK, GIO)], 'nik', t)!.when).toBe('Σήμερα');
  });
  it('yours skips the match that has its own row', () => {
    const ms = [match('a', at('07:30'), NIK, GIO), match('b', at('08:30'), GIO, PAV)];
    const yours = yoursSet('nik', ['gio']);
    expect(yoursToday(ms, yours, t).map((r) => r.matchId)).toEqual(['a', 'b']);
    expect(yoursToday(ms, yours, t, 'a').map((r) => r.matchId)).toEqual(['b']);
  });
  it('groups by category, each by time, untimed last, groups by their first match', () => {
    const ms = [
      match('w2', at('09:00'), NIK, GIO, { level: 'Γ 35+', discipline: 'WS' }),
      match('m-untimed', '2026-10-21T21:00:00Z', ALE, PAV),
      match('m2', at('08:00'), ALE, PAV),
      match('m1', at('07:00'), NIK, GIO),
      match('w1', at('06:30'), NIK, GIO, { level: 'Γ 35+', discipline: 'WS' }),
    ];
    const groups = todayGroups(ms, 'tour', new Map(), new Map(), now, t);
    expect(groups.map((g) => g.key)).toEqual(['Γ 35+ · Γυναικών', 'Μ 40+']);
    expect(groups[0]!.rows.map((r) => r.match.id)).toEqual(['w1', 'w2']);
    expect(groups[1]!.rows.map((r) => r.match.id)).toEqual(['m1', 'm2', 'm-untimed']);
  });
  it('a row is open before its lock, closed after, and every row carries its tournament for the hold', () => {
    const ms = [match('soon', at('10:00')), match('gone', at('05:00')), match('untimed-open', '2026-10-21T21:00:00Z')];
    const rows = todayGroups(ms, 'tour', new Map(), new Map(), now, t)[0]!.rows;
    const by = (id: string) => rows.find((r) => r.match.id === id)!;
    expect(by('soon').match.closed).toBeUndefined();
    expect(by('soon').note).toBeUndefined();
    expect(by('gone').match.closed).toBe(true);
    expect(by('gone').note).toBe('Έκλεισε');
    // 09:00 Athens: an untimed match takes votes until 14:00
    expect(by('untimed-open').match.closed).toBeUndefined();
    expect(rows.every((r) => r.match.tournamentId === 'tour')).toBe(true);
    // 14:30 Athens: it closed
    const late = todayGroups([match('untimed-open', '2026-10-21T21:00:00Z')], 'tour', new Map(), new Map(), new Date('2026-10-22T11:30:00Z'), t)[0]!.rows[0]!;
    expect(late.match.closed).toBe(true);
  });
  it('the feed lays your vote, the split and its lock over the row', () => {
    const lock = at('07:55');
    const rows = todayGroups([match('a', at('08:00'))], 'tour', new Map([['a', fedCard('a', { lockAt: lock })]]), new Map(), now, t)[0]!.rows;
    expect(rows[0]!.match.myVote).toBe('a');
    expect(rows[0]!.match.split).toEqual({ pctA: 60, pctB: 40 });
    expect(rows[0]!.match.lockAt).toBe(lock);
    expect(rows[0]!.match.closed).toBeUndefined();
    // the feed saying closed closes it
    const closed = todayGroups([match('a', at('10:00'))], 'tour', new Map([['a', fedCard('a', { closed: true })]]), new Map(), now, t)[0]!.rows[0]!;
    expect(closed.match.closed).toBe(true);
  });
  it('a played match shows its winner and the points your call brought', () => {
    const ms = [match('p', at('05:00'), NIK, GIO, { winner_side: 2 })];
    const row = todayGroups(ms, 'tour', new Map(), new Map([['p', 10]]), now, t)[0]!.rows[0]!;
    expect(row.result).toEqual({ winner: 'b', points: 10 });
    expect(row.note).toBeUndefined();
    expect(todayGroups(ms, 'tour', new Map(), new Map(), now, t)[0]!.rows[0]!.result!.points).toBeNull();
  });
  it('a match put off is closed and says «Αναβολή»', () => {
    const row = todayGroups([match('x', at('10:00'), NIK, GIO, { postponed: true })], 'tour', new Map(), new Map(), now, t)[0]!.rows[0]!;
    expect(row.match.closed).toBe(true);
    expect(row.note).toBe('Αναβολή');
  });
});

describe('scheduleVoteMatch (Πρόγραμμα: which rows take a vote)', () => {
  const now = new Date('2026-10-22T06:00:00Z'); // 09:00 Athens
  const at = (hhmm: string, d = '22') => `2026-10-${d}T${hhmm}:00Z`;
  const fed = (over: Record<string, unknown> = {}) => ({ id: 'a', kind: 'match', myVote: 'b', split: { pctA: 30, pctB: 70 }, ...over }) as never;
  const vote = (m: TournamentMatch, me: string | null = null, f?: never) => scheduleVoteMatch(m, 'tour', me, f, now, t);

  it('an open match, today or on a later day, is a vote row for its tournament', () => {
    expect(vote(match('a', at('10:00')))).toMatchObject({ id: 'a', tournamentId: 'tour' });
    expect(vote(match('b', at('10:00', '24')))?.id).toBe('b');
    expect(vote(match('a', at('10:00')))?.closed).toBeUndefined();
  });
  it('started or past its lock is not votable', () => {
    expect(vote(match('gone', at('05:00')))).toBeNull();
  });
  it('a finished, put-off or walkover match is not votable', () => {
    expect(vote(match('w', at('10:00'), NIK, GIO, { winner_side: 1, sets: [{ w: 6, l: 1 }] }))).toBeNull();
    expect(vote(match('p', at('10:00'), NIK, GIO, { postponed: true }))).toBeNull();
    expect(vote(match('wo', at('10:00'), NIK, GIO, { winner_side: 2, walkover: true }))).toBeNull();
  });
  it('a side with nobody yet (a «θα φανεί» slot) is not votable', () => {
    const open = match('tbd', at('10:00'));
    expect(vote({ ...open, sides: [{ side: 1, players: [NIK] }, { side: 2, players: [] }] })).toBeNull();
    expect(vote({ ...open, sides: [{ side: 1, players: [NIK] }] })).toBeNull();
  });
  it('your own match is not votable (the server says own_match)', () => {
    expect(vote(match('mine', at('10:00'), NIK, GIO), 'nik')).toBeNull();
    expect(vote(match('mine', at('10:00'), NIK, GIO), 'gio')).toBeNull();
    expect(vote(match('theirs', at('10:00'), NIK, GIO), 'ale')).not.toBeNull();
  });
  it('the feed lays your vote and the split over it, and its lock or closed flag wins over the clock', () => {
    const row = vote(match('a', at('12:00')), null, fed({ lockAt: at('11:55') }));
    expect(row).toMatchObject({ myVote: 'b', split: { pctA: 30, pctB: 70 } });
    expect(vote(match('a', at('12:00')), null, fed({ closed: true }))).toBeNull();
    expect(vote(match('a', at('12:00')), null, fed({ lockAt: at('05:55') }))).toBeNull();
  });
});
