'use client';

import { useMemo, useState } from 'react';
import { Portrait } from '@/components/daily/Portrait';
import { useHaptics } from '@/hooks/useHaptics';
import type { DailyProfile } from '@/lib/daily/storage';
import {
    CLUBS, PLAYERS, PLAY_TYPES, getPlayerMeta,
} from '@/lib/daily/providers/mock';
import type { PlayerRef } from '@/lib/daily/types';
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

/** Accent-insensitive contains, so "παππας" finds "Α. Παππάς". */
function matches(haystack: string, needle: string): boolean {
    const fold = (s: string) =>
        s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return fold(haystack).includes(fold(needle.trim()));
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

    const claimList = PLAYERS.filter(
        (p) => !claimQuery || matches(`${p.name} ${p.club}`, claimQuery),
    );
    const friendList = PLAYERS.filter(
        (p) => p.id !== claimedId
            && (!friendQuery || matches(`${p.name} ${p.club}`, friendQuery)),
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
    let label = 'Συνέχεια';
    let disabled = false;
    let advance: () => void = () => { haptics.tap(); next(); };

    if (current === 'welcome') {
        label = 'Ξεκίνα';
    } else if (current === 'type') {
        disabled = !playType;
    } else if (current === 'claim') {
        label = claimedId ? 'Αυτός είμαι' : 'Δεν είμαι στη λίστα';
    } else if (current === 'club') {
        disabled = !club;
    } else if (current === 'friends') {
        label = friendIds.length
            ? `Πάμε (${friendIds.length})`
            : 'Διάλεξε τουλάχιστον έναν';
        disabled = friendIds.length === 0;
        advance = finish;
    }

    const stepLabel = `Βήμα ${stepIndex} από ${steps.length - 1}`;

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
                                <div className="np-eyebrow">Αθήνα · καθημερινό παιχνίδι</div>
                                <div className="np-wordmark">NET<br />PROPHET</div>
                            </div>
                            <div className="np-ob-choices">
                                <div className="np-tagline">
                                    Ξέρεις την τοπική σκηνή καλύτερα από όλους;
                                </div>
                                <p className="np-sub">
                                    Οκτώ παιχνίδια τη μέρα με πραγματικά ματς από τα ταμπλό της
                                    Αθήνας. Προβλέψεις, δημοσκοπήσεις, ψηφοφορίες. Και τα
                                    στατιστικά κάθε παίκτη μαζί.
                                </p>
                            </div>
                        </>
                    )}

                    {current === 'type' && (
                        <>
                            <div className="np-ob-copy">
                                <div className="np-eyebrow">{stepLabel}</div>
                                <div className="np-tagline">Παίζεις κι εσύ;</div>
                                <p className="np-sub">
                                    Για να ξέρουμε αν θα βλέπεις και τα δικά σου ματς μέσα στο
                                    παιχνίδι.
                                </p>
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
                                            title={p.name}
                                            sub={p.sub}
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
                                <div className="np-tagline">Βρες τον εαυτό σου.</div>
                                <p className="np-sub">
                                    Αν έχεις παίξει σε τοπικό ταμπλό, είσαι ήδη στη λίστα.
                                    Διάλεξε το προφίλ σου για να βλέπεις τα ματς και τα
                                    στατιστικά σου.
                                </p>
                            </div>
                            <div className="np-ob-choices">
                                <input
                                    className="np-input"
                                    placeholder="Γράψε το όνομά σου"
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
                                                if (nextId) setClub(p.club);
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
                                <div className="np-tagline">Σε ποιον σύλλογο;</div>
                                <p className="np-sub">
                                    Θα μπεις στην κατάταξη του συλλόγου σου και θα βλέπεις πρώτα
                                    τα δικά του ματς.
                                </p>
                            </div>
                            <div className="np-ob-choices">
                                <div className="np-tiles">
                                    {CLUBS.map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            aria-pressed={club === c}
                                            onClick={() => { haptics.select(); setClub(c); }}
                                            className={`np-tile${club === c ? ' is-sel' : ''}`}
                                        >
                                            {c}
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
                                <div className="np-tagline">Ποιους ξέρεις;</div>
                                <p className="np-sub">
                                    Φίλοι, συμπαίκτες, αντίπαλοι. Θα βλέπεις πρώτα τα ματς τους
                                    και θα συγκρίνεσαι μαζί τους στην κατάταξη.
                                </p>
                            </div>
                            <div className="np-ob-choices">
                                <input
                                    className="np-input"
                                    placeholder="Αναζήτηση παίκτη"
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
    return <p className="np-sub">Κανένα αποτέλεσμα.</p>;
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
    return (
        <Row
            selected={selected}
            onClick={onClick}
            title={player.name}
            sub={`${player.club} · NTRP ${player.ntrp}`}
            leading={
                <Portrait palette={paletteOf(player.id)} size={38} corner={radius.sm} />
            }
        />
    );
}
