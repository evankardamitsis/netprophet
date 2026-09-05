// lib/daily/generators/order.ts
//
// Tap three players into the right sequence. The rows arrive shuffled — see
// OrderList, which seeds its shuffle off the card id so a re-render does not
// reshuffle under the player's finger.

import { getPlayer } from '../providers/mock';
import type { GameCard, PlayerRef } from '../types';

export function generateOrderCards(): GameCard[] {
    const ids = ['dg', 'ap', 'ti'];
    const items = ids
        .map(getPlayer)
        .filter((p): p is PlayerRef => Boolean(p));

    if (items.length !== ids.length) return [];

    return [
        {
            id: 'order-rating-desc',
            kind: 'order',
            kicker: 'Άγγιξε με τη σωστή σειρά',
            question: 'Από τον ψηλότερο βαθμό στον χαμηλότερο.',
            points: 15,
            reveal: 'instant',
            explanation: 'Γεωργίου 1795, Παππάς 1688, Ιωάννου 1601.',
            scoring: true,
            items,
            correctOrder: ids,
        },
    ];
}
