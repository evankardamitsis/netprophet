import { describe, expect, it } from 'vitest';
import { getCopy } from '@netprophet/copy';
import type { CardMatch } from './feed';
import { groupVotes, topVotes, voteList, type QuizCardView } from './home';
import {
  closesInMinutes,
  dayEnd,
  dayEndRows,
  isClosed,
  moreVotes,
  msToNextMinute,
  nextDayKey,
  noneTodayLine,
  quizChip,
  tomorrowOf,
} from './homeGuidance';

const t = getCopy('el');
const en = getCopy('en');
const NOW = new Date('2026-11-23T13:00:00Z'); // 15:00 Athens, Monday 23 Nov

const person = (id: string, surname: string) => ({ id, first: 'Νίκος', surname, initials: '' });
const match = (id: string, over: Partial<CardMatch> = {}): CardMatch => ({
  kind: 'match',
  id,
  meta: '',
  learn: '',
  doubles: false,
  a: { people: [person(`${id}a`, 'Παππάς')], sub: null },
  b: { people: [person(`${id}b`, 'Λιάκος')], sub: null },
  startsAt: '2026-11-23T16:00:00Z',
  ...over,
});
// tomorrow, 24 Nov: 10:00 and 12:30 Athens
const tom = (id: string, iso = '2026-11-24T08:00:00Z') => match(id, { later: true, startsAt: iso });

describe('nextDayKey', () => {
  it('the next day, across a month and a year', () => {
    expect(nextDayKey('2026-11-23')).toBe('2026-11-24');
    expect(nextDayKey('2026-11-30')).toBe('2026-12-01');
    expect(nextDayKey('2026-12-31')).toBe('2027-01-01');
  });
  it('the DST night (25 Oct 2026 in Athens) is still one day', () => expect(nextDayKey('2026-10-25')).toBe('2026-10-26'));
});

describe('isClosed', () => {
  it('the feed says so', () => expect(isClosed(match('m', { closed: true }), NOW)).toBe(true));
  it('past its lock by the clock, though the feed read it open', () => expect(isClosed(match('m', { lockAt: '2026-11-23T12:59:00Z' }), NOW)).toBe(true));
  it('before its lock, or no lock: open', () => {
    expect(isClosed(match('m', { lockAt: '2026-11-23T13:01:00Z' }), NOW)).toBe(false);
    expect(isClosed(match('m'), NOW)).toBe(false);
  });
});

describe('tomorrowOf', () => {
  it('counts only the next day and takes the first time', () => {
    const cards = [match('today'), tom('t2', '2026-11-24T10:30:00Z'), tom('t1'), tom('later', '2026-11-25T08:00:00Z')];
    expect(tomorrowOf(cards, NOW)).toEqual({ n: 2, time: '10:00' });
  });
  it('a match with only its day counts, and has no time', () => {
    expect(tomorrowOf([match('d', { later: true, startsAt: undefined, day: '2026-11-24' })], NOW)).toEqual({ n: 1, time: null });
  });
  it('nothing tomorrow (the next one is later): null', () => expect(tomorrowOf([tom('x', '2026-11-26T08:00:00Z')], NOW)).toBeNull());
});

