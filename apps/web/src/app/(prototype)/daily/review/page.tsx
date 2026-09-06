import { notFound } from 'next/navigation';
import { ReviewList, type ReviewItem } from '@/components/daily/review/ReviewList';
// From copy/types, not copy/index — the latter is a client module, and a
// server component cannot call a function that lives on the client.
import { isLocale, type Locale } from '@/lib/daily/copy/types';
import { isReviewer } from '@/lib/daily/content/reviewAuth';
import { listCards, templateHealth } from '@/lib/daily/content/store';

// The daily check-in. Shows the cards a generation run produced, rendered as a
// player will see them, with the fact and its provenance beside each.
//
// Gated on a shared token held in an httpOnly cookie, set once by
// /daily/review/enter?token=… — see reviewAuth.ts for why the token does not
// live in the URL. Not the app's auth, because the prototype has no accounts by
// design and this tool must not depend on the app it is meant to stay isolated
// from. Same shared-secret pattern as CRON_SECRET.

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Daily Run — review',
    robots: { index: false, follow: false },
};

interface Search {
    locale?: string;
    date?: string;
    status?: string;
}

export default async function ReviewPage({
    searchParams,
}: {
    searchParams: Promise<Search>;
}) {
    const params = await searchParams;

    // No cookie is a 404, not a 403 — an unlinked tool should not confirm it
    // exists to someone guessing.
    if (!await isReviewer()) notFound();

    const locale: Locale = isLocale(params.locale) ? params.locale : 'el';
    const status = params.status === 'approved' || params.status === 'rejected'
        ? params.status
        : 'draft';

    let items: ReviewItem[] = [];
    let health: Awaited<ReturnType<typeof templateHealth>> = [];
    let failure: string | null = null;

    try {
        const [cards, templates] = await Promise.all([
            listCards({ locale, status, scheduledFor: params.date, limit: 40 }),
            templateHealth({ locale }),
        ]);
        items = cards.map((row) => ({
            id: row.id,
            card: row.card,
            fact: {
                id: row.fact?.id ?? row.id,
                kind: row.fact?.kind ?? row.card.kind,
                source: row.fact?.source ?? { table: 'unknown', ids: [] },
                validUntil: row.valid_until,
            },
            interest: row.interest,
        }));
        health = templates;
    } catch (error) {
        // The table may not exist yet. Say so plainly rather than a stack trace.
        failure = error instanceof Error ? error.message : 'Could not read daily_cards.';
    }

    const link = (over: Partial<Search>) => {
        const next = new URLSearchParams({ locale, status, ...over } as Record<string, string>);
        return `?${next.toString()}`;
    };

    return (
        <main className="np-scroll np-rv-page">
            <header className="np-hub-head">
                <h1 className="np-h1">Review</h1>
                <span className="np-meta">{status} · {locale}</span>
            </header>

            <nav className="np-rv-nav">
                <a href={link({ locale: locale === 'el' ? 'en' : 'el' })}>
                    {locale === 'el' ? 'Switch to English' : 'Στα ελληνικά'}
                </a>
                <a href={link({ status: 'draft' })}>Drafts</a>
                <a href={link({ status: 'approved' })}>Approved</a>
                <a href={link({ status: 'rejected' })}>Rejected</a>
            </nav>

            {/* The autonomy gate: a template that stops being corrected has
                earned the right to publish unreviewed. */}
            {health.length > 0 && (
                <div className="np-rv-health">
                    {health.map((h) => (
                        <span key={h.kind} className={h.editRate === 0 ? 'is-clean' : undefined}>
                            {h.kind} {Math.round(h.editRate * 100)}% edited
                            <small> ({h.approved + h.edited + h.rejected})</small>
                        </span>
                    ))}
                </div>
            )}

            {failure && (
                <p className="np-rv-error">
                    {failure} — has <code>20260906090000_create_daily_cards.sql</code> been applied?
                </p>
            )}

            {!failure && items.length === 0 && (
                <p className="np-rv-count">
                    No {status} cards. Run a generation to fill the queue.
                </p>
            )}

            {items.length > 0 && (
                <ReviewList items={items} locale={locale} />
            )}
        </main>
    );
}
