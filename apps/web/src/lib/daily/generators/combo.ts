// lib/daily/generators/combo.ts
//
// Διπλή πρόβλεψη: pick two of four, both right or nothing. It banks no points
// during the run — it locks, and resolves later on the hub, which is why it
// carries `scoring: false` even though it is the biggest card in the deck.

import type { Locale } from '../copy';
import type { GameCard } from '../types';

const TIMES = ['18:00', '19:30', '20:45', '21:15'];

const COPY = {
    el: {
        kicker: 'Και οι δύο σωστοί ή τίποτα',
        question: 'Διάλεξε δύο νικητές για το Σάββατο.',
        explanation: 'Η διπλή σου κλείδωσε. Και τα δύο σωστά δίνουν <b>40 πόντους</b>, αλλιώς μηδέν.',
        labels: [
            'Γεωργίου – Σταύρου', 'Καραμάνος – Παππάς',
            'Ιωάννου – Δημητρίου', 'Βλάχος – Ρούσσος',
        ],
    },
    en: {
        kicker: 'Both right or nothing',
        question: 'Pick two winners for Saturday.',
        explanation: 'Your double is locked. Both right pays <b>40 points</b>, otherwise nothing.',
        labels: [
            'Georgiou – Stavrou', 'Karamanos – Pappas',
            'Ioannou – Dimitriou', 'Vlachos – Roussos',
        ],
    },
} as const;

export function generateComboCards(locale: Locale): GameCard[] {
    const c = COPY[locale];
    return [{
        id: 'combo-saturday-double',
        kind: 'combo',
        kicker: c.kicker,
        question: c.question,
        explanation: c.explanation,
        points: 40,
        reveal: 'instant',
        scoring: false,
        rows: c.labels.map((label, k) => ({ label, right: TIMES[k] })),
        pickCount: 2,
    }];
}
