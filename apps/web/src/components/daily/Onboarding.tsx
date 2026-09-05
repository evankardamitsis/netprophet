'use client';

import { useMemo, useState } from 'react';
import { Portrait } from '@/components/daily/Portrait';
import { useHaptics } from '@/hooks/useHaptics';
import { useCopy, useLocale } from '@/lib/daily/copy';
import type { DailyProfile } from '@/lib/daily/storage';
import {
    CLUBS, PLAY_TYPES, clubIdFor, getPlayerMeta, getPlayers, t,
} from '@/lib/daily/providers/mock';
import type { PlayerRef } from '@/lib/daily/types';
import { matchesLoosely } from '@/lib/daily/greek';
import { radius } from '@/lib/daily/tokens';

// Four steps, five if you play tournaments — the extra one lets a competitive
// player claim their own profile off the local ladder. Ported from the
// prototype's `renderOb()`. Greek copy is verbatim.
//
// On a phone the copy sits above the choices and the button is pinned to the
// bottom. From 1080px up the two split into columns; see styles.ts.

type Step = 'welcome' | 'type' | 'claim' | 'club' | 'friends';
type PlayType = DailyProfile['playType'];

const FALLBACK_PALETTE: [string, string, string] = ['#2E4A63', '#0E1A24', '#66C2E8'];

function paletteOf(id: string): [string, string, string] {
    return getPlayerMeta(id)?.palette ?? FALLBACK_PALETTE;
}

