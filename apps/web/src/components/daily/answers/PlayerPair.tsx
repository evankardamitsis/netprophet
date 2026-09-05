'use client';

import { Portrait } from '@/components/daily/Portrait';
import { getPlayerMeta } from '@/lib/daily/providers/mock';
import { radius } from '@/lib/daily/tokens';
import type { GameCard } from '@/lib/daily/types';

// Two players, pick one. After the answer lands both cards reveal the crowd
// split and the correct one goes green.

type ResultCard = Extract<GameCard, { kind: 'result' }>;

const FALLBACK_PALETTE: [string, string, string] = ['#2E4A63', '#0E1A24', '#66C2E8'];

export function PlayerPair({
    card, selectedId, answered, onSelect,
}: {
    card: ResultCard;
    selectedId: string | null;
    answered: boolean;
    onSelect: (id: string) => void;
}) {
    const pair = [card.a, card.b];

    return (
        <div className="np-duo">
            {pair.map((player, k) => {
                const share = card.crowdSplit[k];
                const isCorrect = player.id === card.correctId;
                const isPicked = player.id === selectedId;

                const marks = [
                    answered ? 'is-reveal' : '',
                    answered && isCorrect ? 'is-ok' : '',
                    answered && isPicked && !isCorrect ? 'is-no' : '',
                    !answered && isPicked ? 'is-sel' : '',
                ].filter(Boolean).join(' ');

                return (
                    <button
                        key={player.id}
                        type="button"
                        disabled={answered}
                        aria-pressed={isPicked}
                        onClick={() => onSelect(player.id)}
                        className={`np-pcard ${marks}`.trim()}
                    >
                        <div className="np-portrait">
                            <Portrait
                                palette={getPlayerMeta(player.id)?.palette ?? FALLBACK_PALETTE}
                                size={64}
                                corner={radius.lg}
                            />
                        </div>
                        <div className="np-nm">{player.name}</div>
                        <div className="np-cl">{player.club}</div>
                        <div className="np-pctv">{answered ? `${share}%` : ''}</div>
                        <span
                            className="np-share"
                            style={answered ? { width: `${share}%` } : undefined}
                        />
                    </button>
                );
            })}
        </div>
    );
}
