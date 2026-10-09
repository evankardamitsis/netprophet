// lib/daily/content/store.ts
//
// Reads and writes `daily_cards` and `daily_card_edits`. Server-only: both
// tables are locked to the service role, and nothing here is reachable from a
// browser.
//
// A card is written once at generation and then only ever reviewed. Approving
// does not recompute it — the answer and the numbers behind it are pinned, so a
// card cannot change its mind when a player's record moves.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Locale } from '../copy';
import type { GameCard } from '../types';
import { createDailyClient } from '../providers/supabase';
import type { Candidate } from './generate';
import type { Fact } from './facts';

export type CardStatus = 'draft' | 'approved' | 'rejected';

export interface StoredCard {
    id: string;
    locale: Locale;
    scheduled_for: string | null;
    status: CardStatus;
    card: GameCard;
    fact: Fact;
    interest: number;
    generated_at: string;
    valid_until: string | null;
    reviewed_at: string | null;
    reviewed_by: string | null;
    reject_reason: string | null;
    original: GameCard | null;
}

const TABLE = 'daily_cards';
const EDITS = 'daily_card_edits';

/** Write a generation run as drafts. Re-running a generation is idempotent. */
export async function saveDrafts(
    candidates: Candidate[],
    { locale, scheduledFor, client = createDailyClient() }: {
        locale: Locale;
        /** ISO date, or null to leave unscheduled */
        scheduledFor?: string | null;
        client?: SupabaseClient;
    },
): Promise<{ written: number }> {
    if (candidates.length === 0) return { written: 0 };

    const rows = candidates.map(({ card, fact, interest }) => ({
        id: card.id,
        locale,
        scheduled_for: scheduledFor ?? null,
        status: 'draft' as const,
        card,
        fact,
        interest,
        generated_at: fact.computedAt,
        valid_until: fact.validUntil,
    }));

    // A card already reviewed must not be reset to draft by a later run, so
    // only untouched rows are overwritten.
    const { data: reviewed } = await client
        .from(TABLE)
        .select('id')
        .eq('locale', locale)
        .neq('status', 'draft')
        .in('id', rows.map((r) => r.id));

    const locked = new Set((reviewed ?? []).map((r: { id: string }) => r.id));
    const fresh = rows.filter((r) => !locked.has(r.id));
    if (fresh.length === 0) return { written: 0 };

    const { error } = await client.from(TABLE).upsert(fresh, { onConflict: 'id,locale' });
    if (error) throw new Error(error.message);
    return { written: fresh.length };
}

export async function listCards(
    { locale, status, scheduledFor, limit = 50, client = createDailyClient() }: {
        locale: Locale;
        status?: CardStatus;
        scheduledFor?: string;
        limit?: number;
        client?: SupabaseClient;
    },
): Promise<StoredCard[]> {
    let query = client.from(TABLE).select('*').eq('locale', locale);
    if (status) query = query.eq('status', status);
    if (scheduledFor) query = query.eq('scheduled_for', scheduledFor);

    const { data, error } = await query
        .order('interest', { ascending: false })
        .limit(limit)
        .returns<StoredCard[]>();
    if (error) throw new Error(error.message);
    return data ?? [];
}

/** Approve as generated. */
export async function approveCard(
    { id, locale, reviewer, client = createDailyClient() }: {
        id: string; locale: Locale; reviewer: string; client?: SupabaseClient;
    },
): Promise<void> {
    const { error } = await client.from(TABLE).update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewer,
    }).eq('id', id).eq('locale', locale);
    if (error) throw new Error(error.message);
}

/**
 * Approve with changes, and record what changed.
 *
 * The correction is the valuable half: `(fact, generated, corrected, reason)` is
 * what the next generation run learns from, and the per-template edit rate is
 * what eventually earns a template the right to skip review.
 */
export async function editCard(
    { id, locale, corrected, reason, reviewer, client = createDailyClient() }: {
        id: string; locale: Locale; corrected: GameCard;
        reason?: string; reviewer: string; client?: SupabaseClient;
    },
): Promise<void> {
    const { data: existing, error: readError } = await client
        .from(TABLE).select('card,fact,original')
        .eq('id', id).eq('locale', locale).single();
    if (readError) throw new Error(readError.message);

    // Keep the first generated version, not the previous edit — the corpus
    // wants to know what the model produced, not what a reviewer typed twice.
    const original = existing.original ?? existing.card;

    const { error } = await client.from(TABLE).update({
        status: 'approved',
        card: corrected,
        original,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewer,
    }).eq('id', id).eq('locale', locale);
    if (error) throw new Error(error.message);

    const { error: editError } = await client.from(EDITS).insert({
        card_id: id,
        locale,
        card_kind: corrected.kind,
        fact: existing.fact,
        generated: original,
        corrected,
        reason: reason ?? null,
    });
    if (editError) throw new Error(editError.message);
}

