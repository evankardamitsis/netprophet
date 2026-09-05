'use client';

import { useState } from 'react';
import { Celebration, type CelebrationSpec } from '@/components/daily/Celebration';
import { Portrait } from '@/components/daily/Portrait';
import { ScratchPanel } from '@/components/daily/ScratchPanel';
import { useHaptics } from '@/hooks/useHaptics';
import {
    BOARD_ATTICA, BOARD_BASELINE, BOARD_CLUBS, LOCKED_STATS, PENDING_RESOLVE, PENDING_VOTE,
    PLAYERS, PRO_FEATURES, PRO_PLANS, PRO_STORE, RECENT_MATCHES,
    getPlayer, getPlayerMeta,
} from '@/lib/daily/providers/mock';
import { colour, radius, surface } from '@/lib/daily/tokens';
import type { BoardRow } from '@/lib/daily/providers/mock';
import type { PlayerRef } from '@/lib/daily/types';
import { RAPID_STREAK } from '@/lib/daily/generators/rapid';
import {
    patchDailyState, playedToday, today as todayISO, type DailyState,
} from '@/lib/daily/storage';

// Four tabs behind one nav, plus a player page hanging off Παίκτες. Nothing
// here is purchasable — the Pro screen is a static page in this branch.

const FALLBACK_PALETTE: [string, string, string] = ['#2E4A63', '#0E1A24', '#66C2E8'];

const TABS = [
    { id: 'today', icon: '⚡', name: 'Σήμερα' },
    { id: 'players', icon: '👤', name: 'Παίκτες' },
    { id: 'board', icon: '📊', name: 'Κατάταξη' },
    { id: 'pro', icon: '★', name: 'Pro' },
] as const;

type Tab = (typeof TABS)[number]['id'];

/**
 * Greek drops its accents in all-caps: Σάββατο -> ΣΑΒΒΑΤΟ, not ΣΆΒΒΑΤΟ.
 * `toUpperCase` alone keeps them, which reads as a typo to a Greek eye.
 */
function greekCaps(text: string): string {
    return text
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .normalize('NFC');
}

function paletteOf(id: string): [string, string, string] {
    return getPlayerMeta(id)?.palette ?? FALLBACK_PALETTE;
}

/** Accuracy across every run this tester has finished. */
function accuracy(state: DailyState): string {
    const answered = state.history.reduce((n, h) => n + h.total, 0);
    if (answered === 0) return '—';
    const right = state.history.reduce((n, h) => n + h.correct, 0);
    return `${Math.round((right / answered) * 100)}%`;
}

export function Hub({
    state, onState, onStart, onStartBonus,
}: {
    state: DailyState;
    onState: (next: DailyState) => void;
    onStart: () => void;
    onStartBonus: () => void;
}) {
    const [tab, setTab] = useState<Tab>('today');
    const [openPlayer, setOpenPlayer] = useState<string | null>(null);
    const [party, setParty] = useState<CelebrationSpec | null>(null);
    const haptics = useHaptics();

    const goto = (next: Tab) => {
        haptics.tap();
        setOpenPlayer(null);
        setTab(next);
    };

    return (
        <>
            <nav className="np-nav">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        aria-current={tab === t.id}
                        className={tab === t.id ? 'is-on' : undefined}
                        onClick={() => goto(t.id)}
                    >
                        <em>{t.icon}</em>
                        <span>{t.name}</span>
                    </button>
                ))}
            </nav>

            <main className="np-scroll">
                <div key={openPlayer ?? tab} className="np-fade">
                    {tab === 'today' && (
                        <Today
                            state={state}
                            onState={onState}
                            onStart={onStart}
                            onStartBonus={onStartBonus}
                            onCelebrate={setParty}
                            onOpenPlayer={setOpenPlayer}
                        />
                    )}
                    {tab === 'players' && (
                        openPlayer
                            ? <PlayerPage
                                id={openPlayer}
                                onBack={() => { haptics.tap(); setOpenPlayer(null); }}
                                onPro={() => goto('pro')}
                            />
                            : <Players onOpen={(id) => { haptics.tap(); setOpenPlayer(id); }} />
                    )}
                    {tab === 'board' && <Board state={state} />}
                    {tab === 'pro' && <Pro />}
                </div>
            </main>

            {party && (
                <Celebration
                    spec={party}
                    onImpact={() => haptics.impact(party.huge)}
                    onTick={haptics.tick}
                    onDone={() => {
                        haptics.tap();
                        setParty(null);
                    }}
                />
            )}
        </>
    );
}