describe('dayEnd', () => {
  it('a match still open and not voted: not the end', () => {
    expect(dayEnd([match('a', { myVote: 'a' }), match('b')], NOW)).toBeNull();
  });
  it('no match today: not the end (the «Σήμερα δεν έχει ματς» line is for that)', () => expect(dayEnd([tom('t')], NOW)).toBeNull());
  it('all voted: done, with how many and that a vote can change', () => {
    expect(dayEnd([match('a', { myVote: 'a' }), match('b', { myVote: 'b' }), tom('t')], NOW)).toEqual({
      variant: 'done',
      voted: 2,
      canChange: true,
      tomorrow: { n: 1, time: '10:00' },
    });
  });
  it('voted and closed mixed: done, counting your votes only', () => {
    const end = dayEnd([match('a', { myVote: 'a' }), match('b', { closed: true })], NOW);
    expect(end).toMatchObject({ variant: 'done', voted: 1, canChange: true, tomorrow: null });
  });
  it('a vote of this session counts (the feed still says not voted)', () => {
    const session = new Map([['b', 'a' as const]]);
    expect(dayEnd([match('a', { myVote: 'a' }), match('b')], NOW, (m) => session.get(m.id) ?? m.myVote)?.voted).toBe(2);
  });
  it('everything closed, nothing tomorrow: the «έκλεισαν» variant, nothing to change', () => {
    expect(dayEnd([match('a', { closed: true, myVote: 'a' }), match('b', { closed: true })], NOW)).toEqual({ variant: 'closed', voted: 1, canChange: false, tomorrow: null });
  });
  it('closed before you voted any, tomorrow has some: still «έκλεισαν», never «Ψήφισες και τα 0»', () => {
    expect(dayEnd([match('a', { closed: true }), tom('t')], NOW)).toMatchObject({ variant: 'closed', voted: 0 });
  });
  it('all closed with your votes in and tomorrow on: done, nothing left to change', () => {
    expect(dayEnd([match('a', { closed: true, myVote: 'b' }), tom('t')], NOW)).toMatchObject({ variant: 'done', voted: 1, canChange: false });
  });
});

describe('dayEndRows', () => {
  const quiz = (answered: number): QuizCardView => ({ n: 6, answered, line: '', earned: answered === 6, done: answered === 6 });
  it('tomorrow, the quiz left, all tournaments, with where each goes', () => {
    const end = { variant: 'done' as const, voted: 12, canChange: true, tomorrow: { n: 14, time: '10:00' } };
    expect(dayEndRows(end, quiz(0), t)).toEqual([
      { key: 'tomorrow', label: 'Αύριο: 14 ματς, το πρώτο στις 10:00', href: '/all-matches?day=tomorrow' },
      { key: 'quiz', label: 'Σου μένει το quiz: 6 ερωτήσεις, +30', href: '/quiz' },
      { key: 'tournaments', label: 'Όλα τα τουρνουά', href: '/tournaments' },
    ]);
  });
  it('the quiz counts the questions still to play', () => {
    const end = { variant: 'done' as const, voted: 1, canChange: true, tomorrow: null };
    expect(dayEndRows(end, quiz(2), t)[0]?.label).toBe('Σου μένει το quiz: 4 ερωτήσεις, +30');
  });
  it('quiz played or locked, nothing tomorrow: only the tournaments row', () => {
    const end = { variant: 'closed' as const, voted: 0, canChange: false, tomorrow: null };
    expect(dayEndRows(end, quiz(6), t).map((r) => r.key)).toEqual(['tournaments']);
    expect(dayEndRows(end, null, t).map((r) => r.key)).toEqual(['tournaments']);
  });
  it('tomorrow with no time known: no tomorrow row', () => {
    const end = { variant: 'done' as const, voted: 1, canChange: true, tomorrow: { n: 3, time: null } };
    expect(dayEndRows(end, null, t).map((r) => r.key)).toEqual(['tournaments']);
  });
  it('in English too', () => {
    const end = { variant: 'done' as const, voted: 1, canChange: true, tomorrow: { n: 2, time: '09:30' } };
    expect(dayEndRows(end, null, en).map((r) => r.label)).toEqual(['Tomorrow: 2 matches, the first at 09:30', 'All tournaments']);
  });
});

describe('noneTodayLine', () => {
  it('nothing today, something tomorrow', () => {
    expect(noneTodayLine([tom('a'), tom('b', '2026-11-24T09:00:00Z')], NOW, t)).toBe('Σήμερα δεν έχει ματς. Αύριο 2, από τις 10:00.');
  });
  it('a match today, closed or not: no line', () => expect(noneTodayLine([match('a', { closed: true }), tom('b')], NOW, t)).toBeNull());
  it('nothing tomorrow either: no line (the Baller note stays)', () => expect(noneTodayLine([], NOW, t)).toBeNull());
});

