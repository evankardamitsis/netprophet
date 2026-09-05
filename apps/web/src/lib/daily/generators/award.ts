// lib/daily/generators/award.ts
//
// Same mechanics as a poll, different framing: a weekly vote that closes.

import type { Locale } from '../copy';
import type { GameCard } from '../types';

const COPY = {
    el: {
        kicker: 'Τα αποτελέσματα βγαίνουν Δευτέρα',
        question: 'Παίκτης της εβδομάδας;',
        explanation: 'Ο <b>Παππάς</b> προηγείται χάρη στην ανατροπή. Η ψηφοφορία κλείνει απόψε.',
        options: ['Α. Παππάς', 'Δ. Γεωργίου', 'Ν. Καραμάνος', 'Μ. Σταύρου'],
    },
    en: {
        kicker: 'Results announced on Monday',
        question: 'Player of the week?',
        explanation: '<b>Pappas</b> leads on the back of the upset. Voting closes tonight.',
        options: ['A. Pappas', 'D. Georgiou', 'N. Karamanos', 'M. Stavrou'],
    },
} as const;

export function generateAwardCards(locale: Locale): GameCard[] {
    const c = COPY[locale];
    return [{
        id: 'award-player-of-week',
        kind: 'award',
        kicker: c.kicker,
        question: c.question,
        explanation: c.explanation,
        points: 5,
        reveal: 'instant',
        scoring: false,
        options: [...c.options],
        crowdSplit: [41, 33, 18, 8],
    }];
}
