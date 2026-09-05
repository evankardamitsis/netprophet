'use client';

import { useState } from 'react';
import { Celebration, type CelebrationSpec } from '@/components/daily/Celebration';
import { Portrait } from '@/components/daily/Portrait';
import { ScratchPanel } from '@/components/daily/ScratchPanel';
import { useHaptics } from '@/hooks/useHaptics';
import { useCopy, useLocale, type Locale } from '@/lib/daily/copy';
import {
    BOARD_ATTICA, BOARD_BASELINE, BOARD_CLUBS, LOCKED_STATS, PENDING_RESOLVE, PENDING_VOTE,
    PRO_FEATURES, PRO_PLANS, PRO_STORE, RECENT_MATCHES,
    clubName, getPlayer, getPlayerMeta, getPlayers, t,
} from '@/lib/daily/providers/mock';
import { greekCaps, matchesLoosely } from '@/lib/daily/greek';
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
    { id: 'today', icon: '⚡' },
    { id: 'players', icon: '👤' },
    { id: 'board', icon: '📊' },
    { id: 'pro', icon: '★' },
] as const;

type Tab = (typeof TABS)[number]['id'];

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
    const copy = useCopy();

    const goto = (next: Tab) => {
        haptics.tap();
        setOpenPlayer(null);
        setTab(next);
    };

    return (
        <>
            <nav className="np-nav">
                {TABS.map((entry) => (
                    <button
                        key={entry.id}
                        type="button"
                        aria-current={tab === entry.id}
                        className={tab === entry.id ? 'is-on' : undefined}
                        onClick={() => goto(entry.id)}
                    >
                        <em>{entry.icon}</em>
                        <span>{copy.hub.tabs[entry.id]}</span>
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
    const copy = useCopy();
    const locale = useLocale();
    const done = playedToday(state);
    const claimed = state.profile?.claimedId
        ? getPlayer(state.profile.claimedId, locale)
        : undefined;
    const friends = (state.profile?.friendIds ?? [])
        .map((id) => getPlayer(id, locale))
        .filter((p): p is PlayerRef => Boolean(p));
    const resolved = state.resolvedIds.includes(PENDING_RESOLVE.id);
    // Earned by the streak, unlocked by finishing today's run, once a day.
    const bonusOpen = done
        && state.streak >= RAPID_STREAK
        && state.bonusPlayedOn !== todayISO();

    // Greek drops accents in caps; English needs no such care.
    const formatted = new Date().toLocaleDateString(
        locale === 'el' ? 'el-GR' : 'en-GB',
        { weekday: 'long', day: 'numeric', month: 'long' },
    );
    const today = locale === 'el' ? greekCaps(formatted) : formatted.toUpperCase();

    return (
        <div className="np-hub">
            <header className="np-hub-head">
                <h1 className="np-h1">{copy.hub.tabs.today}</h1>
                <span className="np-meta">
                    🔥 <b>{state.streak}</b> {copy.common.days(state.streak)}
                </span>
            </header>

            <div className="np-hub-main">
                {claimed && (
                    <div className="np-crd" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Portrait palette={paletteOf(claimed.id)} size={42} corner={radius.sm} />
                        <span className="np-who">
                            {claimed.name}
                            <small>
                                {copy.hub.today.yourProfile(claimed.club, claimed.ntrp)}
                            </small>
                        </span>
                        <span className="np-meta">{claimed.rating}</span>
                    </div>
                )}

                <section className="np-hero">
                    <span className="np-pill">{today}</span>
                    <h2>{done ? copy.hub.today.heroDone : copy.hub.today.heroOpen}</h2>
                    <p>{done ? copy.hub.today.ledeDone : copy.hub.today.ledeOpen}</p>
                    <button
                        type="button"
                        className="np-cta"
                        disabled={done}
                        onClick={() => { haptics.lock(); onStart(); }}
                    >
                        {done ? copy.hub.today.played : copy.hub.today.play}
                    </button>
                </section>

                {bonusOpen && (
                    <div className="np-crd is-bonus" style={{ marginTop: 12 }}>
                        <div className="np-t1">
                            <b>{copy.hub.today.bonus.title}</b>
                            <span style={{ color: colour.good }}>
                                {copy.hub.today.bonus.unlocked}
                            </span>
                        </div>
                        <div className="np-t2" style={{ marginBottom: 11 }}>
                            {copy.hub.today.bonus.lede(RAPID_STREAK)}
                        </div>
                        <button
                            type="button"
                            className="np-cta is-win"
                            onClick={() => { haptics.lock(); onStartBonus(); }}
                        >
                            {copy.hub.today.bonus.play}
                        </button>
                    </div>
                )}

                <div className="np-section-title">{copy.hub.today.pending}</div>
                {!resolved && (
                    <div className="np-crd is-resolve">
                        <div className="np-t1">
                            <b>{t(PENDING_RESOLVE.title, locale)}</b>
                            <span>{t(PENDING_RESOLVE.when, locale)}</span>
                        </div>
                        <div className="np-t2" style={{ marginBottom: 11 }}>
                            {t(PENDING_RESOLVE.lede, locale)}
                        </div>
                        <ScratchPanel
                            html={t(PENDING_RESOLVE.underFoil, locale)}
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
                                    label: t(PENDING_RESOLVE.celebration.label, locale),
                                    title: t(PENDING_RESOLVE.celebration.title, locale),
                                    sub: t(PENDING_RESOLVE.celebration.sub, locale),
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
                        <b>{t(PENDING_VOTE.title, locale)}</b>
                        <span>{t(PENDING_VOTE.when, locale)}</span>
                    </div>
                    <div className="np-t2">{t(PENDING_VOTE.lede, locale)}</div>
                </div>
            </div>

            <aside className="np-hub-side">
                {friends.length > 0 && (
                    <>
                        <div className="np-section-title">{copy.hub.today.yourPlayers}</div>
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

                <div className="np-section-title">{copy.hub.today.yourWeek}</div>
                <div className="np-stats">
                    <div className="np-stbox">
                        <small>{copy.hub.today.stats.points}</small><b>{state.totalPoints}</b>
                    </div>
                    <div className="np-stbox">
                        <small>{copy.hub.today.stats.accuracy}</small><b>{accuracy(state)}</b>
                    </div>
                    <div className="np-stbox">
                        <small>{copy.hub.today.stats.streak}</small><b>{state.streak}</b>
                    </div>
                </div>

                <div className="np-section-title">{copy.hub.today.settings}</div>
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
                        <b>{copy.hub.settings.haptics}</b>
                        <small>
                            {haptics.supported
                                ? copy.hub.settings.hapticsOn
                                : copy.hub.settings.hapticsUnsupported}
                        </small>
                    </span>
                    <span className={`np-sw${state.haptics && haptics.supported ? ' is-on' : ''}`} />
                </button>

                <button
                    type="button"
                    className="np-tog"
                    style={{ marginTop: 8 }}
                    onClick={() => {
                        haptics.select();
                        const next: Locale = locale === 'el' ? 'en' : 'el';
                        onState(patchDailyState({ locale: next }));
                    }}
                >
                    <span>
                        <b>{copy.hub.settings.language}</b>
                        <small>{copy.hub.settings.languageSub}</small>
                    </span>
                    <span className="np-meta">{locale === 'el' ? 'EN' : 'ΕΛ'}</span>
                </button>
            </aside>
        </div>
    );
}

/* ================= Παίκτες ================= */

function Players({ onOpen }: { onOpen: (id: string) => void }) {
    const copy = useCopy();
    const locale = useLocale();
    const [query, setQuery] = useState('');
    const players = getPlayers(locale);
    const list = players.filter(
        (p) => !query || matchesLoosely(`${p.name} ${p.club}`, query),
    );

    return (
        <>
            <header className="np-hub-head">
                <h1 className="np-h1">{copy.hub.players.title}</h1>
                <span className="np-meta">{copy.hub.players.count(214)}</span>
            </header>
            <input
                className="np-input"
                placeholder={copy.hub.players.search}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            {list.map((p) => (
                <button key={p.id} type="button" className="np-plrow" onClick={() => onOpen(p.id)}>
                    <Portrait palette={paletteOf(p.id)} size={44} corner={radius.md} />
                    <span className="np-who">
                        {p.name}<small>{copy.hub.players.sub(p.club, p.ntrp)}</small>
                    </span>
                    <span className="np-rt">{p.rating}</span>
                </button>
            ))}
            {list.length === 0 && <p className="np-sub">{copy.common.noResults}</p>}
        </>
    );
}

function PlayerPage({
    id, onBack, onPro,
}: {
    id: string; onBack: () => void; onPro: () => void;
}) {
    const copy = useCopy();
    const locale = useLocale();
    const player = getPlayer(id, locale);
    const meta = getPlayerMeta(id);
    if (!player || !meta) return null;

    return (
        <>
            <span className="np-back" role="button" tabIndex={0} onClick={onBack}>
                {copy.hub.players.back}
            </span>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <Portrait palette={paletteOf(id)} size={76} corner={radius.xl} />
                <div>
                    <div className="np-h1" style={{ fontSize: 26 }}>{player.name}</div>
                    <div className="np-meta" style={{ marginTop: 4 }}>{player.club}</div>
                    <div className="np-meta">
                        {copy.hub.players.meta(player.ntrp, t(meta.hand, locale), meta.age)}
                    </div>
                </div>
            </div>

            <div className="np-section-title">{copy.hub.players.form}</div>
            <div className="np-crd">
                <Form form={player.form} />
                <div className="np-t2" style={{ marginTop: 8 }}>
                    {copy.hub.players.streakLine(player.streak, player.rating)}
                </div>
            </div>

            <div className="np-section-title">{copy.hub.players.bySurface}</div>
            <div className="np-crd">
                <Bar label={copy.hub.players.clay} value={player.clay} colour={colour.clay} />
                <Bar label={copy.hub.players.hard} value={player.hard} colour={colour.hard} />
            </div>

            <div className="np-section-title">{copy.hub.players.recent}</div>
            {RECENT_MATCHES.map((m) => (
                <div key={m.against.el} className="np-crd">
                    <div className="np-t1">
                        <b>{t(m.against, locale)}</b>
                        <span style={{ color: m.won ? colour.good : colour.bad }}>{m.score}</span>
                    </div>
                </div>
            ))}

            <div className="np-section-title">{copy.hub.players.deeper}</div>
            <div className="np-crd np-locked">
                <div className="np-blur">
                    {LOCKED_STATS.map((stat) => (
                        <Bar
                            key={stat.label.el}
                            label={t(stat.label, locale)}
                            value={stat.value}
                            colour={colour.locked}
                        />
                    ))}
                    <div className="np-t2" style={{ marginTop: 9 }}>
                        {copy.hub.players.lockedNote}
                    </div>
                </div>
                <button type="button" className="np-lockbar" onClick={onPro}>
                    <span>{copy.hub.pro.pro}</span>
                    <b>{copy.hub.players.lockTitle}</b>
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
    const copy = useCopy();
    const locale = useLocale();
    const club = clubName(state.profile?.club ?? null, locale) ?? copy.hub.board.noClub;
    const label = `${club} · ${accuracy(state)}`;
    const me: BoardRow = {
        name: { el: copy.hub.board.you, en: copy.hub.board.you },
        sub: { el: label, en: label },
        points: BOARD_BASELINE + weekPoints(state),
        me: true,
    };
    const attica = [...BOARD_ATTICA, me].sort((a, b) => b.points - a.points);

    return (
        <>
            <header className="np-hub-head">
                <h1 className="np-h1">{copy.hub.board.title}</h1>
                <span className="np-meta">{copy.hub.board.week}</span>
            </header>
            <div className="np-section-title">{copy.hub.board.attica}</div>
            {attica.map((row, k) => (
                <BoardLine key={row.name.el} row={row} position={k + 1} locale={locale} />
            ))}
            <div className="np-section-title">{copy.hub.board.clubs}</div>
            {BOARD_CLUBS.map((row, k) => (
                <BoardLine key={row.name.el} row={row} position={k + 1} locale={locale} />
            ))}
        </>
    );
}

function BoardLine({
    row, position, locale,
}: {
    row: BoardRow; position: number; locale: Locale;
}) {
    return (
        <div className={`np-lbrow${row.me ? ' is-me' : ''}`}>
            <span className="np-pos">{position}</span>
            <span className="np-who">
                {t(row.name, locale)}<small>{t(row.sub, locale)}</small>
            </span>
            <span className="np-pts">
                {row.points.toLocaleString(locale === 'el' ? 'el-GR' : 'en-GB')}
            </span>
        </div>
    );
}

/* ================= Pro ================= */

function Pro() {
    const copy = useCopy();
    const locale = useLocale();

    return (
        <>
            <header className="np-hub-head">
                <h1 className="np-h1">{copy.hub.pro.title}</h1>
            </header>
            <div className="np-pro">
                <span className="np-badge">{copy.hub.pro.badge}</span>
                <h5>{copy.hub.pro.heading}</h5>
                <div className="np-plede">{copy.hub.pro.lede}</div>
                <div style={{ marginTop: 14 }}>
                    <div className="np-cmprow is-head">
                        <span className="f1" />
                        <span className="f2">{copy.hub.pro.free}</span>
                        <span className="f3">{copy.hub.pro.pro}</span>
                    </div>
                    {PRO_FEATURES.map((f) => (
                        <div key={f.label.el} className="np-cmprow">
                            <span className="f1">{t(f.label, locale)}</span>
                            <span className="f2">{t(f.free, locale)}</span>
                            <span className="f3">{t(f.pro, locale)}</span>
                        </div>
                    ))}
                </div>
                {/* Shown, not sold. Nothing in this branch is purchasable. */}
                <div className="np-plans">
                    {PRO_PLANS.map((plan) => (
                        <div
                            key={plan.price}
                            className={`np-pbtn${plan.best ? ' is-best' : ''}`}
                        >
                            {plan.best && <span className="np-tagx">{copy.hub.pro.best}</span>}
                            <b>{plan.price}</b>
                            <span>{t(plan.period, locale)}</span>
                        </div>
                    ))}
                </div>
                <div className="np-trial">{copy.hub.pro.trial}</div>
            </div>

            <div className="np-section-title">{copy.hub.pro.store}</div>
            <div className="np-store">
                {PRO_STORE.map((item) => (
                    <div key={item.label.el} className="np-sitem">
                        <em>{item.icon}</em>
                        <b>{t(item.label, locale)}</b>
                        <span>{item.price}</span>
                    </div>
                ))}
            </div>
        </>
    );
}

/* ================= shared bits ================= */

function Form({ form }: { form: ('w' | 'l')[] }) {
    const copy = useCopy();
    return (
        <div className="np-form">
            {form.map((f, k) => (
                <i key={k} className={f}>
                    {f === 'w' ? copy.hub.players.win : copy.hub.players.loss}
                </i>
            ))}
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
