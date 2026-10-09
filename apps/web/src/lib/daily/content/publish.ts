// lib/daily/content/publish.ts
//
// One upload's worth of work: snapshot -> generate -> schedule -> drafts.
//
// The pieces were all here; nothing called them in order, so every run so far
// has been an ad-hoc script. This is the entry point the cron will use after an
// upload, and it writes drafts only — approving stays a human step.

import type { Locale } from '../copy';
import { fetchSnapshot } from '../providers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { generate, type Candidate } from './generate';
import { describeSchedule, scheduleRuns } from './schedule';
import { saveDrafts } from './store';

export interface PublishReport {
    locale: Locale;
    /** candidates the snapshot could support, before scheduling */
    generated: number;
    rejected: number;
    days: { date: string; written: number; cards: number }[];
    schedule: ReturnType<typeof describeSchedule>;
}

export async function publish({
    locale, from, days = 4, size = 8, since, client, now,
}: {
    locale: Locale;
    /** first day of the schedule, ISO date */
    from: string;
    /** days until the next upload */
    days?: number;
    /** cards per run */
    size?: number;
    /** how far back to read matches; defaults to a year */
    since?: string;
    client?: SupabaseClient;
    now?: string;
}): Promise<PublishReport> {
    const lookback = since ?? new Date(Date.parse(`${from}T00:00:00Z`) - 365 * 864e5)
        .toISOString().slice(0, 10);

    const snapshot = await fetchSnapshot({ ...(client ? { client } : {}), since: lookback });
    const run = generate({ snapshot, locale, ...(now ? { now } : {}) });

    const plan = scheduleRuns(run.candidates, { from, days, size });

    // scheduleRuns deals cards; saveDrafts needs the candidate around each one,
    // because the fact and the interest score are what review and audit read.
    const byId = new Map<string, Candidate>(run.candidates.map((c) => [c.card.id, c]));

    const written: PublishReport['days'] = [];
    for (const day of plan) {
        const candidates = day.cards
            .map((card) => byId.get(card.id))
            .filter((c): c is Candidate => Boolean(c));
        const result = await saveDrafts(candidates, {
            locale,
            scheduledFor: day.date,
            ...(client ? { client } : {}),
        });
        written.push({ date: day.date, written: result.written, cards: day.cards.length });
    }

    return {
        locale,
        generated: run.candidates.length,
        rejected: run.rejected.length,
        days: written,
        schedule: describeSchedule(plan),
    };
}
