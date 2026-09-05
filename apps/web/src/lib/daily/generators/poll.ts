// lib/daily/generators/poll.ts
//
// A vote, not a prediction — no right answer, so it always pays out and never
// touches the combo.

import type { Locale } from '../copy';
import type { GameCard } from '../types';

const COPY = {
    el: {
        kicker: '214 ψήφοι · κλείνει σε 6 ώρες',
        question: 'Ποιος παίρνει το τουρνουά;',
        explanation: 'Η Γλυφάδα ψηφίζει μαζικά Γεωργίου. Η Κηφισιά διαφωνεί έντονα.',
        options: ['Δ. Γεωργίου', 'Ν. Καραμάνος', 'Μ. Σταύρου', 'Κάποιος έκπληξη'],
    },
    en: {
        kicker: '214 votes · closes in 6 hours',
        question: 'Who takes the tournament?',
        explanation: 'Glyfada is voting Georgiou en masse. Kifisia disagrees loudly.',
        options: ['D. Georgiou', 'N. Karamanos', 'M. Stavrou', 'Someone unexpected'],
    },
} as const;

export function generatePollCards(locale: Locale): GameCard[] {
    const c = COPY[locale];
    return [{
        id: 'poll-tournament-winner',
        kind: 'poll',
        kicker: c.kicker,
        question: c.question,
        explanation: c.explanation,
        points: 5,
        reveal: 'instant',
        scoring: false,
        options: [...c.options],
        crowdSplit: [44, 28, 11, 17],
    }];
}
