'use server';

import type { Locale } from '@/lib/daily/copy/types';
import type { GameCard } from '@/lib/daily/types';
import { assertReviewer } from '@/lib/daily/content/reviewAuth';
import { approveCard, editCard, rejectCard } from '@/lib/daily/content/store';

// Every action re-checks the cookie for itself. A server action is a public
// endpoint — the page having rendered behind a gate says nothing about who is
// calling this a minute later.

export async function approve(id: string, locale: Locale): Promise<void> {
    await assertReviewer();
    await approveCard({ id, locale, reviewer: 'review-screen' });
}

export async function edit(
    id: string, locale: Locale, corrected: GameCard, reason?: string,
): Promise<void> {
    await assertReviewer();
    await editCard({ id, locale, corrected, reason, reviewer: 'review-screen' });
}

export async function reject(id: string, locale: Locale, reason: string): Promise<void> {
    await assertReviewer();
    await rejectCard({ id, locale, reason, reviewer: 'review-screen' });
}
