// lib/daily/content/schedule.ts
//
// Turns one generation run into the days between now and the next upload.
//
// Results arrive twice a week, not daily (content spec §2), so a run is not
// "today's matches" — it is a slice of a pool that has to last. If Monday takes
// the eight best matches, Sunday gets scraps.

import type { GameCard } from '../types';
import type { Candidate } from './generate';

export interface Day {
    /** ISO date */
    date: string;
    cards: GameCard[];
}

export interface ScheduleOptions {
    /** first day of the schedule, ISO date */
    from: string;
    /** how many days until the next upload */
    days: number;
    /** cards per run; five rather than eight on a thin week (§2.2) */
    size?: number;
    /** ids this tester has already been shown */
    seenCardIds?: string[];
}

/** Which match a card came from, so a run never asks about one twice. */
function matchOf(card: GameCard): string {
    const [, rest] = card.id.split(':');
    return rest ?? card.id;
}

/** The answer shape a card uses, so a run does not become three of the same. */
function shapeOf(card: GameCard): string {
    switch (card.kind) {
        case 'result': return 'pair';
        case 'thisThat': return 'pair';
        case 'score':
        case 'guess':
        case 'poll':
        case 'award': return 'options';
        case 'upset':
        case 'combo': return 'rows';
        case 'order': return 'order';
    }
}

function addDays(date: string, n: number): string {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

/**
 * Deal the ranked pool across the days.
 *
 * Round-robin rather than taking the top N for day one. Every day gets
 * comparable material — day one keeps a slight edge because it draws first —
 * and the week does not degrade into leftovers. A day that cannot be filled is
 * left short rather than padded with repeats: a tight five-card run beats a
 * bloated eight.
 */
export function scheduleRuns(
    candidates: Candidate[],
    { from, days, size = 8, seenCardIds = [] }: ScheduleOptions,
): Day[] {
    const seen = new Set(seenCardIds);
    const pool = candidates.filter((c) => !seen.has(c.card.id));

    const plan: Day[] = Array.from({ length: days }, (_, k) => ({
        date: addDays(from, k),
        cards: [],
    }));

    // Per-day bookkeeping: one card per match, and no more than two of a shape.
    const usedMatches = plan.map(() => new Set<string>());
    const shapeCounts = plan.map(() => new Map<string, number>());
    const takenGlobally = new Set<string>();

    // Several passes: each pass offers every day one more card, so the deal
    // stays even when a day has to skip a candidate it cannot take.
    for (let round = 0; round < size; round++) {
        for (let day = 0; day < days; day++) {
            if (plan[day].cards.length > round) continue;

            const pick = pool.find((c) => {
                if (takenGlobally.has(c.card.id)) return false;
                if (usedMatches[day].has(matchOf(c.card))) return false;
                const shape = shapeOf(c.card);
                return (shapeCounts[day].get(shape) ?? 0) < 2;
            });
            if (!pick) continue;

            takenGlobally.add(pick.card.id);
            usedMatches[day].add(matchOf(pick.card));
            const shape = shapeOf(pick.card);
            shapeCounts[day].set(shape, (shapeCounts[day].get(shape) ?? 0) + 1);
            plan[day].cards.push(pick.card);
        }
    }

    return plan;
}

/** What the schedule cost, for the review screen and for tuning. */
export function describeSchedule(plan: Day[]): {
    days: number;
    filled: number;
    short: { date: string; cards: number }[];
    cardsUsed: number;
} {
    const target = Math.max(...plan.map((d) => d.cards.length), 0);
    return {
        days: plan.length,
        filled: plan.filter((d) => d.cards.length === target).length,
        short: plan.filter((d) => d.cards.length < target)
            .map((d) => ({ date: d.date, cards: d.cards.length })),
        cardsUsed: plan.reduce((n, d) => n + d.cards.length, 0),
    };
}
