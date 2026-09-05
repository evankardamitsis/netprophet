// lib/daily/generators/order.ts
//
// Tap three players into the right sequence. The rows arrive shuffled — see
// OrderList, which seeds its shuffle off the card id.

import type { Locale } from '../copy';
import { getPlayer } from '../providers/mock';
import type { GameCard, PlayerRef } from '../types';

const COPY = {
    el: {
        kicker: 'Άγγιξε με τη σωστή σειρά',
        question: 'Από τον ψηλότερο βαθμό στον χαμηλότερο.',
        explanation: 'Γεωργίου 1795, Παππάς 1688, Ιωάννου 1601.',
    },
    en: {
        kicker: 'Tap them in the right order',
        question: 'Highest rating to lowest.',
        explanation: 'Georgiou 1795, Pappas 1688, Ioannou 1601.',
    },
} as const;

export function generateOrderCards(locale: Locale): GameCard[] {
    const ids = ['dg', 'ap', 'ti'];
    const items = ids
        .map((id) => getPlayer(id, locale))
        .filter((p): p is PlayerRef => Boolean(p));

    if (items.length !== ids.length) return [];

    return [{
        id: 'order-rating-desc',
        kind: 'order',
        ...COPY[locale],
        points: 15,
        reveal: 'instant',
        scoring: true,
        items,
        correctOrder: ids,
    }];
}