/* ================= Σήμερα ================= */

function Today({
    state, onState, onStart, onStartBonus, onCelebrate, onOpenPlayer,
}: {
    state: DailyState;
    onState: (next: DailyState) => void;
    onStart: () => void;
    onStartBonus: () => void;
    onCelebrate: (spec: CelebrationSpec) => void;
    onOpenPlayer: (id: string) => void;
}) {
    const haptics = useHaptics();
    const done = playedToday(state);
    const claimed = state.profile?.claimedId
        ? getPlayer(state.profile.claimedId)
        : undefined;
    const friends = (state.profile?.friendIds ?? [])
        .map(getPlayer)
        .filter((p): p is PlayerRef => Boolean(p));
    const resolved = state.resolvedIds.includes(PENDING_RESOLVE.id);
    // Earned by the streak, unlocked by finishing today's run, once a day.
    const bonusOpen = done
        && state.streak >= RAPID_STREAK
        && state.bonusPlayedOn !== todayISO();

    const today = greekCaps(
        new Date().toLocaleDateString('el-GR', {
            weekday: 'long', day: 'numeric', month: 'long',
        }),
    );

    return (
        <div className="np-hub">
            <header className="np-hub-head">
                <h1 className="np-h1">Σήμερα</h1>
                <span className="np-meta">🔥 <b>{state.streak}</b> μέρες</span>
            </header>

            <div className="np-hub-main">
                {claimed && (
                    <div className="np-crd" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Portrait palette={paletteOf(claimed.id)} size={42} corner={radius.sm} />
                        <span className="np-who">
                            {claimed.name}
                            <small>Το προφίλ σου · {claimed.club} · NTRP {claimed.ntrp}</small>
                        </span>
                        <span className="np-meta">{claimed.rating}</span>
                    </div>
                )}

                <section className="np-hero">
                    <span className="np-pill">{today}</span>
                    <h2>{done ? 'Το έπαιξες σήμερα' : 'Οκτώ παιχνίδια σε περιμένουν'}</h2>
                    <p>
                        {done
                            ? 'Επιστρέφεις αύριο στις 09:00.'
                            : 'Αποτέλεσμα, σκορ, αυτός ή αυτός, δημοσκόπηση, ανατροπή, σειρά, ψηφοφορία, διπλή πρόβλεψη.'}
                    </p>
                    <button
                        type="button"
                        className="np-cta"
                        disabled={done}
                        onClick={() => { haptics.lock(); onStart(); }}
                    >
                        {done ? 'Ολοκληρώθηκε' : 'Παίξε τώρα'}
                    </button>
                </section>

                {bonusOpen && (
                    <div className="np-crd is-bonus" style={{ marginTop: 12 }}>
                        <div className="np-t1">
                            <b>Γρήγορος γύρος</b>
                            <span style={{ color: colour.good }}>ΞΕΚΛΕΙΔΩΘΗΚΕ</span>
                        </div>
                        <div className="np-t2" style={{ marginBottom: 11 }}>
                            Το κέρδισες με σερί {RAPID_STREAK}+ ημερών. Πέντε ερωτήσεις σε 18
                            δευτερόλεπτα.
                        </div>
                        <button
                            type="button"
                            className="np-cta is-win"
                            onClick={() => { haptics.lock(); onStartBonus(); }}
                        >
                            Παίξε τον γύρο
                        </button>
                    </div>
                )}

                <div className="np-section-title">ΣΕ ΑΝΑΜΟΝΗ</div>
                {!resolved && (
                    <div className="np-crd is-resolve">
                        <div className="np-t1">
                            <b>{PENDING_RESOLVE.title}</b>
                            <span>{PENDING_RESOLVE.when}</span>
                        </div>
                        <div className="np-t2" style={{ marginBottom: 11 }}>
                            {PENDING_RESOLVE.lede}
                        </div>
                        <ScratchPanel
                            html={PENDING_RESOLVE.underFoil}
                            tone={surface.scratchToneWin}
                            onStart={haptics.select}
                            onTick={haptics.tick}
                            onCleared={() => {
                                haptics.streak();
                                onState(patchDailyState({
                                    resolvedIds: [...state.resolvedIds, PENDING_RESOLVE.id],
                                    totalPoints: state.totalPoints + PENDING_RESOLVE.points,
                                }));
                                onCelebrate({
                                    ...PENDING_RESOLVE.celebration,
                                    points: PENDING_RESOLVE.points,
                                    total: state.totalPoints,
                                    huge: true,
                                });
                            }}
                        />
                    </div>
                )}
                <div className="np-crd">
                    <div className="np-t1">
                        <b>{PENDING_VOTE.title}</b>
                        <span>{PENDING_VOTE.when}</span>
                    </div>
                    <div className="np-t2">{PENDING_VOTE.lede}</div>
                </div>
            </div>

            <aside className="np-hub-side">
                {friends.length > 0 && (
                    <>
                        <div className="np-section-title">ΟΙ ΠΑΙΚΤΕΣ ΣΟΥ</div>
                        {friends.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                className="np-plrow"
                                onClick={() => { haptics.tap(); onOpenPlayer(p.id); }}
                            >
                                <Portrait palette={paletteOf(p.id)} size={40} corner={radius.sm} />
                                <span className="np-who">{p.name}<small>{p.club}</small></span>
                                <Form form={p.form} />
                            </button>
                        ))}
                    </>
                )}

                <div className="np-section-title">Η ΕΒΔΟΜΑΔΑ ΣΟΥ</div>
                <div className="np-stats">
                    <div className="np-stbox"><small>ΠΟΝΤΟΙ</small><b>{state.totalPoints}</b></div>
                    <div className="np-stbox"><small>ΑΚΡΙΒΕΙΑ</small><b>{accuracy(state)}</b></div>
                    <div className="np-stbox"><small>ΣΕΡΙ</small><b>{state.streak}</b></div>
                </div>

                <div className="np-section-title">ΡΥΘΜΙΣΕΙΣ</div>
                <button
                    type="button"
                    className="np-tog"
                    disabled={!haptics.supported}
                    aria-pressed={state.haptics && haptics.supported}
                    onClick={() => {
                        const next = !state.haptics;
                        onState(patchDailyState({ haptics: next }));
                        if (next) haptics.select();
                    }}
                >
                    <span>
                        <b>Δόνηση</b>
                        <small>
                            {haptics.supported
                                ? 'Μικρή δόνηση σε κάθε επιλογή'
                                : 'Δεν υποστηρίζεται σε αυτή τη συσκευή'}
                        </small>
                    </span>
                    <span className={`np-sw${state.haptics && haptics.supported ? ' is-on' : ''}`} />
                </button>
            </aside>
        </div>
    );
}

