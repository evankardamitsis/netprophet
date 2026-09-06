'use client';

import { useState, useTransition } from 'react';
import { CopyProvider, type Locale } from '@/lib/daily/copy';
import type { GameCard } from '@/lib/daily/types';
import { ReviewCard, type ReviewAction } from './ReviewCard';
import { approve, edit, reject } from '@/app/(prototype)/daily/review/actions';

export interface ReviewItem {
    id: string;
    card: GameCard;
    fact: {
        id: string; kind: string;
        source: { table: string; ids: string[] };
        validUntil: string | null;
    };
    interest: number;
}

export function ReviewList({
    items, locale, token,
}: {
    items: ReviewItem[];
    locale: Locale;
    token: string;
}) {
    const [pending, startTransition] = useTransition();
    // Settled cards drop out of the queue rather than the page reloading —
    // reviewing is a rhythm and a full refresh between every card breaks it.
    const [done, setDone] = useState<Record<string, string>>({});
    const [failed, setFailed] = useState<Record<string, string>>({});

    const handle = (action: ReviewAction) => {
        startTransition(async () => {
            try {
                if (action.action === 'approve') await approve(token, action.id, locale);
                else if (action.action === 'edit' && action.corrected) {
                    await edit(token, action.id, locale, action.corrected, action.reason);
                } else if (action.action === 'reject' && action.reason) {
                    await reject(token, action.id, locale, action.reason);
                }
                setDone((d) => ({ ...d, [action.id]: action.action }));
            } catch (error) {
                setFailed((f) => ({
                    ...f,
                    [action.id]: error instanceof Error ? error.message : 'failed',
                }));
            }
        });
    };

    const queue = items.filter((item) => !done[item.id]);

    return (
        <CopyProvider locale={locale}>
            <div className="np-rv-list">
                <p className="np-rv-count">
                    {queue.length} to review · {Object.keys(done).length} done
                </p>
                {queue.map((item) => (
                    <div key={item.id}>
                        {failed[item.id] && (
                            <p className="np-rv-error">{failed[item.id]}</p>
                        )}
                        <ReviewCard
                            card={item.card}
                            fact={item.fact}
                            interest={item.interest}
                            busy={pending}
                            onAction={handle}
                        />
                    </div>
                ))}
                {queue.length === 0 && (
                    <p className="np-rv-count">Nothing left in the queue.</p>
                )}
            </div>
        </CopyProvider>
    );
}
