// lib/daily/content/reviewAuth.ts
//
// Server-only. The review token lives in an httpOnly cookie, never in a URL and
// never in a prop.
//
// A token in the query string leaks in more ways than it looks: it lands in
// proxy and platform access logs, in browser history, in a Referer header the
// moment the page grows an external link, and — because the page passes it to a
// client component — in the RSC payload, where any script on the page can read
// it. The cookie is set once by /daily/review/enter and is invisible to
// JavaScript thereafter.

import { cookies } from 'next/headers';
import { timingSafeEqual } from 'node:crypto';

export const REVIEW_COOKIE = 'np_review';

/** Constant-time, so a wrong token cannot be discovered a character at a time. */
export function tokenMatches(candidate: string | undefined): boolean {
    const expected = process.env.DAILY_REVIEW_TOKEN;
    if (!expected || !candidate) return false;
    const a = Buffer.from(candidate);
    const b = Buffer.from(expected);
    // timingSafeEqual throws on a length mismatch, which is itself a signal.
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
}

/** Whether the caller holds a valid review cookie. */
export async function isReviewer(): Promise<boolean> {
    const jar = await cookies();
    return tokenMatches(jar.get(REVIEW_COOKIE)?.value);
}

/**
 * Guard for server actions.
 *
 * A server action is a public endpoint. The page having rendered behind a gate
 * says nothing about who is calling the action afterwards, so every one checks
 * for itself.
 */
export async function assertReviewer(): Promise<void> {
    if (!await isReviewer()) throw new Error('Not a reviewer.');
}
