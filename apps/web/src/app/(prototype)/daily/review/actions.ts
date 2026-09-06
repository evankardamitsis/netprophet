'use server';

import type { Locale } from '@/lib/daily/copy/types';
import type { GameCard } from '@/lib/daily/types';
import { assertReviewer } from '@/lib/daily/content/reviewAuth';
import {
    approveCard, editCard, listCards, rejectCard, templateHealth,
    type CardStatus,
} from '@/lib/daily/content/store';

// Every action validates the caller's token and admin status for itself.
// Corrections are attributed to the account that made them, so "who changed
// this" has an answer once more than one person reviews.

export interface QueueItem {
    id: string;
    card: GameCard;
    fact: {
        id: string; kind: string;
        source: { table: string; ids: string[] };
        validUntil: string | null;
    };
    interest: number;
}

export interface Queue {
    items: QueueItem[];
    health: Awaited<ReturnType<typeof templateHealth>>;
    reviewer: string;
}

export async function loadQueue(
    accessToken: string, locale: Locale, status: CardStatus, date?: string,
): Promise<Queue> {
    const reviewer = await assertReviewer(accessToken);
    const [cards, health] = await Promise.all([
        listCards({ locale, status, scheduledFor: date, limit: 40 }),
        templateHealth({ locale }),
    ]);

    return {
        reviewer: reviewer.email ?? reviewer.id,
        health,
        items: cards.map((row) => ({
            id: row.id,
            card: row.card,
            fact: {
                id: row.fact?.id ?? row.id,
                kind: row.fact?.kind ?? row.card.kind,
                source: row.fact?.source ?? { table: 'unknown', ids: [] },
                validUntil: row.valid_until,
            },
            interest: row.interest,
        })),
    };
}

export async function approve(
    accessToken: string, id: string, locale: Locale,
): Promise<void> {
    const reviewer = await assertReviewer(accessToken);
    await approveCard({ id, locale, reviewer: reviewer.email ?? reviewer.id });
}

export async function edit(
    accessToken: string, id: string, locale: Locale,
    corrected: GameCard, reason?: string,
): Promise<void> {
    const reviewer = await assertReviewer(accessToken);
    await editCard({
        id, locale, corrected, reason, reviewer: reviewer.email ?? reviewer.id,
    });
}

export async function reject(
    accessToken: string, id: string, locale: Locale, reason: string,
): Promise<void> {
    const reviewer = await assertReviewer(accessToken);
    await rejectCard({ id, locale, reason, reviewer: reviewer.email ?? reviewer.id });
}
