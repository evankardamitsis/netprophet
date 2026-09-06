// lib/daily/generators/score.ts
//
// Three plausible scorelines, one right, revealed by scratching the foil off.

import type { Locale } from '../copy';
import type { GameCard } from '../types';

// The real format is two sets and a champions tiebreak, not best of three —
// set3_score appears once in 343 rows, super_tiebreak_score 87 times
// (content spec §2.2). The options speak that format.
const COPY = {
    el: {
        kicker: 'Τρεις εκδοχές, μία σωστή',
        question: 'Πώς τελείωσε;',
        explanation: 'Έχασε το δεύτερο σετ και το πήρε στο σούπερ τάι μπρέικ. <b>6-4, 2-6, [17-15]</b>.',
        options: [
            '2-0 σε δύο σετ',
            '2-1 στο σούπερ τάι μπρέικ',
            '2-0 με τάι μπρέικ στο πρώτο',
        ],
    },
    en: {
        kicker: 'Three versions, one correct',
        question: 'How did it finish?',
        explanation: 'He dropped the second set and took it on the champions tiebreak. <b>6-4, 2-6, [17-15]</b>.',
        options: [
            '2-0 in straight sets',
            '2-1 on the champions tiebreak',
            '2-0 with a tiebreak in the first',
        ],
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
        correctIndex: 1,
    }];
}
