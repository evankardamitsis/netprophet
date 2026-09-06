// lib/daily/content/templates/rounds.ts
//
// Singular, because a card is about one match. The old design system had these
// as plurals for a table header — "Ημιτελικοί" reads wrong on a card about a
// single semi-final.

import type { Locale } from '../../copy';

const ROUNDS: Record<Locale, Record<string, string>> = {
    el: {
        'Finals': 'Τελικός',
        'Semifinals': 'Ημιτελικός',
        'Quarterfinals': 'Προημιτελικός',
        'Round of 16': 'Φάση των 16',
        'Round of 32': 'Φάση των 32',
        'Round of 64': 'Φάση των 64',
    },
    en: {
        'Finals': 'Final',
        'Semifinals': 'Semi-final',
        'Quarterfinals': 'Quarter-final',
        'Round of 16': 'Last 16',
        'Round of 32': 'Last 32',
        'Round of 64': 'Last 64',
    },
};

export function roundName(round: string | null, locale: Locale): string | null {
    if (!round) return null;
    return ROUNDS[locale][round] ?? null;
}

/**
 * When a match was played, without ever saying "χθες".
 *
 * Results arrive twice a week, so a match can be five days old — same-day
 * framing is wrong more often than it is right (content spec §2.1c). Within the
 * week the weekday is both honest and specific; beyond it, the date.
 */
export function playedWhen(playedAt: string | null, now: string, locale: Locale): string | null {
    if (!playedAt) return null;
    const then = new Date(playedAt);
    if (Number.isNaN(then.getTime())) return null;

    const days = Math.floor((Date.parse(now) - then.getTime()) / 864e5);
    const tag = locale === 'el' ? 'el-GR' : 'en-GB';

    if (days >= 0 && days <= 6) {
        return then.toLocaleDateString(tag, { weekday: 'long' });
    }
    return then.toLocaleDateString(tag, { day: 'numeric', month: 'long' });
}
