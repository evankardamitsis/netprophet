// lib/daily/content/reviewAuth.ts
//
// Server-only. Identifies the reviewer as a real admin account rather than
// whoever holds a shared secret.
//
// The web app keeps its Supabase session in localStorage, not cookies, so a
// server component cannot read it. The client therefore hands its access token
// to each server action, which validates the JWT against the auth server and
// then checks `profiles.is_admin`. That is the same bearer-token shape an
// Authorization header has, sent to its own origin.
//
// This is the one place the Daily Run touches the app's auth. The *game* —
// everything in lib/daily reachable from a card — stays isolated so it can
// still be deleted in one commit. The *review tool* is internal, never ships to
// a player, and having real identities on corrections is worth more than
// keeping it pure.

import { createClient } from '@supabase/supabase-js';
import { createDailyClient } from '../providers/supabase';

export interface Reviewer {
    id: string;
    email: string | null;
}

/** Validates the JWT, then confirms the account is an admin. */
export async function verifyReviewer(accessToken: string | undefined): Promise<Reviewer | null> {
    if (!accessToken) return null;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return null;

    // Anon client: getUser(jwt) asks the auth server whether this token is
    // real and unexpired. Never trust a decoded JWT without that round trip.
    const auth = createClient(url, anon, { auth: { persistSession: false } });
    const { data, error } = await auth.auth.getUser(accessToken);
    if (error || !data.user) return null;

    // Service role for the lookup: a user cannot be allowed to answer the
    // question of whether they are an admin.
    const db = createDailyClient();
    const { data: profile } = await db
        .from('profiles').select('is_admin').eq('id', data.user.id).single();

    if (!profile?.is_admin) return null;
    return { id: data.user.id, email: data.user.email ?? null };
}

/**
 * Guard for server actions.
 *
 * A server action is a public endpoint. Every one authenticates for itself —
 * the page having rendered says nothing about who is calling a minute later.
 */
export async function assertReviewer(accessToken: string | undefined): Promise<Reviewer> {
    const reviewer = await verifyReviewer(accessToken);
    if (!reviewer) throw new Error('Admin access required.');
    return reviewer;
}
