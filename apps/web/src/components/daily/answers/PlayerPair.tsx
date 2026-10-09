'use client';

import { Portrait } from '@/components/daily/Portrait';
import { getPlayerMeta, sideLabel } from '@/lib/daily/providers/mock';
import { radius } from '@/lib/daily/tokens';
import { hasCrowd } from './crowd';
import type { GameCard, SideRef } from '@/lib/daily/types';

// Two sides, pick one. A side is one player or a doubles pair — 42% of the real
// match pool is doubles (content spec §2.2), so a pair is not a special case.
//
// After the answer lands both sides reveal the crowd split and the correct one
// goes green.

type ResultCard = Extract<GameCard, { kind: 'result' }>;

const FALLBACK_PALETTE: [string, string, string] = ['#2E4A63', '#0E1A24', '#66C2E8'];

function paletteOf(id: string): [string, string, string] {
    return getPlayerMeta(id)?.palette ?? FALLBACK_PALETTE;
}

/** The clubs behind a side: one name, or both when a pair is mixed. */
function sideClub(side: SideRef): string {
    const clubs = [...new Set(side.players.map((p) => p.club))];
    return clubs.join(' / ');
}

export function PlayerPair({
    card, selectedId, answered, onSelect,
}: {
    card: ResultCard;
    selectedId: string | null;
    answered: boolean;
    onSelect: (id: string) => void;
}) {
    const sides = [card.a, card.b];
    const showSplit = hasCrowd(card.crowdSplit);
    // A pair needs two smaller portraits where a single player gets one big one.
    const doubles = sides.some((s) => s.players.length > 1);

    return (
        <div className="np-duo">
            {sides.map((side, k) => {
                const share = card.crowdSplit[k];
                const isCorrect = side.id === card.correctId;
                const isPicked = side.id === selectedId;

                const marks = [
                    answered ? 'is-reveal' : '',
                    answered && isCorrect ? 'is-ok' : '',
                    answered && isPicked && !isCorrect ? 'is-no' : '',
                    !answered && isPicked ? 'is-sel' : '',
                ].filter(Boolean).join(' ');

                return (
                    <button
                        key={side.id}
                        type="button"
                        disabled={answered}
                        aria-pressed={isPicked}
                        onClick={() => onSelect(side.id)}
                        className={`np-pcard ${marks}`.trim()}
                    >
                        <div className={`np-portrait${doubles ? ' is-pair' : ''}`}>
                            {side.players.map((player) => (
                                <Portrait
                                    key={player.id}
                                    palette={paletteOf(player.id)}
                                    size={doubles ? 44 : 64}
                                    corner={radius.lg}
                                />
                            ))}
                        </div>
                        <div className="np-nm">{sideLabel(side)}</div>
                        <div className="np-cl">{sideClub(side)}</div>
                        <div className="np-pctv">
                            {answered && showSplit ? `${share}%` : ''}
                        </div>
                        <span
                            className="np-share"
                            style={answered && showSplit ? { width: `${share}%` } : undefined}
                        />
                    </button>
                );
            })}
        </div>
    );
}
