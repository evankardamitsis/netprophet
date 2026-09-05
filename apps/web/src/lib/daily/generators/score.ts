// lib/daily/generators/score.ts
//
// "Πώς τελείωσε;" — three plausible scorelines, one right. Revealed by
// scratching the foil off the answer; until step 6 of the port lands the
// scratch panel, the sheet just shows it.

import type { GameCard } from '../types';

export function generateScoreCards(): GameCard[] {
    return [
        {
            id: 'score-kifisia-qf',
            kind: 'score',
            kicker: 'Τρεις εκδοχές, μία σωστή',
            question: 'Πώς τελείωσε;',
            points: 20,
            reveal: 'scratch',
            explanation: 'Έχασε το πρώτο σετ και γύρισε. <b>4-6, 7-5, 7-6</b>.',
            scoring: true,
            options: [
                '2-0 σε 58 λεπτά',
                '2-1 με τάι μπρέικ',
                '2-1 με ανατροπή από 0-1',
            ],
            correctIndex: 2,
        },
    ];
}
