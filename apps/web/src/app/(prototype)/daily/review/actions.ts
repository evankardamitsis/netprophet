'use server';

import type { Locale } from '@/lib/daily/copy';
import type { GameCard } from '@/lib/daily/types';
import { approveCard, editCard, rejectCard } from '@/lib/daily/content/store';

// Server actions for the review screen. Every one re-checks the token: a server
// action is a public endpoint, and the page having been rendered behind a gate
// says nothing about who is calling this.

function assertReviewer(token: string): void {
    const expected = process.env.DAILY_REVIEW_TOKEN;
    if (!expected || token !== expected) throw new Error('Not a reviewer.');
}

export async function approve(token: string, id: string, locale: Locale): Promise<void> {
    assertReviewer(token);
    await approveCard({ id, locale, reviewer: 'review-screen' });
}

export async function edit(
    token: string, id: string, locale: Locale, corrected: GameCard, reason?: string,
): Promise<void> {
    assertReviewer(token);
    await editCard({ id, locale, corrected, reason, reviewer: 'review-screen' });
}

export async function reject(
    token: string, id: string, locale: Locale, reason: string,
): Promise<void> {
    assertReviewer(token);
    await rejectCard({ id, locale, reason, reviewer: 'review-screen' });
}
