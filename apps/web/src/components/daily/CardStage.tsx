'use client';

import type { CardKind } from '@/lib/daily/types';

// The question hero. The eyebrow is derived from the card's kind and worth
// rather than stored on it, exactly as the prototype composed it.

const KIND_LABEL: Partial<Record<CardKind, string>> = {
    result: 'ΤΟ ΑΠΟΤΕΛΕΣΜΑ',
    score: 'ΤΟ ΣΚΟΡ',
    thisThat: 'ΑΥΤΟΣ Ή ΑΥΤΟΣ',
    poll: 'ΔΗΜΟΣΚΟΠΗΣΗ',
    upset: 'Η ΑΝΑΤΡΟΠΗ',
    order: 'ΒΑΛΕ ΣΕ ΣΕΙΡΑ',
    award: 'ΨΗΦΟΦΟΡΙΑ ΕΒΔΟΜΑΔΑΣ',
    combo: 'ΔΙΠΛΗ ΠΡΟΒΛΕΨΗ',
};

export function CardStage({
    kind, points, kicker, question, lede,
}: {
    kind: CardKind; points: number; kicker: string; question: string; lede?: string;
}) {
    return (
        <div className="np-stage-copy">
            <div className="np-gtype">
                {KIND_LABEL[kind] ?? ''} · {points} πόντοι
            </div>
            <h2 className="np-ask">{question}</h2>
            <p className="np-hintline">{kicker}</p>
            {lede && <p className="np-lede">{lede}</p>}
        </div>
    );
}
