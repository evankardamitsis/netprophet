// lib/daily/content/templates/score.ts
//
// "Πώς τελείωσε;" — three scorelines, one real. The distractors are
// perturbations of the truth, so they are the same shape and give nothing away.

import type { Locale } from '../../copy';
import { formatScoreline, placeAnswer, scoreDistractors } from '../distractors';
import type { Fact, ResultValue } from '../facts';
import type { Snapshot } from '../../providers/supabase';
import type { GameCard } from '../../types';
import { surname } from './names';
import { kickerFor } from './result';

// A doubles pair is plural: "Οι ΔΗΜΑΣ / ΜΑΓΓΙΝΑΣ το πήραν", not "Ο ... το πήρε".
// The article and the verb both have to move, which is why each line comes in
// two forms rather than being assembled from parts.
const COPY = {
    el: {
        question: 'Πώς τελείωσε;',
        lede: 'Τρεις εκδοχές, μία σωστή.',
        decider: {
            one: (who: string) => `Ο <b>${who}</b> το πήρε στο σούπερ τάι μπρέικ.`,
            many: (who: string) => `Οι <b>${who}</b> το πήραν στο σούπερ τάι μπρέικ.`,
        },
        straight: {
            one: (who: string) => `Ο <b>${who}</b> δεν έχασε σετ.`,
            many: (who: string) => `Οι <b>${who}</b> δεν έχασαν σετ.`,
        },
        comeback: {
            one: (who: string) => `Ο <b>${who}</b> γύρισε το ματς.`,
            many: (who: string) => `Οι <b>${who}</b> γύρισαν το ματς.`,
        },
    },
    en: {
        question: 'How did it finish?',
        lede: 'Three versions, one correct.',
        decider: {
            one: (who: string) => `<b>${who}</b> took it on the champions tiebreak.`,
            many: (who: string) => `<b>${who}</b> took it on the champions tiebreak.`,
        },
        straight: {
            one: (who: string) => `<b>${who}</b> did not drop a set.`,
            many: (who: string) => `<b>${who}</b> did not drop a set.`,
        },
        comeback: {
            one: (who: string) => `<b>${who}</b> turned it around.`,
            many: (who: string) => `<b>${who}</b> turned it around.`,
        },
    },
} as const;

export function renderScore(
    fact: Fact<ResultValue>, snapshot: Snapshot, locale: Locale, now: string,
): GameCard | null {
    const value = fact.value;
    if (value.sets.length < 2) return null;

    const answer = formatScoreline(value.sets, value.superTiebreak);
    const distractors = scoreDistractors({
        sets: value.sets, superTiebreak: value.superTiebreak, matchId: value.matchId,
    });
    // Two plausible wrong answers or it is not a question.
    if (distractors.length < 2) return null;

    const { options, correctIndex } = placeAnswer(answer, distractors, value.matchId);

    const winning = value.winner === 'a' ? value.a : value.b;
    const names = winning.playerIds
        .map((id) => snapshot.players.get(id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map((p) => surname(p, locale));
    if (names.length === 0) return null;

    const copy = COPY[locale];
    const who = names.join(' / ');
    const number = names.length > 1 ? 'many' : 'one';
    const line = value.superTiebreak ? copy.decider
        : value.matchResult.startsWith('2-0') || value.matchResult.startsWith('0-2')
            ? copy.straight
            : copy.comeback;
    const explanation = line[number](who);

    return {
        id: `score:${value.matchId}`,
        kind: 'score',
        kicker: kickerFor(value, locale, now),
        question: copy.question,
        lede: copy.lede,
        points: 20,
        // The reveal is worth scratching for.
        reveal: 'scratch',
        explanation,
        scoring: true,
        options,
        correctIndex,
    };
}
