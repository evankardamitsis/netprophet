// lib/daily/content/templates/result.ts
//
// "Ποιος κέρδισε;" — the sides are on their own cards, so the question names
// nobody and needs no declension. The explanation names the winner in the
// nominative and nowhere else.

import type { Locale } from '../../copy';
import type { Fact, ResultValue } from '../facts';
import { formatScoreline } from '../distractors';
import type { Snapshot } from '../../providers/supabase';
import type { GameCard, SideRef } from '../../types';
import { shortName, surname, toPlayerRef } from './names';
import { playedWhen, roundName } from './rounds';

// The tournament lives in the kicker, never in the question. "στο TAF Open"
// guesses at the name's gender, and Greek articles have to agree — see content
// spec §5.1. A question with no preposition cannot get it wrong.
const COPY = {
    el: {
        question: 'Ποιος κέρδισε;',
        questionPair: 'Ποιο ζευγάρι κέρδισε;',
        straight: 'Χωρίς να χάσει σετ.',
        decider: 'Κρίθηκε στο σούπερ τάι μπρέικ.',
        comeback: 'Γύρισε το ματς.',
    },
    en: {
        question: 'Who won?',
        questionPair: 'Which pair won?',
        straight: 'Without dropping a set.',
        decider: 'Decided on the champions tiebreak.',
        comeback: 'Turned the match around.',
    },
} as const;

/** "Προημιτελικός · TAF Open · Κυριακή", or whichever parts exist. */
export function kickerFor(value: ResultValue, locale: Locale, now: string): string {
    return [
        roundName(value.round, locale),
        value.tournament,
        playedWhen(value.playedAt, now, locale),
    ].filter(Boolean).join(' · ');
}

function sideFrom(
    side: { id: string; playerIds: string[] },
    snapshot: Snapshot,
    locale: Locale,
    discipline: 'singles' | 'doubles',
): SideRef | null {
    const players = side.playerIds
        .map((id) => snapshot.players.get(id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map((p) => toPlayerRef(p, locale, discipline));
    if (players.length !== side.playerIds.length) return null;
    return { id: side.id, players };
}

export function renderResult(
    fact: Fact<ResultValue>, snapshot: Snapshot, locale: Locale, now: string,
): GameCard | null {
    const value = fact.value;
    const discipline = value.a.playerIds.length > 1 ? 'doubles' : 'singles';
    const a = sideFrom(value.a, snapshot, locale, discipline);
    const b = sideFrom(value.b, snapshot, locale, discipline);
    if (!a || !b) return null;

    const copy = COPY[locale];
    const winning = value.winner === 'a' ? value.a : value.b;
    const winnerNames = winning.playerIds
        .map((id) => snapshot.players.get(id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map((p) => (discipline === 'doubles' ? surname(p, locale) : shortName(p, locale)));
    if (winnerNames.length === 0) return null;

    const scoreline = formatScoreline(value.sets, value.superTiebreak);
    const colour = value.superTiebreak ? copy.decider
        : value.matchResult.startsWith('2-0') || value.matchResult.startsWith('0-2')
            ? copy.straight
            : copy.comeback;

    // The winner is named in the nominative. Nothing else names anyone.
    const explanation = `<b>${winnerNames.join(' / ')}</b> ${scoreline}. ${colour}`;

    const question = discipline === 'doubles' ? copy.questionPair : copy.question;

    return {
        id: `result:${value.matchId}`,
        kind: 'result',
        kicker: kickerFor(value, locale, now),
        question,
        points: 10,
        reveal: 'instant',
        explanation,
        scoring: true,
        a,
        b,
        correctId: value.winner === 'a' ? a.id : b.id,
        // Real crowd splits need answers, and there are none yet — content
        // spec §4.1. Until the threshold is met, the reveal shows no split.
        crowdSplit: [0, 0],
    };
}
