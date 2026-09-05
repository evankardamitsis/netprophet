'use client';

import { useMemo } from 'react';
import { seededShuffle } from '@/lib/daily/session';
import type { PlayerRef } from '@/lib/daily/types';

// Tap the players into sequence. A tap commits — the prototype does not let you
// take one back, and the numbered badge is the only feedback until the answer
// lands, at which point the whole list goes green or red together.

export function OrderList({
    cardId, items, picked, answered, correct, onPick,
}: {
    /** seeds the shuffle, so a re-render never reorders under a finger */
    cardId: string;
    items: PlayerRef[];
    picked: string[];
    answered: boolean;
    correct: boolean;
    onPick: (id: string) => void;
}) {
    const shuffled = useMemo(
        () => seededShuffle(items, cardId),
        [items, cardId],
    );

    return (
        <div className="np-opts">
            {shuffled.map((player) => {
                const position = picked.indexOf(player.id);
                const isPicked = position >= 0;

                const marks = [
                    !answered && isPicked ? 'is-sel' : '',
                    answered ? (correct ? 'is-ok' : 'is-no') : '',
                ].filter(Boolean).join(' ');

                return (
                    <button
                        key={player.id}
                        type="button"
                        disabled={answered || isPicked}
                        onClick={() => onPick(player.id)}
                        className={`np-opt ${marks}`.trim()}
                    >
                        <span>{player.name}</span>
                        <span className="np-num">{isPicked ? position + 1 : ''}</span>
                    </button>
                );
            })}
        </div>
    );
}