/* ================= Παίκτες ================= */

function Players({ onOpen }: { onOpen: (id: string) => void }) {
    const [query, setQuery] = useState('');
    const fold = (s: string) =>
        s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const list = PLAYERS.filter(
        (p) => !query || fold(`${p.name} ${p.club}`).includes(fold(query.trim())),
    );

    return (
        <>
            <header className="np-hub-head">
                <h1 className="np-h1">Παίκτες</h1>
                <span className="np-meta">Αττική · 214</span>
            </header>
            <input
                className="np-input"
                placeholder="Αναζήτηση παίκτη ή συλλόγου"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            {list.map((p) => (
                <button key={p.id} type="button" className="np-plrow" onClick={() => onOpen(p.id)}>
                    <Portrait palette={paletteOf(p.id)} size={44} corner={radius.md} />
                    <span className="np-who">
                        {p.name}<small>{p.club} · NTRP {p.ntrp}</small>
                    </span>
                    <span className="np-rt">{p.rating}</span>
                </button>
            ))}
            {list.length === 0 && <p className="np-sub">Κανένα αποτέλεσμα.</p>}
        </>
    );
}

function PlayerPage({
    id, onBack, onPro,
}: {
    id: string; onBack: () => void; onPro: () => void;
}) {
    const player = getPlayer(id);
    const meta = getPlayerMeta(id);
    if (!player) return null;

    return (
        <>
            <span className="np-back" role="button" tabIndex={0} onClick={onBack}>← Παίκτες</span>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <Portrait palette={paletteOf(id)} size={76} corner={radius.xl} />
                <div>
                    <div className="np-h1" style={{ fontSize: 26 }}>{player.name}</div>
                    <div className="np-meta" style={{ marginTop: 4 }}>{player.club}</div>
                    <div className="np-meta">
                        NTRP {player.ntrp} · {meta?.hand} · {meta?.age} ετών
                    </div>
                </div>
            </div>

            <div className="np-section-title">ΦΟΡΜΑ · ΤΕΛΕΥΤΑΙΑ 5</div>
            <div className="np-crd">
                <Form form={player.form} />
                <div className="np-t2" style={{ marginTop: 8 }}>
                    Ενεργό σερί: {player.streak} · Βαθμοί: {player.rating}
                </div>
            </div>

            <div className="np-section-title">ΑΠΟΔΟΣΗ ΑΝΑ ΕΠΙΦΑΝΕΙΑ</div>
            <div className="np-crd">
                <Bar label="ΧΩΜΑ" value={player.clay} colour={colour.clay} />
                <Bar label="ΣΚΛΗΡΟ" value={player.hard} colour={colour.hard} />
            </div>

            <div className="np-section-title">ΤΕΛΕΥΤΑΙΑ ΜΑΤΣ</div>
            {RECENT_MATCHES.map((m) => (
                <div key={m.against} className="np-crd">
                    <div className="np-t1">
                        <b>{m.against}</b>
                        <span style={{ color: m.won ? colour.good : colour.bad }}>{m.score}</span>
                    </div>
                </div>
            ))}

            <div className="np-section-title">ΒΑΘΥΤΕΡΑ ΣΤΑΤΙΣΤΙΚΑ</div>
            <div className="np-crd np-locked">
                <div className="np-blur">
                    {LOCKED_STATS.map((s) => (
                        <Bar key={s.label} label={s.label} value={s.value} colour={colour.locked} />
                    ))}
                    <div className="np-t2" style={{ marginTop: 9 }}>
                        Πλήρες ιστορικό 38 ματς, ανά αντίπαλο και ανά σεζόν
                    </div>
                </div>
                <button type="button" className="np-lockbar" onClick={onPro}>
                    <span>PRO</span>
                    <b>Πλήρη στατιστικά &amp; ιστορικό</b>
                </button>
            </div>
        </>
    );
}

