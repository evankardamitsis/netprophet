import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import type { GetQuizResult, TournamentItem } from '@netprophet/db';
import type { CardMatch, CardResult, FeedCard } from './feed';
import { homeTournaments, quizCard, resultsLine, rowTime, sideLabel, tagLabel, todayHeading, voteList, yoursNow } from './home';

describe('rowTime: a day, never «χωρίς ώρα»', () => {
  const now = new Date('2026-10-22T15:00:00Z');
  const tt = getCopy('el');
  it('the time when there is one', () => expect(rowTime({ startsAt: '2026-10-22T15:00:00Z' }, tt, now)).toBe('18:00'));
  it('no time: the day, today and tomorrow by name, else weekday and date', () => {
    expect(rowTime({ day: '2026-10-22' }, tt, now)).toBe('Σήμερα');
    expect(rowTime({ day: '2026-10-23' }, tt, now)).toBe('Αύριο');
    expect(rowTime({ day: '2026-10-25' }, tt, now)).toBe('Κυρ 25/10');
  });
  it('neither: nothing', () => expect(rowTime({}, tt, now)).toBe(''));
  it('the import\'s 00:00 (a sheet row with no time) is its day, not «00:00»', () => {
    expect(rowTime({ startsAt: '2026-10-21T21:00:00Z' }, tt, now)).toBe('Σήμερα'); // 22/10 00:00 Athens
    expect(rowTime({ startsAt: '2026-10-24T21:00:00Z' }, tt, now)).toBe('Κυρ 25/10');
  });
});

const t = getCopy('el');
const NOW = new Date('2026-10-22T15:00:00Z'); // 18:00 Athens

const person = (id: string, first: string, surname: string) => ({ id, first, surname, initials: '' });
const side = (...people: ReturnType<typeof person>[]) => ({ people, sub: null });
const match = (id: string, over: Partial<CardMatch> = {}): CardMatch => ({
  kind: 'match',
  id,
  meta: '',
  learn: '',
  doubles: false,
  a: side(person(`${id}a`, 'Νίκος', 'Παππάς')),
  b: side(person(`${id}b`, 'Γιώργος', 'Λιάκος')),
  ...over,
});
const at = (iso: string) => ({ startsAt: iso });

describe('resultsLine', () => {
  const r = (ok: boolean, points: number, at = '2026-10-21T15:00:00Z'): CardResult =>
    ({ kind: 'result', id: Math.random().toString(), ok, points, at } as unknown as CardResult);
  it('counts right and wrong calls and the points', () => {
    expect(resultsLine([r(true, 10), r(true, 20), r(false, 0)], t, NOW)).toEqual({ title: '3 αποτελέσματα από χθες', line: '2 ✓ · 1 χαμένο', points: 30 });
  });
  it('leaves out an empty part', () => {
    expect(resultsLine([r(false, 0), r(false, 0)], t, NOW)).toEqual({ title: '2 αποτελέσματα από χθες', line: '2 χαμένα', points: 0 });
  });
  it('nothing waiting: no card', () => expect(resultsLine([], t, NOW)).toBeNull());
  it('title: yesterday, today, mixed or older, one or many', () => {
    const today = '2026-10-22T08:00:00Z';
    expect(resultsLine([r(true, 10)], t, NOW)?.title).toBe('1 αποτέλεσμα από χθες');
    expect(resultsLine([r(true, 10, today)], t, NOW)?.title).toBe('1 αποτέλεσμα από σήμερα');
    expect(resultsLine([r(true, 10, today), r(true, 10, today)], t, NOW)?.title).toBe('2 αποτελέσματα από σήμερα');
    expect(resultsLine([r(true, 10), r(true, 10, today)], t, NOW)?.title).toBe('2 αποτελέσματα');
    expect(resultsLine([r(true, 10, '2026-10-19T08:00:00Z')], t, NOW)?.title).toBe('1 αποτέλεσμα');
  });
  it('the Athens day decides: 23:30 UTC on the 21st is already the 22nd', () => {
    expect(resultsLine([r(true, 10, '2026-10-21T23:30:00Z')], t, NOW)?.title).toBe('1 αποτέλεσμα από σήμερα');
  });
});

describe('todayHeading', () => {
  it('weekday, day and short month', () => expect(todayHeading(NOW, t)).toBe('Πέμπτη 22 Οκτ'));
  it('Athens day near midnight', () => expect(todayHeading(new Date('2026-10-22T21:30:00Z'), t)).toBe('Παρασκευή 23 Οκτ'));
});

describe('voteList', () => {
  it('today: open first (your people ahead), voted after, three on top', () => {
    const cards: FeedCard[] = [
      match('1', at('2026-10-22T14:00:00Z')),
      match('2', { ...at('2026-10-22T15:00:00Z'), myVote: 'a' }),
      match('3', at('2026-10-22T16:00:00Z')),
      match('4', { ...at('2026-10-22T17:00:00Z'), a: side(person('friend', 'Άννα', 'Μάνου')) }),
      match('5', { ...at('2026-10-22T13:00:00Z'), closed: true }),
    ];
    const l = voteList(cards, new Set(['friend']));
    expect(l.mode).toBe('today');
    expect(l.top.map((m) => m.id)).toEqual(['4', '1', '3']);
    expect(l.rest.map((m) => m.id)).toEqual(['2']);
  });
  it('nothing to vote today: tomorrow\'s first three', () => {
    const cards: FeedCard[] = [
      match('1', { ...at('2026-10-22T14:00:00Z'), myVote: 'a' }),
      ...['a', 'b', 'c', 'd'].map((k, i) => match(`t${k}`, { ...at(`2026-10-23T1${i}:00:00Z`), later: true })),
    ];
    const l = voteList(cards);
    expect(l.mode).toBe('tomorrow');
    expect(l.top.map((m) => m.id)).toEqual(['ta', 'tb', 'tc']);
    expect(l.rest.map((m) => m.id)).toEqual(['td']);
  });
  it('everything voted and nothing later: today\'s votes stay to show the split', () => {
    const l = voteList([match('1', { myVote: 'b' })]);
    expect(l).toMatchObject({ mode: 'today', top: [{ id: '1' }] });
  });
  it('an empty feed', () => expect(voteList([]).mode).toBe('none'));
});

