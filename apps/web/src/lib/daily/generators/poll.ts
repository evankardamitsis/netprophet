// lib/daily/generators/poll.ts
//
// A vote, not a prediction — there is no right answer, so it always pays out
// and never touches the combo. Answering reveals how the scene voted.

import type { GameCard } from '../types';

export function generatePollCards(): GameCard[] {
    return [
        {
            id: 'poll-tournament-winner',
            kind: 'poll',
            kicker: '214 ψήφοι · κλείνει σε 6 ώρες',
            question: 'Ποιος παίρνει το τουρνουά;',
            points: 5,
            reveal: 'instant',
            explanation:
                'Η Γλυφάδα ψηφίζει μαζικά Γεωργίου. Η Κηφισιά διαφωνεί έντονα.',
            scoring: false,
            options: ['Δ. Γεωργίου', 'Ν. Καραμάνος', 'Μ. Σταύρου', 'Κάποιος έκπληξη'],
            crowdSplit: [44, 28, 11, 17],
        },
    ];
}
