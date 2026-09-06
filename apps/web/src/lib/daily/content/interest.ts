// lib/daily/content/interest.ts
//
// Correct is the floor. Interesting is the product.
//
// Every candidate fact gets a score; the scheduler takes the top of each
// bucket. The weights are a starting point to tune against real engagement —
// they are deliberately in one place so tuning is a diff, not an archaeology
// exercise.
//
// Two of the six inputs are shaped by what the data actually holds (content
// spec §2.2): `surprise` works today because odds are populated on every match,
// and `closeness` reads the scoreline because `total_games` is empty on every
// row.

import type { Fact, ResultValue } from './facts';

export const WEIGHTS = {
    surprise: 0.35,
    closeness: 0.20,
    recency: 0.15,
    stakes: 0.15,
    novelty: 0.10,
    disagreement: 0.05,
} as const;

/** Later rounds are worth more. Unlabelled rounds sit mid-table, not bottom. */
const ROUND_WEIGHT: Record<string, number> = {
    'Finals': 1,
    'Semifinals': 0.8,
    'Quarterfinals': 0.6,
    'Round of 16': 0.4,
    'Round of 32': 0.25,
    'Round of 64': 0.15,
};

export interface Context {
    /** when the run is being built, for recency */
    now: string;
    /** player ids featured in recent runs, for novelty */
    recentlyFeatured?: Set<string>;
    /** 0..1, how evenly the crowd split. Zero until there are answers (§4.1) */
    disagreementFor?: (factId: string) => number | null;
}

/** How far the outcome was from what the model expected. */
export function surprise(value: ResultValue): number {
    if (value.expectedA === null) return 0.35;   // unknown, not surprising
    const expectedForWinner = value.winner === 'a' ? value.expectedA : 1 - value.expectedA;
    // 0.5 -> a coin flip, nothing to say. 0.1 -> the favourite lost badly.
    return Math.max(0, Math.min(1, (0.5 - expectedForWinner) * 2 + 0.5));
}

/** A close match is a story; a whitewash is not. */
export function closeness(value: ResultValue): number {
    if (value.superTiebreak) return 1;
    // '2-1' / '1-2' went the distance without needing the tiebreak.
    if (/^[12]-[12]$/.test(value.matchResult) && value.matchResult !== '2-0'
        && value.matchResult !== '0-2') {
        return 0.75;
    }
    return 0.25;
}

/** Exponential decay, ~10 day half-life — the pool is weekly, not daily. */
export function recency(playedAt: string | null, now: string): number {
    if (!playedAt) return 0;
    const days = (Date.parse(now) - Date.parse(playedAt)) / 864e5;
    if (!Number.isFinite(days) || days < 0) return 1;
    return Math.pow(0.5, days / 10);
}

export function stakes(round: string | null): number {
    if (!round) return 0.3;
    return ROUND_WEIGHT[round] ?? 0.3;
}

/** Penalise players the run has leaned on lately. */
export function novelty(subjects: string[], recentlyFeatured?: Set<string>): number {
    if (!recentlyFeatured || recentlyFeatured.size === 0) return 1;
    const seen = subjects.filter((id) => recentlyFeatured.has(id)).length;
    return subjects.length === 0 ? 1 : 1 - seen / subjects.length;
}

function isResultValue(value: unknown): value is ResultValue {
    return typeof value === 'object' && value !== null && 'winner' in value;
}

export function score(fact: Fact, context: Context): number {
    const value = fact.value;

    // A ranking fact has no match behind it — it is steady, mildly interesting,
    // and exists to keep the deck full on a thin week.
    if (!isResultValue(value)) {
        return 0.3 * WEIGHTS.novelty + 0.2;
    }

    const disagreement = context.disagreementFor?.(fact.id) ?? 0;

    return (
        WEIGHTS.surprise * surprise(value)
        + WEIGHTS.closeness * closeness(value)
        + WEIGHTS.recency * recency(value.playedAt, context.now)
        + WEIGHTS.stakes * stakes(value.round)
        + WEIGHTS.novelty * novelty(fact.subjects, context.recentlyFeatured)
        + WEIGHTS.disagreement * disagreement
    );
}

/**
 * Proximity multiplier. The cheapest quality lever there is, and it multiplies
 * effective supply — two players get different runs from the same thin pool.
 */
export function proximity(
    fact: Fact,
    { followedIds, claimedId }: { followedIds?: string[]; claimedId?: string | null },
): number {
    if (claimedId && fact.subjects.includes(claimedId)) return 2;
    if (followedIds?.some((id) => fact.subjects.includes(id))) return 1.6;
    return 1;
}

export function rank(facts: Fact[], context: Context, viewer: {
    followedIds?: string[]; claimedId?: string | null;
} = {}): Fact[] {
    return facts
        .map((f) => ({ ...f, interest: score(f, context) * proximity(f, viewer) }))
        .sort((x, y) => y.interest - x.interest);
}
