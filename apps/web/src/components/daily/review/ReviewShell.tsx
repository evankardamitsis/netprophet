'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@netprophet/lib';
import { CopyProvider } from '@/lib/daily/copy';
import type { Locale } from '@/lib/daily/copy/types';
import type { CardStatus } from '@/lib/daily/content/store';
import { loadQueue, type Queue } from '@/app/(prototype)/daily/review/actions';
import { ReviewList } from './ReviewList';

// Reads the session the app already holds, hands the access token to the
// server, and renders whatever comes back. An account that is not an admin gets
// the same nothing an anonymous one does.

type State =
    | { phase: 'loading' }
    | { phase: 'anonymous' }
    | { phase: 'denied'; message: string }
    | { phase: 'ready'; queue: Queue; token: string };

export function ReviewShell() {
    const [locale, setLocale] = useState<Locale>('el');
    const [status, setStatus] = useState<CardStatus>('draft');
    const [state, setState] = useState<State>({ phase: 'loading' });

    const load = useCallback(async () => {
        setState({ phase: 'loading' });
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
            setState({ phase: 'anonymous' });
            return;
        }
        try {
            const queue = await loadQueue(token, locale, status);
            setState({ phase: 'ready', queue, token });
        } catch (error) {
            setState({
                phase: 'denied',
                message: error instanceof Error ? error.message : 'Could not load the queue.',
            });
        }
    }, [locale, status]);

    useEffect(() => { void load(); }, [load]);

    return (
        <main className="np-scroll np-rv-page">
            <header className="np-hub-head">
                <h1 className="np-h1">Review</h1>
                <span className="np-meta">
                    {state.phase === 'ready' ? state.queue.reviewer : status} · {locale}
                </span>
            </header>

            <nav className="np-rv-nav">
                <button type="button" onClick={() => setLocale(locale === 'el' ? 'en' : 'el')}>
                    {locale === 'el' ? 'Switch to English' : 'Στα ελληνικά'}
                </button>
                {(['draft', 'approved', 'rejected'] as CardStatus[]).map((s) => (
                    <button
                        key={s} type="button"
                        className={s === status ? 'is-on' : undefined}
                        onClick={() => setStatus(s)}
                    >
                        {s}
                    </button>
                ))}
            </nav>

            {state.phase === 'loading' && <p className="np-rv-count">Loading…</p>}

            {state.phase === 'anonymous' && (
                <p className="np-rv-error">
                    Sign in with an admin account to review.{' '}
                    <Link href="/el/auth/signin">Sign in</Link>
                </p>
            )}

            {state.phase === 'denied' && (
                <p className="np-rv-error">
                    {state.message} This screen needs an account with{' '}
                    <code>profiles.is_admin</code>.
                </p>
            )}

            {state.phase === 'ready' && (
                <>
                    {state.queue.health.length > 0 && (
                        <div className="np-rv-health">
                            {state.queue.health.map((h) => (
                                <span
                                    key={h.kind}
                                    className={h.editRate === 0 ? 'is-clean' : undefined}
                                >
                                    {h.kind} {Math.round(h.editRate * 100)}% edited
                                    <small> ({h.approved + h.edited + h.rejected})</small>
                                </span>
                            ))}
                        </div>
                    )}
                    <CopyProvider locale={locale}>
                        <ReviewList
                            items={state.queue.items}
                            locale={locale}
                            token={state.token}
                        />
                    </CopyProvider>
                </>
            )}
        </main>
    );
}