describe('sideLabel', () => {
  it('one player: surname and initial; a pair: both surnames', () => {
    expect(sideLabel([person('1', 'Κώστας', 'Ρήγας')])).toBe('Ρήγας Κ.');
    expect(sideLabel([person('1', 'Κώστας', 'Ρήγας'), person('2', 'Νίκος', 'Σταθάκης')])).toBe('Ρήγας & Σταθάκης');
  });
});

describe('yoursNow', () => {
  const group = { key: 'g', title: 'Open Γλυφάδας', logo: null, sub: null, club: null };
  it('your people today, playing now first, with who they play', () => {
    const cards: FeedCard[] = [
      match('later', { ...at('2026-10-22T17:00:00Z'), a: side(person('gio', 'Γιώργος', 'Λιάκος')), group, tournamentId: 't1' }),
      match('now', { ...at('2026-10-22T14:30:00Z'), closed: true, b: side(person('nik', 'Νίκος', 'Παππάς')), group, tournamentId: 't1' }),
      match('other', at('2026-10-22T14:30:00Z')),
      match('tomorrow', { ...at('2026-10-23T10:00:00Z'), later: true, a: side(person('gio', 'Γιώργος', 'Λιάκος')) }),
    ];
    const rows = yoursNow(cards, new Set(['gio', 'nik']), NOW, t);
    expect(rows.map((r) => [r.matchId, r.now, r.time])).toEqual([
      ['now', true, null],
      ['later', false, '20:00'],
    ]);
    expect(rows[0]!.name).toBe('Παππάς Ν.');
    expect(rows[0]!.line).toBe('με Παππά · Open Γλυφάδας');
    expect(rows[0]!.tournamentId).toBe('t1');
  });
  it('skips your own match and says nothing with nobody followed', () => {
    const cards: FeedCard[] = [match('m', { a: side(person('me', 'Νίκος', 'Ροδίτης')) })];
    expect(yoursNow(cards, new Set(['me']), NOW, t, 'm')).toEqual([]);
    expect(yoursNow(cards, new Set(), NOW, t)).toEqual([]);
  });
});

describe('quizCard', () => {
  const quiz = (answered: number, n = 6, awarded = false): GetQuizResult =>
    ({
      quiz_day: '2026-10-22',
      required: 6,
      pro: false,
      awarded,
      next_at: '',
      answered,
      cards: Array.from({ length: n }, (_, i) => ({ id: `c${i}`, my_option: i < answered ? 1 : null })),
    }) as unknown as GetQuizResult;
  it('before playing: how many and what the six give', () => {
    expect(quizCard(quiz(0), t)).toMatchObject({ line: '6 ερωτήσεις · και οι 6 δίνουν +30', done: false, earned: false });
  });
  it('part way', () => expect(quizCard(quiz(2), t)?.line).toBe('2 από 6 · και οι 6 δίνουν +30'));
  it('played: the score, and the +30 once it came in', () => {
    expect(quizCard(quiz(6, 6, true), t)).toMatchObject({ line: '6 από 6', done: true, earned: true });
  });
  it('no cards: no card', () => expect(quizCard(quiz(0, 0), t)).toBeNull());
});

describe('homeTournaments', () => {
  const item = (id: string, over: Partial<TournamentItem> = {}): TournamentItem => ({
    id,
    name: id,
    venue: null,
    area_id: null,
    surface: null,
    starts_on: null,
    ends_on: null,
    entry_deadline: null,
    level_min: null,
    level_max: null,
    state: 'ongoing',
    draws: 0,
    matches: 0,
    today: 0,
    in_it: false,
    ...over,
  });
  it('Παίζεις › Ακολουθείς › Κοντά σου › the rest; finished and future left out', () => {
    const list = homeTournaments(
      [
        item('rest', { today: 9 }),
        item('near', { area_id: 'glyfada', today: 2 }),
        item('follow', { followed: true }),
        item('mine', { in_it: true }),
        item('done', { state: 'done' }),
        item('soon', { state: 'upcoming' }),
      ],
      [],
      ['glyfada'],
      NOW,
      t,
    );
    expect(list.map((x) => [x.id, x.tag])).toEqual([
      ['mine', 'playing'],
      ['follow', 'following'],
      ['near', 'near'],
      ['rest', null],
    ]);
    expect(list[3]!.count).toBe('9 ματς σήμερα');
    expect(tagLabel('near', t)).toBe('Κοντά σου');
  });
  it('the live line from the feed: playing now, else the next start', () => {
    const cards: FeedCard[] = [
      match('1', { ...at('2026-10-22T14:30:00Z'), closed: true, tournamentId: 'g' }),
      match('2', { ...at('2026-10-22T16:00:00Z'), tournamentId: 'g' }),
      match('3', { ...at('2026-10-22T17:00:00Z'), tournamentId: 'k' }),
    ];
    const [g, k] = homeTournaments([item('g', { today: 2 }), item('k', { today: 1 })], cards, [], NOW, t);
    expect(g).toMatchObject({ live: 'Παππάς · Λιάκος', next: 'Επόμενο ματς 19:00' });
    expect(k).toMatchObject({ live: null, next: 'Πρώτο ματς 20:00' });
  });
});
