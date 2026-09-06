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
 */
export async function templateHealth(
    { locale, client = createDailyClient() }: { locale: Locale; client?: SupabaseClient },
): Promise<TemplateHealth[]> {
    const { data: cards, error } = await client
        .from(TABLE).select('card,status,original').eq('locale', locale)
        .neq('status', 'draft')
        .returns<{ card: GameCard; status: CardStatus; original: GameCard | null }[]>();
    if (error) throw new Error(error.message);

    const byKind = new Map<string, TemplateHealth>();
    for (const row of cards ?? []) {
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
