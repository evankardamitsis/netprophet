// lib/daily/generators/score.ts
//
// Three plausible scorelines, one right, revealed by scratching the foil off.

import type { Locale } from '../copy';
import type { GameCard } from '../types';

const COPY = {
    el: {
        kicker: 'Τρεις εκδοχές, μία σωστή',
        question: 'Πώς τελείωσε;',
        explanation: 'Έχασε το πρώτο σετ και γύρισε. <b>4-6, 7-5, 7-6</b>.',
        options: ['2-0 σε 58 λεπτά', '2-1 με τάι μπρέικ', '2-1 με ανατροπή από 0-1'],
    },
    en: {
        kicker: 'Three versions, one correct',
        question: 'How did it finish?',
        explanation: 'He dropped the first set and turned it around. <b>4-6, 7-5, 7-6</b>.',
        options: ['2-0 in 58 minutes', '2-1 on a tiebreak', '2-1 from a set down'],
    },
} as const;

export function generateScoreCards(locale: Locale): GameCard[] {
    const c = COPY[locale];
    return [{
        id: 'score-kifisia-qf',
        kind: 'score',
        kicker: c.kicker,
        question: c.question,
        explanation: c.explanation,
        points: 20,
        reveal: 'scratch',
        scoring: true,
        options: [...c.options],
        correctIndex: 2,
    }];
}
