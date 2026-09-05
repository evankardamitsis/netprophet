// lib/daily/generators/upset.ts
//
// Three results from the same round, one of them a shock. Pick the shock.

import type { GameCard } from '../types';

export function generateUpsetCards(): GameCard[] {
    return [
        {
            id: 'upset-pappas-georgiou',
            kind: 'upset',
            kicker: 'Τρία αποτελέσματα, μία ανατροπή',
            question: 'Ποια ήταν η έκπληξη;',
            points: 15,
            reveal: 'instant',
            explanation: 'Ο <b>Παππάς</b> έριξε τον νούμερο ένα της περιοχής.',
            scoring: true,
            rows: [
                { label: 'Καραμάνος – Ιωάννου', right: '6-2 6-1' },
                { label: 'Παππάς – Γεωργίου', right: '7-6 6-4' },
                { label: 'Σταύρου – Ιωάννου', right: '6-3 6-4' },
            ],
            correctIndex: 1,
        },
    ];
}
