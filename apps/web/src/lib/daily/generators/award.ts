// lib/daily/generators/award.ts
//
// Same mechanics as a poll, different framing: a weekly vote that closes.

import type { GameCard } from '../types';

export function generateAwardCards(): GameCard[] {
    return [
        {
            id: 'award-player-of-week',
            kind: 'award',
            kicker: 'Τα αποτελέσματα βγαίνουν Δευτέρα',
            question: 'Παίκτης της εβδομάδας;',
            points: 5,
            reveal: 'instant',
            explanation:
                'Ο <b>Παππάς</b> προηγείται χάρη στην ανατροπή. Η ψηφοφορία κλείνει απόψε.',
            scoring: false,
            options: ['Α. Παππάς', 'Δ. Γεωργίου', 'Ν. Καραμάνος', 'Μ. Σταύρου'],
            crowdSplit: [41, 33, 18, 8],
        },
    ];
}
