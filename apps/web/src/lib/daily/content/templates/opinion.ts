// lib/daily/content/templates/opinion.ts
//
// Cards with no right answer: a vote and a matter of taste. They always pay,
// never touch the combo, and never go stale the way a prediction does — which
// is what makes them the shock absorber for a thin week (content spec §3.1).
//
// The crowd split is left empty. It fills from the run's own answers and is
// only shown once enough have come in (§4.1); an invented percentage costs the
// feature's credibility the first time someone checks it.

import type { Locale } from '../../copy';
import type { Snapshot } from '../../providers/supabase';
import type { GameCard } from '../../types';
import type { AwardValue, ContrastValue, Fact } from '../facts';
import { shortName } from './names';

const GRADIENTS = [
    'linear-gradient(150deg,#5A3320,#1A0E08)',
    'linear-gradient(150deg,#2E4A63,#0E1A24)',
];

const AWARD = {
    el: {
        kicker: 'Η ψηφοφορία κλείνει την Κυριακή',
        question: 'Παίκτης της περιόδου;',
        explanation: 'Οι ψήφοι μετράνε μέχρι την Κυριακή. Δες πού πάει η σκηνή.',
    },
    en: {
        kicker: 'Voting closes on Sunday',
        question: 'Player of the period?',
        explanation: 'Votes count until Sunday. See where the scene lands.',
    },
} as const;

export function renderAward(
    fact: Fact<AwardValue>, snapshot: Snapshot, locale: Locale,
): GameCard | null {
    const players = fact.value.playerIds
        .map((id) => snapshot.players.get(id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p));
    if (players.length !== fact.value.playerIds.length) return null;

    const copy = AWARD[locale];
    return {
        id: fact.id,
        kind: 'award',
        kicker: copy.kicker,
        question: copy.question,
        points: 5,
        reveal: 'instant',
        explanation: copy.explanation,
        // A vote is not a prediction: it cannot be wrong, so it does not score.
        scoring: false,
        options: players.map((p) => shortName(p, locale)),
        crowdSplit: players.map(() => 0),
    };
}

const CONTRAST = {
    el: {
        kicker: 'Καθαρά θέμα γούστου',
        question: 'Ποιον θες στο πλευρό σου σε τρίτο σετ;',
        form: 'Η φόρμα',
        record: 'Το ρεκόρ',
        formSub: (who: string, streak: number) => `${who} · ${streak} σερί νίκες`,
        recordSub: (who: string, rate: number) => `${who} · ${rate}% νίκες`,
        explanation: 'Δεν υπάρχει σωστή απάντηση εδώ. Μόνο η δική σου.',
    },
    en: {
        kicker: 'Purely a matter of taste',
        question: 'Who do you want beside you in a third set?',
        form: 'The form',
        record: 'The record',
        formSub: (who: string, streak: number) => `${who} · ${streak} in a row`,
        recordSub: (who: string, rate: number) => `${who} · ${rate}% wins`,
        explanation: 'There is no right answer here. Only yours.',
    },
} as const;

export function renderContrast(
    fact: Fact<ContrastValue>, snapshot: Snapshot, locale: Locale,
): GameCard | null {
    const form = snapshot.players.get(fact.value.formId);
    const record = snapshot.players.get(fact.value.recordId);
    if (!form || !record) return null;

    const copy = CONTRAST[locale];
    return {
        id: fact.id,
        kind: 'thisThat',
        kicker: copy.kicker,
        question: copy.question,
        points: 5,
        reveal: 'instant',
        explanation: copy.explanation,
        scoring: false,
        options: [
            {
                title: copy.form,
                sub: copy.formSub(shortName(form, locale), fact.value.streak),
                gradient: GRADIENTS[0],
            },
            {
                title: copy.record,
                sub: copy.recordSub(shortName(record, locale), fact.value.winRate),
                gradient: GRADIENTS[1],
            },
        ],
        crowdSplit: [0, 0],
    };
}