/* ================= Κατάταξη ================= */

/** What the tester has scored in the last seven days. */
function weekPoints(state: DailyState): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const from = cutoff.toISOString().slice(0, 10);
    return state.history
        .filter((h) => h.date >= from)
        .reduce((n, h) => n + h.points, 0);
}

function Board({ state }: { state: DailyState }) {
    const me: BoardRow = {
        name: 'Εσύ',
        sub: `${state.profile?.club ?? 'Χωρίς σύλλογο'} · ${accuracy(state)}`,
        points: BOARD_BASELINE + weekPoints(state),
        me: true,
    };
    const attica = [...BOARD_ATTICA, me].sort((a, b) => b.points - a.points);

    return (
        <>
            <header className="np-hub-head">
                <h1 className="np-h1">Κατάταξη</h1>
                <span className="np-meta">ΕΒΔΟΜΑΔΑ 36</span>
            </header>
            <div className="np-section-title">ΑΤΤΙΚΗ</div>
            {attica.map((r, k) => <BoardLine key={r.name} row={r} position={k + 1} />)}
            <div className="np-section-title">ΣΥΛΛΟΓΟΙ</div>
            {BOARD_CLUBS.map((r, k) => <BoardLine key={r.name} row={r} position={k + 1} />)}
        </>
    );
}

