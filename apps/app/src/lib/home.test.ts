import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import type { GetQuizResult, TournamentItem } from '@netprophet/db';
import type { CardMatch, CardResult, FeedCard } from './feed';
import { groupVotes, hasMoreVotes, homeSections, homeTournaments, quizCard, resultsLine, rowTime, rowWhere, sideLabel, tagLabel, todayHeading, topVotes, tournamentRanks, tournamentStrip, voteList, voteRows, yoursNow } from './home';

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

const gp = (id: string, title = id) => ({ tournamentId: id, group: { key: id, title, logo: null, sub: null, club: null } });
const ids = (g: { rows: CardMatch[] }[]) => g.map((x) => x.rows.map((m) => m.id));

describe('voteList', () => {
  it('today: open and voted together, grouped by tournament, rows by time', () => {
    const cards: FeedCard[] = [
      match('1', { ...at('2026-10-22T14:00:00Z'), ...gp('A') }),
      match('2', { ...at('2026-10-22T15:00:00Z'), myVote: 'a', ...gp('A') }),
      match('3', { ...at('2026-10-22T13:00:00Z'), ...gp('B') }),
      match('5', { ...at('2026-10-22T13:00:00Z'), closed: true, ...gp('A') }),
    ];
    const l = voteList(cards);
    expect(l.mode).toBe('today');
    expect(ids(l.groups)).toEqual([['3'], ['1', '2']]);
  });
  it("nothing to vote today: tomorrow's", () => {
    const cards: FeedCard[] = [
      match('1', { ...at('2026-10-22T14:00:00Z'), myVote: 'a' }),
      ...['a', 'b'].map((k, i) => match(`t${k}`, { ...at(`2026-10-23T1${i}:00:00Z`), later: true })),
    ];
    const l = voteList(cards);
    expect(l.mode).toBe('tomorrow');
    expect(ids(l.groups)).toEqual([['ta', 'tb']]);
  });
  it("everything voted and nothing later: today's votes stay to show the split", () => {
    const l = voteList([match('1', { myVote: 'b' })]);
    expect(l).toMatchObject({ mode: 'today', groups: [{ rows: [{ id: '1' }] }] });
  });
  it('an empty feed', () => expect(voteList([]).mode).toBe('none'));
});

describe('groupVotes', () => {
  const items = [
    { id: 'rest', in_it: false, followed: false, area_id: null },
    { id: 'near', in_it: false, followed: false, area_id: 'ar1' },
    { id: 'follow', in_it: false, followed: true, area_id: null },
    { id: 'mine', in_it: true, followed: false, area_id: null },
  ] as unknown as TournamentItem[];
  const m = (id: string, tid: string | undefined, iso: string, over: Partial<CardMatch> = {}) =>
    match(id, { startsAt: iso, ...(tid ? gp(tid) : {}), ...over });

  it('orders Παίζεις > Ακολουθείς > Κοντά σου > the rest, friendlies last', () => {
    const ranks = tournamentRanks(items, ['ar1']);
    const g = groupVotes(
      [
        m('f', undefined, '2026-10-22T10:00:00Z'),
        m('r', 'rest', '2026-10-22T10:00:00Z'),
        m('n', 'near', '2026-10-22T11:00:00Z'),
        m('fo', 'follow', '2026-10-22T12:00:00Z'),
        m('mi', 'mine', '2026-10-22T13:00:00Z'),
      ],
      ranks,
    );
    expect(g.map((x) => x.key)).toEqual(['mine', 'follow', 'near', 'rest', 'friendlies']);
    expect(g[4]).toMatchObject({ tournamentId: null, title: null });
    expect(g[0]).toMatchObject({ tournamentId: 'mine', title: 'mine', count: 1 });
  });
  it('a tournament outside the list comes after the listed ones, the earlier first', () => {
    const g = groupVotes([m('x', 'X', '2026-10-22T12:00:00Z'), m('y', 'Y', '2026-10-22T11:00:00Z'), m('r', 'rest', '2026-10-22T18:00:00Z')], tournamentRanks(items));
    expect(g.map((x) => x.key)).toEqual(['rest', 'Y', 'X']);
  });
  it('rows by time; an untimed one shows at the end of its day, before the next day', () => {
    const g = groupVotes([
      m('late', 'A', '2026-10-22T16:00:00Z'),
      m('untimed', 'A', '2026-10-21T21:00:00Z'), // 22/10 00:00 Athens: no time
      m('early', 'A', '2026-10-22T08:00:00Z'),
      m('nextday', 'A', '2026-10-23T08:00:00Z'),
    ]);
    expect(ids(g)).toEqual([['early', 'late', 'untimed', 'nextday']]);
  });
  it('a match with only a day sorts by that day', () => {
    const g = groupVotes([match('b', { ...gp('A'), day: '2026-10-24' }), m('a', 'A', '2026-10-23T08:00:00Z')]);
    expect(ids(g)).toEqual([['a', 'b']]);
  });
});

