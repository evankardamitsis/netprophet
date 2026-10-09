import { describe, expect, it } from 'vitest';
import {
  applyOutcome,
  buyFreeze,
  initialStreak,
  recordVoteCast,
  resolveVote,
  validateVote,
  type Match,
  type StreakState,
  type Vote,
} from './index';

const T = '2026-10-09T12:00:00Z';
const match = (over: Partial<Match> = {}): Match => ({
  id: 'm1',
  sport: 'tennis',
  type: 'doubles',
  sides: [{ playerIds: ['a', 'b'] }, { playerIds: ['c', 'd'] }],
  status: 'confirmed',
  startsAt: '2026-10-09T10:00:00Z',
  lockAt: null,
  tournamentId: null,
  result: { winnerSide: 0, score: { totals: [2, 0] } },
  ...over,
});
const vote = (over: Partial<Vote> = {}): Vote => ({
  id: 'v1', userId: 'u1', source: 'match', matchId: 'm1', cardId: null, optionIndex: 0,
  createdAt: '2026-10-09T09:00:00Z', resolvedAt: null, outcome: null, isUpsetCall: false, points: 0, ...over,
});

describe('resolveVote edge cases', () => {
  it('is pure: input state is not mutated', () => {
    const s = initialStreak();
    const frozen = JSON.stringify(s);
    resolveVote(s, { vote: vote(), match: match(), resolvedAt: T, crowd: { votesForWinner: 5, totalVotes: 10 } });
    expect(JSON.stringify(s)).toBe(frozen);
  });
  it('resolving twice is a no-op the second time', () => {
    const input = { vote: vote(), match: match(), resolvedAt: T, crowd: { votesForWinner: 5, totalVotes: 10 } };
    const first = resolveVote(initialStreak(), input);
    if (first.status !== 'resolved') throw new Error('expected resolved');
    const second = resolveVote(first.streak, { ...input, vote: first.vote });
    expect(second).toEqual({ status: 'already_resolved' });
  });
  it('rejects a vote for a different match and non-match votes', () => {
    const base = { match: match(), resolvedAt: T, crowd: { votesForWinner: 5, totalVotes: 10 } };
    expect(resolveVote(initialStreak(), { ...base, vote: vote({ matchId: 'other' }) })).toEqual({ status: 'invalid', reason: 'wrong_match' });
    expect(resolveVote(initialStreak(), { ...base, vote: vote({ source: 'quiz', matchId: null }) })).toEqual({ status: 'invalid', reason: 'not_a_match_vote' });
    expect(resolveVote(initialStreak(), { ...base, vote: vote({ optionIndex: 3 }) })).toEqual({ status: 'invalid', reason: 'invalid_option' });
  });
  it('confirmed without a result stays pending', () => {
    const r = resolveVote(initialStreak(), { vote: vote(), match: match({ result: null }), resolvedAt: T, crowd: { votesForWinner: 0, totalVotes: 0 } });
    expect(r).toEqual({ status: 'pending' });
  });
  it('void match leaves freezes and counters alone', () => {
    const s = { ...initialStreak(), current: 4, chain: 4, best: 6, freezes: ['free' as const], votesSinceFreeFreeze: 9 };
    const r = resolveVote(s, { vote: vote(), match: match({ status: 'void', result: null }), resolvedAt: T, crowd: { votesForWinner: 0, totalVotes: 0 } });
    expect(r.status).toBe('void');
    if (r.status === 'void') expect(r.vote).toMatchObject({ outcome: 'none', points: 0, resolvedAt: T });
  });
  it('a vote on side 1 wins when side 1 wins (doubles)', () => {
    const r = resolveVote(initialStreak(), { vote: vote({ optionIndex: 1 }), match: match({ result: { winnerSide: 1, score: null } }), resolvedAt: T, crowd: { votesForWinner: 5, totalVotes: 10 } });
    expect(r.status === 'resolved' && r.vote.outcome).toBe('correct');
  });
});

describe('vote lock', () => {
  it('rejected after lock regardless of the option or the user s history', () => {
    const m = match({ status: 'scheduled', startsAt: '2026-10-09T15:00:00Z' });
    expect(validateVote({ match: m, optionIndex: 0, castAt: '2026-10-09T15:00:00Z', alreadyVoted: false })).toEqual({ ok: false, reason: 'locked' });
    expect(validateVote({ match: m, optionIndex: 0, castAt: '2026-10-09T14:59:59.999Z', alreadyVoted: false })).toEqual({ ok: true });
  });
});

describe('freeze stacking', () => {
  it('paid purchase is rejected at 2 held, allowed again after one is spent', () => {
    let s = initialStreak();
    for (let i = 0; i < 2; i++) {
      const r = buyFreeze(s);
      if (!r.ok) throw new Error('should buy');
      s = r.state;
    }
    expect(buyFreeze(s)).toEqual({ ok: false, reason: 'max_freezes' });
    s = applyOutcome({ ...s, current: 3, chain: 3 }, false, T).state;
    expect(s.freezes).toEqual(['paid']);
    expect(buyFreeze(s).ok).toBe(true);
  });
  it('free freeze from votes is not granted when 2 are already held', () => {
    let s: StreakState = { ...initialStreak(), freezes: ['paid', 'paid'] };
    for (let i = 0; i < 40; i++) s = recordVoteCast(s).state;
    expect(s.freezes).toEqual(['paid', 'paid']);
    expect(s.votesSinceFreeFreeze).toBe(15);
  });
  it('a wrong vote never makes best go down', () => {
    const s = applyOutcome({ ...initialStreak(), current: 5, best: 8, chain: 5 }, false, T).state;
    expect(s.best).toBe(8);
    expect(s.current).toBe(0);
  });
});