export async function rejectCard(
    { id, locale, reason, reviewer, client = createDailyClient() }: {
        id: string; locale: Locale; reason: string; reviewer: string;
        client?: SupabaseClient;
    },
): Promise<void> {
    const { data: existing } = await client
        .from(TABLE).select('card,fact').eq('id', id).eq('locale', locale).single();

    const { error } = await client.from(TABLE).update({
        status: 'rejected',
        reject_reason: reason,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewer,
    }).eq('id', id).eq('locale', locale);
    if (error) throw new Error(error.message);

    // A rejection is a correction too — it says this fact should not have
    // produced a card at all, which is exactly what the rules file needs.
    if (existing) {
        await client.from(EDITS).insert({
            card_id: id,
            locale,
            card_kind: (existing.card as GameCard).kind,
            fact: existing.fact,
            generated: existing.card,
            corrected: null,
            reason,
        });
    }
}

/**
 * Retire cards that were built on something since found to be wrong.
 *
 * Distinct from `rejectCard` in two ways that both matter. It writes no
 * `daily_card_edits` row, because "this fact should not have produced a card"
 * is the wrong lesson when the template was fine and the *input column* was
 * poisoned — teaching the corpus that would suppress good cards later. And it
 * leaves `reviewed_by` null, which is what `templateHealth` reads to tell a
 * person's judgement apart from a bulk retirement.
 *
 * The row stays, with its reason, so the audit trail survives.
 */
export async function retireCards(
    { ids, locale, reason, client = createDailyClient() }: {
        ids: string[]; locale: Locale; reason: string; client?: SupabaseClient;
    },
): Promise<{ retired: number }> {
    if (ids.length === 0) return { retired: 0 };
    const { data, error } = await client.from(TABLE).update({
        status: 'rejected',
        reject_reason: reason,
        reviewed_at: new Date().toISOString(),
        reviewed_by: null,
    }).in('id', ids).eq('locale', locale).select('id');
    if (error) throw new Error(error.message);
    return { retired: (data ?? []).length };
}

/**
 * The approved cards for a day, best first.
 *
 * Serving reads only what a person has approved. A draft has never been looked
 * at by anyone, and the whole point of the review step is that nothing reaches
 * a player unseen.
 */
export async function approvedForDay(
    { locale, date, seenCardIds = [], limit = 12, client = createDailyClient() }: {
        locale: Locale;
        /** ISO date */
        date: string;
        seenCardIds?: string[];
        limit?: number;
        client?: SupabaseClient;
    },
): Promise<GameCard[]> {
    const { data, error } = await client
        .from(TABLE)
        .select('id,card,valid_until,interest')
        .eq('locale', locale)
        .eq('status', 'approved')
        .eq('scheduled_for', date)
        .order('interest', { ascending: false })
        .limit(limit)
        .returns<{ id: string; card: GameCard; valid_until: string | null }[]>();
    if (error) throw new Error(error.message);

    const seen = new Set(seenCardIds);
    const now = Date.now();

    return (data ?? [])
        .filter((row) => !seen.has(row.id))
        // A card built on live standings can go stale between approval and
        // play. Expired is not "probably still fine".
        .filter((row) => !row.valid_until || Date.parse(row.valid_until) > now)
        .map((row) => row.card);
}

export interface TemplateHealth {
    kind: string;
    approved: number;
    edited: number;
    rejected: number;
    /** share of reviewed cards that needed a change, 0..1 */
    editRate: number;
}

/**
 * How much each template is still being corrected.
 *
 * This is the autonomy gate: a template whose cards go run after run without a
 * change has earned the right to publish unreviewed, and the reviewer's job
 * narrows to the templates that have not. Without a number, "eventually it does
 * it on its own" stays a hope.
 *
 * Only a *person's* rejection counts. Cards retired in bulk — the eight `order`
 * cards built on `players.win_rate` before that column was found to disagree
 * with `wins`/`losses` — carry no reviewer, and counting them would charge the
 * template for a poisoned input and hold back its autonomy for something it did
 * not do.
 */
export async function templateHealth(
    { locale, client = createDailyClient() }: { locale: Locale; client?: SupabaseClient },
): Promise<TemplateHealth[]> {
    const { data: cards, error } = await client
        .from(TABLE).select('card,status,original,reviewed_by').eq('locale', locale)
        .neq('status', 'draft')
        .returns<{
            card: GameCard; status: CardStatus;
            original: GameCard | null; reviewed_by: string | null;
        }[]>();
    if (error) throw new Error(error.message);

    const byKind = new Map<string, TemplateHealth>();
    for (const row of cards ?? []) {
        if (row.status === 'rejected' && !row.reviewed_by) continue;
        const kind = row.card.kind;
        const entry = byKind.get(kind)
            ?? { kind, approved: 0, edited: 0, rejected: 0, editRate: 0 };
        if (row.status === 'rejected') entry.rejected += 1;
        else if (row.original) entry.edited += 1;
        else entry.approved += 1;
        byKind.set(kind, entry);
    }

    return [...byKind.values()].map((entry) => {
        const reviewed = entry.approved + entry.edited + entry.rejected;
        return {
            ...entry,
            editRate: reviewed === 0 ? 0 : (entry.edited + entry.rejected) / reviewed,
        };
    }).sort((x, y) => y.editRate - x.editRate);
}