describe('topVotes', () => {
  const grp = (key: string, n: number) => ({ key, tournamentId: key, title: key, count: n, rows: Array.from({ length: n }, (_, i) => match(`${key}${i}`)) });
  it('cuts at the limit and never leaves a heading without a row', () => {
    const out = topVotes([grp('A', 2), grp('B', 2), grp('C', 1)], 3);
    expect(ids(out)).toEqual([['A0', 'A1'], ['B0']]);
    expect(out[1]!.count).toBe(2);
  });
  it('a first group longer than the limit is cut inside', () => {
    expect(ids(topVotes([grp('A', 5), grp('B', 1)], 3))).toEqual([['A0', 'A1', 'A2']]);
  });
  it('exactly the limit ends with no next heading', () => {
    expect(ids(topVotes([grp('A', 1), grp('B', 2), grp('C', 1)], 3))).toEqual([['A0'], ['B0', 'B1']]);
  });
  it('shows the votes still to cast first, skipping voted rows, which wait for «Περισσότερα ›»', () => {
    const g = grp('A', 3);
    g.rows[0] = match('A0', { myVote: 'a' });
    g.rows[1] = match('A1', { closed: true });
    const out = topVotes([g, grp('B', 4)], 3);
    expect(ids(out)).toEqual([['A2'], ['B0', 'B1']]);
    expect(out[0]!.count).toBe(3);
  });
  it('every row voted: the first rows show as before', () => {
    const g = grp('A', 4);
    g.rows = g.rows.map((r) => ({ ...r, myVote: 'b' as const }));
    expect(ids(topVotes([g], 3))).toEqual([['A0', 'A1', 'A2']]);
  });
  it('counts the rows', () => {
    expect(voteRows([grp('A', 1), grp('B', 2)])).toBe(3);
  });
});

describe('«Περισσότερα ›» and the full list', () => {
  const grp = (key: string, n: number) => ({ key, tournamentId: key, title: key, count: n, rows: Array.from({ length: n }, (_, i) => match(`${key}${i}`)) });
  it('no link when the three cover everything', () => {
    expect(hasMoreVotes([grp('A', 2), grp('B', 1)])).toBe(false);
    expect(hasMoreVotes([])).toBe(false);
  });
  it('a link when more rows exist than the three the home shows', () => {
    expect(hasMoreVotes([grp('A', 2), grp('B', 2)])).toBe(true);
  });
  it('voted rows wait on the full page, so they count as more', () => {
    const g = grp('A', 3);
    g.rows[0] = match('A0', { myVote: 'a' });
    expect(hasMoreVotes([g])).toBe(true);
  });
  it('the full list keeps every row while the home keeps three, and the tomorrow fallback is whole too', () => {
    const cards = ['a', 'b', 'c', 'd', 'e'].map((id, i) => match(id, { tournamentId: i < 3 ? 'T1' : 'T2', startsAt: `2026-10-22T1${i}:00:00Z`, day: '2026-10-22' }));
    const full = voteList(cards);
    expect(full.mode).toBe('today');
    expect(voteRows(full.groups)).toBe(5);
    expect(voteRows(topVotes(full.groups))).toBe(3);
    const voted = cards.map((c) => ({ ...c, myVote: 'a' as const }));
    const later = [...voted, ...['x', 'y', 'z', 'w'].map((id) => match(id, { later: true, day: '2026-10-23', startsAt: '2026-10-23T09:00:00Z' }))];
    const tomorrow = voteList(later);
    expect(tomorrow.mode).toBe('tomorrow');
    expect(voteRows(tomorrow.groups)).toBe(4);
  });
});

