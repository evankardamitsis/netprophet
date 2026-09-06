// lib/daily/generators/result.ts
//
// "Ποιος κέρδισε;" — two sides, pick the winner, see how the crowd split.
//
// A side is one player or a doubles pair. Doubles is 42% of the real pool
// (content spec §2.2), so both shapes ship from the start rather than singles
// first and doubles as a retrofit.

import type { Locale } from '../copy';
import { getSide } from '../providers/mock';
import type { GameCard } from '../types';

const SINGLES = {
    el: {
        kicker: 'Προημιτελικός · 2 ώρες 14 λεπτά',
        question: 'Ποιος κέρδισε στην Κηφισιά;',
        explanation: '<b>Γεωργίου</b> 6-4, 2-6, [17-15]. Το 62% της σκηνής το βρήκε.',
    },
    en: {
        kicker: 'Quarter-final · 2 hours 14 minutes',
        question: 'Who won in Kifisia?',
        explanation: '<b>Georgiou</b> 6-4, 2-6, [17-15]. 62% of the scene called it.',
    },
} as const;

const DOUBLES = {
    el: {
        kicker: 'Ημιτελικός διπλού · Γλυφάδα',
        question: 'Ποιο ζευγάρι πέρασε στον τελικό;',
        explanation: '<b>Γεωργίου / Σταύρου</b> 6-3, 6-4. Χωρίς break εναντίον τους.',
    },
    en: {
        kicker: 'Doubles semi-final · Glyfada',
        question: 'Which pair went through to the final?',
        explanation: '<b>Georgiou / Stavrou</b> 6-3, 6-4. Not broken once.',
    },
} as const;

export function generateResultCards(locale: Locale): GameCard[] {
    const cards: GameCard[] = [];

    const a = getSide(['nk'], locale);
    const b = getSide(['dg'], locale);
    if (a && b) {
        cards.push({
            id: 'result-kifisia-qf',
            kind: 'result',
            ...SINGLES[locale],
            points: 10,
            reveal: 'instant',
            scoring: true,
            a,
            b,
            correctId: b.id,
            crowdSplit: [38, 62],
        });
    }

    const pairA = getSide(['dg', 'ms'], locale);
    const pairB = getSide(['nk', 'ap'], locale);
    if (pairA && pairB) {
        cards.push({
            id: 'result-glyfada-doubles-sf',
            kind: 'result',
            ...DOUBLES[locale],
            points: 10,
            reveal: 'instant',
            scoring: true,
            a: pairA,
            b: pairB,
            correctId: pairA.id,
            crowdSplit: [55, 45],
        });
    }

    return cards;
}
