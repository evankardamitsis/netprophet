// lib/daily/generators/thisThat.ts
//
// Pure taste, no scoring. The gradients are content, authored per card.

import type { Locale } from '../copy';
import type { GameCard } from '../types';

const GRADIENTS = [
    'linear-gradient(150deg,#5A3320,#1A0E08)',
    'linear-gradient(150deg,#2E4A63,#0E1A24)',
];

const COPY = {
    el: {
        kicker: 'Καθαρά θέμα γούστου',
        question: 'Ποιον θες στο πλευρό σου σε τρίτο σετ;',
        explanation: 'Η σκηνή προτιμά τη φόρμα από την εμπειρία. <b>63%</b> για τον Γεωργίου.',
        options: [
            { title: 'Ο ψύχραιμος', sub: 'Γεωργίου · 5 σερί' },
            { title: 'Ο έμπειρος', sub: 'Καραμάνος · 31 ετών' },
        ],
    },
    en: {
        kicker: 'Purely a matter of taste',
        question: 'Who do you want beside you in a third set?',
        explanation: 'The scene takes form over experience. <b>63%</b> for Georgiou.',
        options: [
            { title: 'The cool head', sub: 'Georgiou · 5 in a row' },
            { title: 'The old hand', sub: 'Karamanos · 31 years old' },
        ],
    },
} as const;

export function generateThisThatCards(locale: Locale): GameCard[] {
    const c = COPY[locale];
    return [{
        id: 'thisthat-third-set',
        kind: 'thisThat',
        kicker: c.kicker,
        question: c.question,
        explanation: c.explanation,
        points: 5,
        reveal: 'instant',
        scoring: false,
        options: c.options.map((o, k) => ({ ...o, gradient: GRADIENTS[k] })),
        crowdSplit: [63, 37],
    }];
}
