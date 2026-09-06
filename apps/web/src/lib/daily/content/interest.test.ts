import { describe, expect, it } from 'vitest';
import {
    closeness, novelty, proximity, rank, recency, stakes, surprise,
} from './interest';
import type { Fact, ResultValue } from './facts';

const value = (over: Partial<ResultValue> = {}): ResultValue => ({
    matchId: 'm1',
    a: { id: 'a', playerIds: ['a'] },
    b: { id: 'b', playerIds: ['b'] },
    winner: 'a', matchResult: '2-0', superTiebreak: false, sets: ['6-4', '6-2'],
    expectedA: 0.5, round: null, tournament: null, surface: null,
    playedAt: '2026-09-01T00:00:00Z', ...over,
});

const fact = (over: Partial<Fact<ResultValue>> = {}): Fact<ResultValue> => ({
    id: 'f1', kind: 'result', subjects: ['a', 'b'], value: value(),
    computedAt: '2026-09-06T00:00:00Z', validUntil: null,
    source: { table: 'match_results', ids: ['m1'] }, interest: 0, ...over,
});

describe('surprise', () => {
    it('is neutral on a coin flip', () => {
        expect(surprise(value({ expectedA: 0.5 }))).toBeCloseTo(0.5);
    });

    it('is high when a heavy favourite loses', () => {
        // side a was given 15%, and won
        expect(surprise(value({ expectedA: 0.15, winner: 'a' }))).toBeGreaterThan(0.8);
    });

    it('is low when the favourite wins', () => {
        expect(surprise(value({ expectedA: 0.9, winner: 'a' }))).toBeLessThan(0.2);
    });

    it('does not reward a match with no odds', () => {
        expect(surprise(value({ expectedA: null }))).toBeLessThan(0.5);
    });
});

describe('closeness', () => {
    it('rates a champions tiebreak top', () => {
        expect(closeness(value({ superTiebreak: true }))).toBe(1);
    });

    it('rates a straight-sets win low', () => {
        expect(closeness(value({ matchResult: '2-0' }))).toBeLessThan(0.5);
    });

    it('rates a three-setter above a whitewash', () => {
        expect(closeness(value({ matchResult: '2-1' })))
            .toBeGreaterThan(closeness(value({ matchResult: '2-0' })));
    });
});

describe('recency', () => {
    const now = '2026-09-06T00:00:00Z';
    it('is 1 for today and halves in ten days', () => {
        expect(recency(now, now)).toBeCloseTo(1);
        expect(recency('2026-08-27T00:00:00Z', now)).toBeCloseTo(0.5, 1);
    });
    it('is 0 with no date', () => {
        expect(recency(null, now)).toBe(0);
    });
});

describe('stakes', () => {
    it('ranks a final above a first round', () => {
        expect(stakes('Finals')).toBeGreaterThan(stakes('Round of 64'));
    });
    it('puts an unlabelled round mid-table, not bottom', () => {
        expect(stakes(null)).toBeGreaterThan(stakes('Round of 64'));
        expect(stakes(null)).toBeLessThan(stakes('Quarterfinals'));
    });
});

describe('novelty', () => {
    it('is full when nobody has been featured', () => {
        expect(novelty(['a', 'b'])).toBe(1);
    });
    it('drops as featured players reappear', () => {
        expect(novelty(['a', 'b'], new Set(['a']))).toBe(0.5);
        expect(novelty(['a', 'b'], new Set(['a', 'b']))).toBe(0);
    });
});

describe('proximity', () => {
    it('doubles a card about the player themselves', () => {
        expect(proximity(fact(), { claimedId: 'a' })).toBe(2);
    });
    it('lifts a card about someone they follow', () => {
        expect(proximity(fact(), { followedIds: ['b'] })).toBe(1.6);
    });
    it('leaves a stranger alone', () => {
        expect(proximity(fact(), { followedIds: ['zzz'] })).toBe(1);
    });
});

describe('rank', () => {
    const context = { now: '2026-09-06T00:00:00Z' };

    it('puts the upset above the whitewash', () => {
        const shock = fact({
            id: 'shock',
            value: value({ expectedA: 0.12, winner: 'a', superTiebreak: true, round: 'Finals' }),
        });
        const chalk = fact({
            id: 'chalk',
            value: value({ expectedA: 0.95, winner: 'a', matchResult: '2-0', round: 'Round of 64' }),
        });
        expect(rank([chalk, shock], context)[0].id).toBe('shock');
    });

    it('lets proximity outrank a better card about strangers', () => {
        const strangers = fact({
            id: 'strangers', subjects: ['x', 'y'],
            value: value({ expectedA: 0.2, round: 'Finals', superTiebreak: true }),
        });
        const mine = fact({ id: 'mine', subjects: ['me'], value: value({ expectedA: 0.5 }) });
        const ranked = rank([strangers, mine], context, { claimedId: 'me' });
        expect(ranked[0].id).toBe('mine');
    });
});
