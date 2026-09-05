// lib/daily/generators/thisThat.ts
//
// Pure taste, no scoring — two framed choices side by side. The gradients are
// content, authored per card, the way the player palettes are.

import type { GameCard } from '../types';

export function generateThisThatCards(): GameCard[] {
    return [
        {
            id: 'thisthat-third-set',
            kind: 'thisThat',
            kicker: 'Καθαρά θέμα γούστου',
            question: 'Ποιον θες στο πλευρό σου σε τρίτο σετ;',
            points: 5,
            reveal: 'instant',
            explanation:
                'Η σκηνή προτιμά τη φόρμα από την εμπειρία. <b>63%</b> για τον Γεωργίου.',
            scoring: false,
            options: [
                {
                    title: 'Ο ψύχραιμος',
                    sub: 'Γεωργίου · 5 σερί',
                    gradient: 'linear-gradient(150deg,#5A3320,#1A0E08)',
                },
                {
                    title: 'Ο έμπειρος',
                    sub: 'Καραμάνος · 31 ετών',
                    gradient: 'linear-gradient(150deg,#2E4A63,#0E1A24)',
                },
            ],
            crowdSplit: [63, 37],
        },
    ];
}
