// lib/daily/generators/result.ts
//
// "Ποιος κέρδισε;" — two players, pick the winner, see how the crowd split.
// The one card of this kind in the prototype, with its copy verbatim.

import { getPlayer } from '../providers/mock';
import type { GameCard } from '../types';

export function generateResultCards(): GameCard[] {
    const a = getPlayer('nk');
    const b = getPlayer('dg');
    if (!a || !b) return [];

    return [
        {
            id: 'result-kifisia-qf',
            kind: 'result',
            kicker: 'Προημιτελικός · 2 ώρες 14 λεπτά',
            question: 'Ποιος κέρδισε χθες στην Κηφισιά;',
            points: 10,
            reveal: 'instant',
            explanation:
                '<b>Γεωργίου</b> 4-6, 7-5, 7-6. Το 62% της σκηνής το βρήκε.',
            scoring: true,
            a,
            b,
            correctId: b.id,
            crowdSplit: [38, 62],
        },
    ];
}
