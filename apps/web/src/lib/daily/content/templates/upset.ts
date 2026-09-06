// lib/daily/content/templates/upset.ts
//
// "Ποια ήταν η έκπληξη;" — three results from the same period, one of which the
// model did not see coming. Reads as rows rather than player cards, which is
// also how it earns its place in a run: a different answer shape.

import type { Locale } from '../../copy';
import type { Snapshot } from '../../providers/supabase';
import type { GameCard } from '../../types';
import { formatScoreline } from '../distractors';
import type { Fact, ResultValue } from '../facts';
import { surname } from './names';
import { playedWhen, roundName } from './rounds';

const COPY = {
    el: {
        kicker: 'Τρία αποτελέσματα, μία ανατροπή',
        question: 'Ποια ήταν η έκπληξη;',
        explanation: (who: string, many: boolean) =>
            many
                ? `Οι <b>${who}</b> έριξαν το φαβορί.`
                : `Ο <b>${who}</b> έριξε το φαβορί.`,
    },
    en: {
        kicker: 'Three results, one upset',
        question: 'Which one was the surprise?',
        explanation: (who: string) => `<b>${who}</b> took down the favourite.`,
    },
} as const;

/** "ΨΑΡΡΑΣ – ΑΛΕΞΟΠΟΥΛΟΣ", both sides in the nominative. */
function rowLabel(value: ResultValue, snapshot: Snapshot, locale: Locale): string | null {
    const names = (ids: string[]) => ids
        .map((id) => snapshot.players.get(id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map((p) => surname(p, locale));
    const a = names(value.a.playerIds);
    const b = names(value.b.playerIds);
    if (!a.length || !b.length) return null;
    return `${a.join(' / ')} – ${b.join(' / ')}`;
}

/**
 * Takes the upset plus two ordinary results as its distractors — real matches,
 * not invented ones, so nothing about the rows gives the answer away.
 */
export function renderUpset(
    upset: Fact<ResultValue>,
    ordinary: Fact<ResultValue>[],
    snapshot: Snapshot,
    locale: Locale,
    now: string,
): GameCard | null {
    const involved = new Set(upset.subjects);
    const when = upset.value.playedAt ? Date.parse(upset.value.playedAt) : 0;

    const others = ordinary
        .filter((f) => f.value.matchId !== upset.value.matchId)
        // A player who appears in the answer and again in a distractor makes
        // the card read like a trick. Keep the three matches disjoint.
        .filter((f) => !f.subjects.some((id) => involved.has(id)))
        // "6-1" on its own is an abandoned match, not a result to compare.
        .filter((f) => f.value.sets.length >= 2)
        // Three results from the same week read as one round; three from three
        // months apart read as a list.
        .sort((x, y) => {
            const dx = Math.abs((x.value.playedAt ? Date.parse(x.value.playedAt) : 0) - when);
            const dy = Math.abs((y.value.playedAt ? Date.parse(y.value.playedAt) : 0) - when);
            return dx - dy;
        })
        .slice(0, 2);
    if (others.length < 2) return null;
    if (upset.value.sets.length < 2) return null;

    const facts = [upset, ...others];
    const rows = facts.map((f) => {
        const label = rowLabel(f.value, snapshot, locale);
        return label
            ? { label, right: formatScoreline(f.value.sets, f.value.superTiebreak) }
            : null;
    });
    if (rows.some((r) => !r)) return null;

    // Put the upset somewhere other than first, deterministically.
    const at = Math.abs(
        [...upset.value.matchId].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7),
    ) % rows.length;
    const ordered = rows.filter(Boolean) as { label: string; right: string }[];
    const [answer] = ordered.splice(0, 1);
    ordered.splice(at, 0, answer);

    const winning = upset.value.winner === 'a' ? upset.value.a : upset.value.b;
    const names = winning.playerIds
        .map((id) => snapshot.players.get(id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map((p) => surname(p, locale));
    if (!names.length) return null;

    const copy = COPY[locale];
    const explanation = locale === 'el'
        ? COPY.el.explanation(names.join(' / '), names.length > 1)
        : COPY.en.explanation(names.join(' / '));

    return {
        id: `upset:${upset.value.matchId}`,
        kind: 'upset',
        kicker: [copy.kicker, playedWhen(upset.value.playedAt, now, locale)]
            .filter(Boolean).join(' · '),
        question: copy.question,
        lede: roundName(upset.value.round, locale) ?? undefined,
        points: 15,
        reveal: 'instant',
        explanation,
        scoring: true,
        rows: ordered,
        correctIndex: at,
    };
}
