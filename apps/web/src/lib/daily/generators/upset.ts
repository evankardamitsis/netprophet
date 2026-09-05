// lib/daily/generators/upset.ts
//
// Three results from the same round, one of them a shock. Pick the shock.

import type { Locale } from '../copy';
import type { GameCard } from '../types';

const SCORES = ['6-2 6-1', '7-6 6-4', '6-3 6-4'];

const COPY = {
    el: {
        kicker: 'Τρία αποτελέσματα, μία ανατροπή',
        question: 'Ποια ήταν η έκπληξη;',
        explanation: 'Ο <b>Παππάς</b> έριξε τον νούμερο ένα της περιοχής.',
        labels: ['Καραμάνος – Ιωάννου', 'Παππάς – Γεωργίου', 'Σταύρου – Ιωάννου'],
    },
    en: {
        kicker: 'Three results, one upset',
        question: 'Which one was the surprise?',
        explanation: '<b>Pappas</b> took down the area’s number one.',
        labels: ['Karamanos – Ioannou', 'Pappas – Georgiou', 'Stavrou – Ioannou'],
    },
} as const;

export function generateUpsetCards(locale: Locale): GameCard[] {
    const c = COPY[locale];
    return [{
        id: 'upset-pappas-georgiou',
        kind: 'upset',
        kicker: c.kicker,
        question: c.question,
        explanation: c.explanation,
        points: 15,
        reveal: 'instant',
        scoring: true,
        rows: c.labels.map((label, k) => ({ label, right: SCORES[k] })),
        correctIndex: 1,
    }];
}
