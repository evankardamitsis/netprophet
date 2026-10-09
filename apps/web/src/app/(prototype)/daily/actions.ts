'use server';

import type { Locale } from '@/lib/daily/copy/types';
import type { GameCard } from '@/lib/daily/types';
import { approvedForDay } from '@/lib/daily/content/store';
import { buildRun } from '@/lib/daily/session';

// The run a player gets.
//
// Reads approved cards for the day. No auth: these are the cards of a public
// game, already reviewed, and the action can only read.

export type RunSource = 'live' | 'fixture';

export interface DailyRun {
    source: RunSource;
    cards: GameCard[];
}

export async function loadRun(
    locale: Locale, date: string, seenCardIds: string[],
): Promise<DailyRun> {
    try {
        const cards = await approvedForDay({ locale, date, seenCardIds });
        // Approved but empty is a real answer — it means nobody has approved
        // anything for today, and the player should be told that rather than
        // shown five invented players as though they were the local scene.
        return { source: 'live', cards };
    } catch {
        // No database configured at all: fall back to the fixture so the
        // prototype still runs standalone, and say so in the result.
        return {
            source: 'fixture',
            cards: buildRun({ seenCardIds, seed: date, locale }),
        };
    }
}
