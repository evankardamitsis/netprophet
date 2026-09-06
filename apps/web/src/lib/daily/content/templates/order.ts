// lib/daily/content/templates/order.ts
//
// "Βάλε τους σε σειρά" — three players by win rate. Derived from standings
// rather than an event, so the card expires; see the fact's validUntil.

import type { Locale } from '../../copy';
import type { Snapshot } from '../../providers/supabase';
import type { GameCard, PlayerRef } from '../../types';
import type { Fact, RankingValue } from '../facts';
import { toPlayerRef } from './names';

const COPY = {
    el: {
        kicker: 'Άγγιξε με τη σωστή σειρά',
        question: 'Από το καλύτερο ποσοστό νικών στο χαμηλότερο.',
        explanation: (parts: string[]) => parts.join(' · '),
    },
    en: {
        kicker: 'Tap them in the right order',
        question: 'Best win rate to worst.',
        explanation: (parts: string[]) => parts.join(' · '),
    },
} as const;

export function renderOrder(
    fact: Fact<RankingValue>, snapshot: Snapshot, locale: Locale,
): GameCard | null {
    const players = fact.value.order
        .map((id) => snapshot.players.get(id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p));
    if (players.length !== fact.value.order.length) return null;

    const items: PlayerRef[] = players.map((p) => toPlayerRef(p, locale, 'singles'));
    const copy = COPY[locale];

    // The explanation shows the numbers the order came from, so a player who
    // got it wrong can see exactly why.
    const parts = items.map((item, k) =>
        `${item.name} ${Math.round(fact.value.values[k] * 100)}%`);

    return {
        id: fact.id,
        kind: 'order',
        kicker: copy.kicker,
        question: copy.question,
        points: 15,
        reveal: 'instant',
        explanation: copy.explanation(parts),
        scoring: true,
        items,
        correctOrder: fact.value.order,
    };
}
