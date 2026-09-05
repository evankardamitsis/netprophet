// lib/daily/generators/combo.ts
//
// Διπλή πρόβλεψη: pick two of four, both right or nothing. It banks no points
// during the run — it locks, and resolves later on the hub, which is why it
// carries `scoring: false` even though it is the biggest card in the deck.

import type { GameCard } from '../types';

export function generateComboCards(): GameCard[] {
    return [
        {
            id: 'combo-saturday-double',
            kind: 'combo',
            kicker: 'Και οι δύο σωστοί ή τίποτα',
            question: 'Διάλεξε δύο νικητές για το Σάββατο.',
            points: 40,
            reveal: 'instant',
            explanation:
                'Η διπλή σου κλείδωσε. Και τα δύο σωστά δίνουν <b>40 πόντους</b>, αλλιώς μηδέν.',
            scoring: false,
            rows: [
                { label: 'Γεωργίου – Σταύρου', right: '18:00' },
                { label: 'Καραμάνος – Παππάς', right: '19:30' },
                { label: 'Ιωάννου – Δημητρίου', right: '20:45' },
                { label: 'Βλάχος – Ρούσσος', right: '21:15' },
            ],
            pickCount: 2,
        },
    ];
}
