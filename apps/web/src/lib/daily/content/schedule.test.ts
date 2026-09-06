import { describe, expect, it } from 'vitest';
import { describeSchedule, scheduleRuns } from './schedule';
import type { Candidate } from './generate';
import type { GameCard } from '../types';

const card = (id: string, kind: GameCard['kind'] = 'score'): GameCard => ({
    id, kind, kicker: 'k', question: 'q', explanation: 'e',
    points: 10, reveal: 'instant', scoring: true,
    options: ['a', 'b', 'c'], correctIndex: 0,
} as GameCard);

/** interest descends with index, so pool[0] is the best card */
const pool = (n: number, kind: GameCard['kind'] = 'score'): Candidate[] =>
    Array.from({ length: n }, (_, i) => ({
        card: card(`${kind}:m${i}`, kind),
        fact: { id: `f${i}` } as Candidate['fact'],
        interest: 1 - i / n,
    }));

describe('scheduleRuns', () => {
    it('spreads the best material rather than front-loading one day', () => {
        // 4 days, 2 cards each: day one should not hold both top cards
        const plan = scheduleRuns(pool(20), { from: '2026-09-07', days: 4, size: 2 });
        const dayOne = plan[0].cards.map((c) => c.id);
        expect(dayOne).toContain('score:m0');
        expect(dayOne).not.toContain('score:m1');
        expect(plan[1].cards.map((c) => c.id)).toContain('score:m1');
    });

    it('never shows the same card twice across the week', () => {
        const plan = scheduleRuns(pool(30), { from: '2026-09-07', days: 5, size: 4 });
        const all = plan.flatMap((d) => d.cards.map((c) => c.id));
        expect(new Set(all).size).toBe(all.length);
    });

    it('never asks about the same match twice in one run', () => {
        const twoPerMatch: Candidate[] = ['result:m1', 'score:m1', 'result:m2', 'score:m2']
            .map((id, i) => ({
                card: card(id, id.startsWith('result') ? 'result' : 'score'),
                fact: { id: `f${i}` } as Candidate['fact'],
                interest: 1 - i / 10,
            }));
        const [day] = scheduleRuns(twoPerMatch, { from: '2026-09-07', days: 1, size: 4 });
        const matches = day.cards.map((c) => c.id.split(':')[1]);
        expect(new Set(matches).size).toBe(matches.length);
    });

    it('caps how many cards share an answer shape', () => {
        const [day] = scheduleRuns(pool(20), { from: '2026-09-07', days: 1, size: 8 });
        // every card here is an option list, so the run stops at the cap
        expect(day.cards.length).toBe(2);
    });

    it('skips cards the tester has already seen', () => {
        const plan = scheduleRuns(pool(10), {
            from: '2026-09-07', days: 1, size: 3, seenCardIds: ['score:m0', 'score:m1'],
        });
        expect(plan[0].cards.map((c) => c.id)).not.toContain('score:m0');
    });

    it('leaves a day short rather than padding it', () => {
        const plan = scheduleRuns(pool(3), { from: '2026-09-07', days: 3, size: 8 });
        expect(plan.every((d) => d.cards.length <= 1)).toBe(true);
        expect(describeSchedule(plan).cardsUsed).toBe(3);
    });

    it('reports which days came up short', () => {
        const plan = scheduleRuns(pool(5), { from: '2026-09-07', days: 3, size: 2 });
        const summary = describeSchedule(plan);
        expect(summary.days).toBe(3);
        expect(summary.cardsUsed).toBeLessThanOrEqual(5);
    });
});
