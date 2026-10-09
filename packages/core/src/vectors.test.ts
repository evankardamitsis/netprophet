/**
 * Runs the language-neutral JSON vectors in test-vectors/. The SQL implementation is checked against the same files.
 */
import { describe, expect, it } from 'vitest';
import {
  applyOutcome,
  applyQuestEvent,
  buyFreeze,
  daysLeftInMonth,
  evaluateUnlocks,
  initialStreak,
  isUpset,
  monthKey,
  nextDayReset,
  nextMonthReset,
  nextWeekReset,
  pointsForVote,
  quizCompletionPoints,
  quizDayKey,
  recordVoteCast,
  resolveBatch,
  validateVote,
  windowKeyFor,
  type Match,
  type MatchStatus,
  type QuestDef,
  type QuestProgress,
  type QuestWindow,
  type StreakState,
  type UnlockCounters,
  type Vote,
} from './index';
import pointsVectors from '../test-vectors/points.json';
import streakVectors from '../test-vectors/streak.json';
import questTimeVectors from '../test-vectors/quests-time.json';
import questVectors from '../test-vectors/quests.json';
import unlockVectors from '../test-vectors/unlocks.json';
import voteVectors from '../test-vectors/votes.json';
import resolutionVectors from '../test-vectors/resolution.json';

interface Case {
  name: string;
  input: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  expected: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}
interface Doc {
  suite: string;
  version: number;
  groups: Array<{ fn: string; cases: Case[] }>;
}

type Impl = (input: any) => unknown; // eslint-disable-line @typescript-eslint/no-explicit-any

function run(doc: unknown, impls: Record<string, Impl>): void {
  const d = doc as Doc;
  describe(`vectors: ${d.suite}`, () => {
    expect(d.version).toBe(1);
    for (const g of d.groups) {
      const impl = impls[g.fn];
      describe(g.fn, () => {
        it('has an implementation', () => expect(impl).toBeTypeOf('function'));
        for (const c of g.cases) {
          it(c.name, () => expect(impl?.(c.input)).toEqual(c.expected));
        }
      });
    }
  });
}

run(pointsVectors, {
  pointsForVote: (i) => pointsForVote(i),
  isUpset: (i) => isUpset(i),
  quizCompletionPoints: (i) => quizCompletionPoints(i),
  quizDayKey: (i) => quizDayKey(i),
});

run(streakVectors, {
  streakSequence: (i: { initial: StreakState; steps: Array<Record<string, any>> }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    let state: StreakState = i.initial ?? initialStreak();
    const events: unknown[] = [];
    for (const step of i.steps) {
      const n = (step.repeat as number | undefined) ?? 1;
      for (let k = 0; k < n; k++) {
        if (step.op === 'cast') {
          const r = recordVoteCast(state);
          state = r.state;
          events.push({ kind: 'cast', freezeGranted: r.freezeGranted });
        } else if (step.op === 'buy_freeze') {
          const r = buyFreeze(state);
          if (r.ok) {
            state = r.state;
            events.push({ kind: 'bought' });
          } else events.push({ kind: 'rejected', reason: r.reason });
        } else {
          const r = applyOutcome(state, step.correct as boolean, step.at as string);
          state = r.state;
          events.push(r.event);
        }
      }
    }
    return { events, final: state };
  },
});

const dailyOrWeekly = {
  daily: nextDayReset,
  weekly: nextWeekReset,
  monthly: nextMonthReset,
} as const;

run(questTimeVectors, {
  windowKey: (i: { window: QuestWindow; at: string }) => windowKeyFor(i.window, i.at),
  monthKey: (i) => monthKey(i),
  nextReset: (i: { window: keyof typeof dailyOrWeekly; at: string }) => dailyOrWeekly[i.window](i.at),
  daysLeftInMonth: (i) => daysLeftInMonth(i),
});

run(questVectors, {
  applyQuestEvent: (i: { defs: Array<Omit<QuestDef, 'reward'>>; stored: QuestProgress[]; event: { type: any; at: string } }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const defs = i.defs.map((d) => ({ ...d, reward: { cosmeticId: null, badgeId: 'x', badgeAmount: 1 } }) as QuestDef);
    return applyQuestEvent(defs, i.stored, i.event);
  },
});

run(unlockVectors, {
  evaluateUnlocks: (i: { counters: UnlockCounters; previouslyUnlocked: string[]; existingPlayer: boolean }) =>
    evaluateUnlocks(i.counters, i.previouslyUnlocked, { existingPlayer: i.existingPlayer }),
});

function matchOf(args: { id?: string; status: MatchStatus; startsAt?: string; lockAt?: string | null; winnerSide?: 0 | 1 | null }): Match {
  return {
    id: args.id ?? 'm1',
    sport: 'tennis',
    type: 'singles',
    sides: [{ playerIds: ['a'] }, { playerIds: ['b'] }],
    status: args.status,
    startsAt: args.startsAt ?? '2026-10-09T15:00:00Z',
    lockAt: args.lockAt ?? null,
    tournamentId: null,
    result: args.winnerSide === undefined || args.winnerSide === null ? null : { winnerSide: args.winnerSide, score: null },
  };
}

run(voteVectors, {
  validateVote: (i) =>
    validateVote({
      match: matchOf({ status: i.matchStatus, startsAt: i.startsAt, lockAt: i.lockAt }),
      optionIndex: i.optionIndex,
      castAt: i.castAt,
      alreadyVoted: i.alreadyVoted,
    }),
});

run(resolutionVectors, {
  resolveBatch: (i: { streak: StreakState; items: Array<Record<string, any>> }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const items = i.items.map((x) => {
      const vote: Vote = {
        id: x.voteId,
        userId: 'u1',
        source: 'match',
        matchId: x.matchId,
        cardId: null,
        optionIndex: x.option,
        createdAt: x.createdAt,
        resolvedAt: x.alreadyResolved ? '2026-10-08T00:00:00Z' : null,
        outcome: x.alreadyResolved ? 'correct' : null,
        isUpsetCall: false,
        points: 0,
      };
      return {
        vote,
        match: matchOf({ id: x.matchId, status: x.matchStatus, winnerSide: x.winnerSide }),
        resolvedAt: x.resolvedAt,
        crowd: { votesForWinner: x.votesForWinner, totalVotes: x.totalVotes },
      };
    });
    const r = resolveBatch(i.streak, items);
    return {
      entries: r.entries.map((e) => {
        const res = e.result;
        const resolved = res.status === 'resolved' || res.status === 'void';
        return {
          voteId: e.voteId,
          status: res.status,
          outcome: resolved ? res.vote.outcome : null,
          points: resolved ? res.vote.points : 0,
          streakEvent: res.status === 'resolved' ? res.streakEvent : null,
          isUpsetCall: resolved ? res.vote.isUpsetCall : false,
        };
      }),
      final: r.streak,
    };
  },
});