export function Onboarding({
    onComplete,
}: {
    onComplete: (profile: DailyProfile) => void;
}) {
    const [stepIndex, setStepIndex] = useState(0);
    const [playType, setPlayType] = useState<PlayType | null>(null);
    const [claimedId, setClaimedId] = useState<string | null>(null);
    const [club, setClub] = useState<string | null>(null);
    const [friendIds, setFriendIds] = useState<string[]>([]);
    const [claimQuery, setClaimQuery] = useState('');
    const [friendQuery, setFriendQuery] = useState('');
    const haptics = useHaptics();
    const copy = useCopy();
    const locale = useLocale();
    const players = getPlayers(locale);

    const steps: Step[] = useMemo(
        () =>
            playType === 'comp'
                ? ['welcome', 'type', 'claim', 'club', 'friends']
                : ['welcome', 'type', 'club', 'friends'],
        [playType],
    );

    // Switching away from 'comp' drops the claim step, which can leave the
    // index pointing past the end. Clamp rather than trust it.
    const current = steps[Math.min(stepIndex, steps.length - 1)];
    const next = () => setStepIndex((i) => i + 1);

    const claimList = players.filter(
        (p) => !claimQuery || matchesLoosely(`${p.name} ${p.club}`, claimQuery),
    );
    const friendList = players.filter(
        (p) => p.id !== claimedId
            && (!friendQuery || matchesLoosely(`${p.name} ${p.club}`, friendQuery)),
    );

    const toggleFriend = (id: string) =>
        setFriendIds((ids) =>
            ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
        );

    const finish = () => {
        haptics.streak();
        onComplete({ playType: playType!, claimedId, club, friendIds });
    };

    // The footer button is the only way forward on every step.
    let label = copy.common.continue;
    let disabled = false;
    let advance: () => void = () => { haptics.tap(); next(); };

    if (current === 'welcome') {
        label = copy.onboarding.welcome.cta;
    } else if (current === 'type') {
        disabled = !playType;
    } else if (current === 'claim') {
        label = claimedId ? copy.onboarding.claim.yes : copy.onboarding.claim.no;
    } else if (current === 'club') {
        disabled = !club;
    } else if (current === 'friends') {
        label = friendIds.length
            ? copy.onboarding.friends.go(friendIds.length)
            : copy.onboarding.friends.none;
        disabled = friendIds.length === 0;
        advance = finish;
    }

    const stepLabel = copy.onboarding.step(stepIndex, steps.length - 1);

    return (
        <div className="np-ob">
            {/* step dots — one per step after the welcome screen */}
            <div className="np-steps">
                {steps.slice(1).map((s, k) => (
                    <i key={s} className={k <= stepIndex - 1 ? 'is-on' : undefined} />
                ))}
            </div>

            <div className="np-ob-body">
                <div key={current} className="np-fade np-ob-grid">
                    {current === 'welcome' && (
                        <>
                            <div className="np-ob-copy">
                                <div className="np-eyebrow">{copy.onboarding.eyebrow}</div>
                                <div className="np-wordmark">NET<br />PROPHET</div>
                            </div>
                            <div className="np-ob-choices">
                                <div className="np-tagline">
                                    {copy.onboarding.welcome.tagline}
                                </div>
                                <p className="np-sub">{copy.onboarding.welcome.sub}</p>
                            </div>
                        </>
                    )}

                    {current === 'type' && (
                        <>
                            <div className="np-ob-copy">
                                <div className="np-eyebrow">{stepLabel}</div>
                                <div className="np-tagline">{copy.onboarding.playType.tagline}</div>
                                <p className="np-sub">{copy.onboarding.playType.sub}</p>
                            </div>
                            <div className="np-ob-choices">
                                <div className="np-list">
                                    {PLAY_TYPES.map((p) => (
                                        <Row
                                            key={p.id}
                                            selected={playType === p.id}
                                            onClick={() => {
                                                haptics.select();
                                                setPlayType(p.id);
                                                // Only tournament players claim a profile.
                                                if (p.id !== 'comp') setClaimedId(null);
                                            }}
                                            title={t(p.name, locale)}
                                            sub={t(p.sub, locale)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {current === 'claim' && (
                        <>
                            <div className="np-ob-copy">
                                <div className="np-eyebrow">{stepLabel}</div>
                                <div className="np-tagline">{copy.onboarding.claim.tagline}</div>
                                <p className="np-sub">{copy.onboarding.claim.sub}</p>
                            </div>
                            <div className="np-ob-choices">
                                <input
                                    className="np-input"
                                    placeholder={copy.onboarding.claim.search}
                                    value={claimQuery}
                                    onChange={(e) => setClaimQuery(e.target.value)}
                                />
                                <div className="np-list is-tight">
                                    {claimList.map((p) => (
                                        <PlayerRow
                                            key={p.id}
                                            player={p}
                                            selected={claimedId === p.id}
                                            onClick={() => {
                                                haptics.select();
                                                const nextId = claimedId === p.id ? null : p.id;
                                                setClaimedId(nextId);
                                                // Claiming a profile pre-fills the club step.
                                                if (nextId) setClub(clubIdFor(p.id));
                                            }}
                                        />
                                    ))}
                                    {claimList.length === 0 && <Empty />}
                                </div>
                            </div>
                        </>
                    )}

                    {current === 'club' && (
                        <>
                            <div className="np-ob-copy">
                                <div className="np-eyebrow">{stepLabel}</div>
                                <div className="np-tagline">{copy.onboarding.club.tagline}</div>
                                <p className="np-sub">{copy.onboarding.club.sub}</p>
                            </div>
                            <div className="np-ob-choices">
                                <div className="np-tiles">
                                    {CLUBS.map((c) => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            aria-pressed={club === c.id}
                                            onClick={() => { haptics.select(); setClub(c.id); }}
                                            className={`np-tile${club === c.id ? ' is-sel' : ''}`}
                                        >
                                            {t(c, locale)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {current === 'friends' && (
                        <>
                            <div className="np-ob-copy">
                                <div className="np-eyebrow">{stepLabel}</div>
                                <div className="np-tagline">{copy.onboarding.friends.tagline}</div>
                                <p className="np-sub">{copy.onboarding.friends.sub}</p>
                            </div>
                            <div className="np-ob-choices">
                                <input
                                    className="np-input"
                                    placeholder={copy.onboarding.friends.search}
                                    value={friendQuery}
                                    onChange={(e) => setFriendQuery(e.target.value)}
                                />
                                <div className="np-list is-tight">
                                    {friendList.map((p) => (
                                        <PlayerRow
                                            key={p.id}
                                            player={p}
                                            selected={friendIds.includes(p.id)}
                                            onClick={() => { haptics.select(); toggleFriend(p.id); }}
                                        />
                                    ))}
                                    {friendList.length === 0 && <Empty />}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="np-foot">
                <button
                    type="button"
                    className="np-cta"
                    disabled={disabled}
                    onClick={advance}
                >
                    {label}
                </button>
            </div>
        </div>
    );
}

/* ---------- pieces shared by the steps ---------- */

function Empty() {
    const copy = useCopy();
    return <p className="np-sub">{copy.common.noResults}</p>;
}

function Row({
    selected, onClick, title, sub, leading,
}: {
    selected: boolean; onClick: () => void; title: string; sub: string;
    leading?: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={selected}
            className={`np-row${selected ? ' is-sel' : ''}`}
        >
            {leading}
            <span className="np-who">
                {title}
                <small>{sub}</small>
            </span>
            <span className={`np-tick${selected ? ' is-on' : ''}`}>✓</span>
        </button>
    );
}

function PlayerRow({
    player, selected, onClick,
}: {
    player: PlayerRef; selected: boolean; onClick: () => void;
}) {
    const copy = useCopy();
    return (
        <Row
            selected={selected}
            onClick={onClick}
            title={player.name}
            sub={copy.hub.players.sub(player.club, player.ntrp)}
            leading={
                <Portrait palette={paletteOf(player.id)} size={38} corner={radius.sm} />
            }
        />
    );
}
