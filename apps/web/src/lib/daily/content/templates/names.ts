// lib/daily/content/templates/names.ts
//
// Names appear in the nominative and nowhere else. That is the rule that makes
// templated Greek possible at all — "Ποιος κέρδισε στην Κηφισιά;" with the
// players on their own cards needs no declension, whereas "Ποιος νίκησε τον
// Παππά;" needs a case table and a way to know which ending a surname takes.
//
// See content spec §5.1. If a template ever needs an oblique case, that is a
// signal to rewrite the template, not to reach for a declension helper.

import { winRate } from '../facts';
import type { Locale } from '../../copy';
import { displayName } from '../../greek';
import type { PlayerRow } from '../../providers/supabase';
import type { PlayerRef } from '../../types';

/**
 * Names are stored in capitals — ΨΑΡΡΑΣ, ΔΕΣΥΠΡΗΣ — because that is how draws
 * are printed, and printing in caps is exactly when Greek drops its accents.
 *
 * So Greek is left as stored: title-casing it would give "Ψαρρας", which is a
 * misspelling, and the accent it needs was never recorded. Latin has no such
 * problem, so the English side title-cases and reads normally.
 */
function forDisplay(text: string, locale: Locale): string {
    const rendered = displayName(text, locale);
    if (locale === 'el') return rendered;
    return rendered.replace(
        /\p{L}+/gu,
        (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    );
}

/** "Δ. Γεωργίου", transliterated and title-cased for English. */
export function shortName(player: PlayerRow, locale: Locale): string {
    const initial = player.first_name?.trim().charAt(0);
    const full = initial ? `${initial}. ${player.last_name}` : player.last_name;
    return forDisplay(full, locale);
}

/** Just the surname, for prose where the initial adds nothing. */
export function surname(player: PlayerRow, locale: Locale): string {
    return forDisplay(player.last_name, locale);
}

/**
 * A database row as the card shape expects it.
 *
 * `club` is empty on purpose: there is no club column on `players`, and
 * inventing one from the tournament would be wrong. The card falls back to the
 * NTRP line, which is real.
 *
 * `clay` and `hard` are zero for almost everyone for the same kind of reason:
 * 675 of the 679 players with clay matches have `clay_win_rate` sitting at 0,
 * and there are no per-surface win columns to derive a real figure from. Zero
 * here means "not known", and the surface bars must read it that way rather
 * than claiming nobody wins on clay.
 */
export function toPlayerRef(
    player: PlayerRow,
    locale: Locale,
    discipline: 'singles' | 'doubles' = 'singles',
): PlayerRef {
    const form = (discipline === 'doubles' ? player.doubles_last5 : player.last5) ?? [];
    return {
        id: player.id,
        name: shortName(player, locale),
        club: '',
        ntrp: String(player.ntrp_rating ?? ''),
        // Derived, not read — see winRate() for why the stored column is unusable.
        winRate: Math.round((winRate(player, discipline) ?? 0) * 100),
        streak: discipline === 'doubles'
            ? (player.doubles_current_streak ?? 0)
            : (player.current_streak ?? 0),
        clay: Math.round(player.clay_win_rate ?? 0),
        hard: Math.round(player.hard_win_rate ?? 0),
        form: form
            .filter((f): f is string => typeof f === 'string' && f.length > 0)
            .map((f) => (f.toLowerCase() === 'w' ? 'w' : 'l')),
    };
}