function BoardLine({ row, position }: { row: BoardRow; position: number }) {
    return (
        <div className={`np-lbrow${row.me ? ' is-me' : ''}`}>
            <span className="np-pos">{position}</span>
            <span className="np-who">{row.name}<small>{row.sub}</small></span>
            <span className="np-pts">{row.points.toLocaleString('el-GR')}</span>
        </div>
    );
}

/* ================= Pro ================= */

function Pro() {
    return (
        <>
            <header className="np-hub-head">
                <h1 className="np-h1">NetProphet Pro</h1>
            </header>
            <div className="np-pro">
                <span className="np-badge">7 ΜΕΡΕΣ ΔΩΡΕΑΝ</span>
                <h5>Περισσότερα παιχνίδια, όλα τα δεδομένα</h5>
                <div className="np-plede">
                    Δωρεάν έχεις όλα τα παιχνίδια. Με την Pro έχεις και όλα τα δεδομένα.
                </div>
                <div style={{ marginTop: 14 }}>
                    <div className="np-cmprow is-head">
                        <span className="f1" /><span className="f2">ΔΩΡΕΑΝ</span><span className="f3">PRO</span>
                    </div>
                    {PRO_FEATURES.map((f) => (
                        <div key={f.label} className="np-cmprow">
                            <span className="f1">{f.label}</span>
                            <span className="f2">{f.free}</span>
                            <span className="f3">{f.pro}</span>
                        </div>
                    ))}
                </div>
                {/* Shown, not sold. Nothing in this branch is purchasable. */}
                <div className="np-plans">
                    {PRO_PLANS.map((p) => (
                        <div key={p.price} className={`np-pbtn${p.best ? ' is-best' : ''}`}>
                            {p.best && <span className="np-tagx">ΚΑΛΥΤΕΡΗ ΑΞΙΑ</span>}
                            <b>{p.price}</b>
                            <span>{p.period}</span>
                        </div>
                    ))}
                </div>
                <div className="np-trial">Δοκιμή 7 ημερών. Ακυρώνεις όποτε θες.</div>
            </div>

            <div className="np-section-title">ΜΕΜΟΝΩΜΕΝΑ</div>
            <div className="np-store">
                {PRO_STORE.map((s) => (
                    <div key={s.label} className="np-sitem">
                        <em>{s.icon}</em>
                        <b>{s.label}</b>
                        <span>{s.price}</span>
                    </div>
                ))}
            </div>
        </>
    );
}

/* ================= shared bits ================= */

function Form({ form }: { form: ('w' | 'l')[] }) {
    return (
        <div className="np-form">
            {form.map((f, k) => <i key={k} className={f}>{f === 'w' ? 'Ν' : 'Η'}</i>)}
        </div>
    );
}

function Bar({ label, value, colour: fill }: { label: string; value: number; colour: string }) {
    return (
        <div className="np-barrow">
            <small>{label}</small>
            <div className="np-bar"><i style={{ width: `${value}%`, background: fill }} /></div>
            <b>{value}%</b>
        </div>
    );
}
