'use client';

import { useCopy } from '@/lib/daily/copy';
import type { CardKind } from '@/lib/daily/types';

// The question hero. The eyebrow is derived from the card's kind and worth
// rather than stored on it, exactly as the prototype composed it.

export function CardStage({
    kind, points, kicker, question, lede,
}: {
    kind: CardKind; points: number; kicker: string; question: string; lede?: string;
}) {
    const copy = useCopy();

    return (
        <div className="np-stage-copy">
            <div className="np-gtype">
                {copy.run.kinds[kind]} · {copy.common.points(points)}
            </div>
            <h2 className="np-ask">{question}</h2>
            <p className="np-hintline">{kicker}</p>
            {lede && <p className="np-lede">{lede}</p>}
        </div>
    );
}