describe('homeSections: the order of the home (layout C)', () => {
  it('everything on: header, results, yours, tournaments strip, Pro, quiz, votes, sponsor, links', () => {
    expect(homeSections({ results: true, yours: true, quiz: true, sponsor: true })).toEqual(['header', 'results', 'yours', 'tournaments', 'pro', 'quiz', 'vote', 'sponsor', 'links']);
  });
  it('empty parts are left out; tournaments and Pro come before the quiz, and the sponsor sits at the end before the links', () => {
    const out = homeSections({ results: false, yours: false, quiz: true, sponsor: false });
    expect(out).toEqual(['header', 'tournaments', 'pro', 'quiz', 'vote', 'links']);
    expect(out.indexOf('tournaments')).toBeLessThan(out.indexOf('pro'));
    expect(out.indexOf('pro')).toBeLessThan(out.indexOf('quiz'));
    expect(homeSections({ results: false, yours: true, quiz: false, sponsor: true }).slice(-2)).toEqual(['sponsor', 'links']);
  });
  it('the strip comes right after «Οι δικοί σου»', () => {
    const out = homeSections({ results: true, yours: true, quiz: true, sponsor: false });
    expect(out[out.indexOf('yours') + 1]).toBe('tournaments');
  });
});

describe('tournamentStrip', () => {
  const tn = (id: string) => ({ id, name: id, logo: null, tag: null, live: null, next: null, count: null });
  it('the tournaments in order, then «Όλα ›»', () => {
    expect(tournamentStrip([tn('a'), tn('b')]).map((x) => (x.kind === 'all' ? 'all' : x.item.id))).toEqual(['a', 'b', 'all']);
  });
  it('none today: no strip at all', () => expect(tournamentStrip([])).toEqual([]));
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
  it('a done tournament is never listed, even with matches counted today', () => {
    const list = homeTournaments([item('done', { state: 'done', today: 5 }), item('on', { today: 1 })], [], [], NOW, t);
    expect(list.map((x) => x.id)).toEqual(['on']);
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

describe('rowWhere', () => {
  const ace = { name: 'ACE Tennis Club', logo: 'clubs/23910bab/mvjg06d6.jpg' };
  it('adds the club after the category, with its logo', () => {
    expect(rowWhere('Μ 40+', ace)).toEqual({ line: 'Μ 40+ · ACE Tennis Club', logo: 'clubs/23910bab/mvjg06d6.jpg', clubName: 'ACE Tennis Club' });
  });
  it('a club with no logo is named, with no badge', () => {
    expect(rowWhere('Μ 40+', { name: 'PRC (Μαρούσι)', logo: null })).toEqual({ line: 'Μ 40+ · PRC (Μαρούσι)', logo: null, clubName: 'PRC (Μαρούσι)' });
    expect(rowWhere('Μ 40+', { name: 'PRC', logo: '  ' }).logo).toBeNull();
  });
  it('the club alone when there is no category', () => {
    expect(rowWhere('', ace).line).toBe('ACE Tennis Club');
  });
  it('never names the club twice', () => {
    expect(rowWhere('Μ 40+ · ACE Tennis Club', ace).line).toBe('Μ 40+ · ACE Tennis Club');
  });
  it('without a club the line stays as it was', () => {
    expect(rowWhere('Μ 40+', undefined)).toEqual({ line: 'Μ 40+', logo: null, clubName: null });
    expect(rowWhere('Μ 40+', null)).toEqual({ line: 'Μ 40+', logo: null, clubName: null });
  });
});
