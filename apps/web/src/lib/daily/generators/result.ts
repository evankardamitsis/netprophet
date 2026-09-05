// lib/daily/generators/result.ts
//
// "Ποιος κέρδισε;" — two players, pick the winner, see how the crowd split.

import type { Locale } from '../copy';
import { getPlayer } from '../providers/mock';
import type { GameCard } from '../types';

const COPY = {
    el: {
        kicker: 'Προημιτελικός · 2 ώρες 14 λεπτά',
        question: 'Ποιος κέρδισε χθες στην Κηφισιά;',
        explanation: '<b>Γεωργίου</b> 4-6, 7-5, 7-6. Το 62% της σκηνής το βρήκε.',
    },
    en: {
        kicker: 'Quarter-final · 2 hours 14 minutes',
        question: 'Who won yesterday in Kifisia?',
        explanation: '<b>Georgiou</b> 4-6, 7-5, 7-6. 62% of the scene called it.',
    },
} as const;

export function generateResultCards(locale: Locale): GameCard[] {
    const a = getPlayer('nk', locale);
    const b = getPlayer('dg', locale);
    if (!a || !b) return [];

    return [{
        id: 'result-kifisia-qf',
        kind: 'result',
        ...COPY[locale],
        points: 10,
        reveal: 'instant',
        scoring: true,
        a,
        b,
        correctId: b.id,
        crowdSplit: [38, 62],
    }];
}