describe('moreVotes', () => {
  const OPEN = { key: 'T', title: 'Open', logo: null, sub: null, club: null };
  it('the whole list and the open rows the home does not show', () => {
    const rows = [
      match('a', { tournamentId: 'T', group: OPEN }),
      match('b', { tournamentId: 'T', group: OPEN }),
      match('c', { tournamentId: 'T', group: OPEN }),
      match('d', { tournamentId: 'T', group: OPEN }),
      match('e', { tournamentId: 'T', group: OPEN, myVote: 'a' }),
    ];
    const groups = groupVotes(rows);
    expect(moreVotes(groups, topVotes(groups))).toEqual({ total: 5, left: 1 });
  });
  it('everything already on the home: no row', () => {
    const groups = groupVotes([match('a'), match('b')]);
    expect(moreVotes(groups, topVotes(groups))).toBeNull();
  });
  it('a vote made this session leaves the count of open ones', () => {
    const groups = groupVotes([match('a'), match('b'), match('c'), match('d'), match('e')]);
    const shown = topVotes(groups);
    expect(moreVotes(groups, shown, (m) => (m.id === 'e' ? 'a' : m.myVote))).toEqual({ total: 5, left: 1 });
  });
});

describe('closesInMinutes', () => {
  const lock = '2026-11-23T13:20:00Z';
  it('the last half hour, rounded up', () => {
    expect(closesInMinutes(lock, NOW)).toBe(20);
    expect(closesInMinutes(lock, new Date('2026-11-23T13:19:30Z'))).toBe(1);
    expect(closesInMinutes(lock, new Date('2026-11-23T12:50:00Z'))).toBe(30);
  });
  it('more than 30 minutes away: no tag', () => expect(closesInMinutes(lock, new Date('2026-11-23T12:49:59Z'))).toBeNull());
  it('at or past the lock, or no lock: no tag, never 0', () => {
    expect(closesInMinutes(lock, new Date('2026-11-23T13:20:00Z'))).toBeNull();
    expect(closesInMinutes(lock, new Date('2026-11-23T13:25:00Z'))).toBeNull();
    expect(closesInMinutes(undefined, NOW)).toBeNull();
    expect(closesInMinutes('not a date', NOW)).toBeNull();
  });
  it('the shared clock waits for the next whole minute', () => {
    expect(msToNextMinute(new Date('2026-11-23T13:00:00Z'))).toBe(60_000);
    expect(msToNextMinute(new Date('2026-11-23T13:00:45.500Z'))).toBe(14_500);
  });
});

describe('quizChip', () => {
  const view = (answered: number, earned = answered === 6): QuizCardView => ({ n: 6, answered, line: '', earned, done: answered === 6 });
  it('locked or no quiz: no chip', () => expect(quizChip(null, t)).toBeNull());
  it('not started and part way: «Quiz n/6 ›», no lime', () => {
    expect(quizChip(view(0), t)).toEqual({ label: 'Quiz 0/6 ›', done: false, plus: null });
    expect(quizChip(view(2), t)).toEqual({ label: 'Quiz 2/6 ›', done: false, plus: null });
  });
  it('played: «Quiz ✓» and the earned «+30»', () => expect(quizChip(view(6), t)).toEqual({ label: 'Quiz ✓', done: true, plus: '+30' }));
  it('played but the +30 not in (yet): no «+30»', () => expect(quizChip(view(6, false), t)?.plus).toBeNull());
});

describe('voteList with a day asked for', () => {
  const cards = [match('a', { myVote: 'a' }), match('c', { closed: true, myVote: 'b' }), tom('t')];
  it('by itself it moves to tomorrow once today is voted', () => expect(voteList(cards).mode).toBe('tomorrow'));
  it('today: today\'s votes, closed ones too («Δες τις ψήφους σου ›»)', () => {
    const v = voteList(cards, new Map(), 'today');
    expect(v.mode).toBe('today');
    expect(v.groups.flatMap((g) => g.rows.map((r) => r.id)).sort()).toEqual(['a', 'c']);
  });
  it('tomorrow: tomorrow\'s, even while today has open rows', () => {
    expect(voteList([match('x'), tom('t')], new Map(), 'tomorrow').groups.flatMap((g) => g.rows.map((r) => r.id))).toEqual(['t']);
  });
  it('a day with nothing falls back to the usual list', () => expect(voteList([tom('t')], new Map(), 'today').mode).toBe('tomorrow'));
});
