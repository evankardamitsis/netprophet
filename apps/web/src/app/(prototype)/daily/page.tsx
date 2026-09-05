'use client';

import { useCallback, useEffect, useState } from 'react';
import { CardStage } from '@/components/daily/CardStage';
import { Celebration, type CelebrationSpec } from '@/components/daily/Celebration';
import { FeedbackSheet, type FeedbackMood } from '@/components/daily/FeedbackSheet';
import { Hub } from '@/components/daily/Hub';
import { RapidRound } from '@/components/daily/RapidRound';
import { Onboarding } from '@/components/daily/Onboarding';
import { Portrait } from '@/components/daily/Portrait';
import { RunHeader } from '@/components/daily/RunHeader';
import { RiskChoice } from '@/components/daily/RiskChoice';
import { RunProgress } from '@/components/daily/RunProgress';
import { setHapticsEnabled, useHaptics } from '@/hooks/useHaptics';
import { OptionList } from '@/components/daily/answers/OptionList';
import { OrderList } from '@/components/daily/answers/OrderList';
import { PlayerPair } from '@/components/daily/answers/PlayerPair';
import { RowList } from '@/components/daily/answers/RowList';
import { ThisOrThat } from '@/components/daily/answers/ThisOrThat';
import {
    DOUBLE_UP_QUESTIONS, getPlayer, getPlayerMeta,
} from '@/lib/daily/providers/mock';
import {
    bankVote, halfAndShield, keep, resolveAnswer, resolveDouble, type Score,
} from '@/lib/daily/scoring';
import { buildRun } from '@/lib/daily/session';
import { radius } from '@/lib/daily/tokens';
import type { CardKind, GameCard, RunState } from '@/lib/daily/types';
import {
    clearDailyState, defaultDailyState, loadDailyState, patchDailyState,
    playedToday, today, type DailyProfile, type DailyState,
} from '@/lib/daily/storage';

// Three screens behind one route: onboarding until a profile exists, then the
// hub, then a run. The risk choice, the scratch reveal and the celebration are
// all still ahead — a correct answer banks straight away for now.

const BUILD = 'daily-run · step 3';
const FALLBACK_PALETTE: [string, string, string] = ['#2E4A63', '#0E1A24', '#66C2E8'];

/** Feedback headline per kind, verbatim from the prototype's submit(). */
const TITLES: Partial<Record<CardKind, { win: string; lose: string }>> = {
    result: { win: 'Σωστά!', lose: 'Όχι αυτή τη φορά' },
    score: { win: 'Ακριβώς', lose: 'Κοντά' },
    upset: { win: 'Το βρήκες', lose: 'Δεν ήταν αυτό' },
    order: { win: 'Σωστή σειρά', lose: 'Λάθος σειρά' },
};

/** What a non-scoring card says instead. */
const INFO_TITLES: Partial<Record<CardKind, string>> = {
    poll: 'Ψήφισες',
    award: 'Ψήφισες',
    thisThat: 'Ψήφισες',
    combo: 'Κλειδώθηκε',
};

/** Everything a card can hold while it is being answered. */
interface Draft {
    id: string | null;      // result
    index: number | null;   // score / guess / poll / award / thisThat / upset
    indices: number[];      // combo
    order: string[];        // order
}

const EMPTY_DRAFT: Draft = { id: null, index: null, indices: [], order: [] };

/** Has the player given enough of an answer to confirm? */
function isReady(card: GameCard, draft: Draft): boolean {
    switch (card.kind) {
        case 'result': return draft.id !== null;
        case 'combo': return draft.indices.length === card.pickCount;
        case 'order': return draft.order.length === card.items.length;
        default: return draft.index !== null;
    }
}

/** Null when the card has no right answer. */
function isCorrect(card: GameCard, draft: Draft): boolean | null {
    switch (card.kind) {
        case 'result': return draft.id === card.correctId;
        case 'score':
        case 'guess': return draft.index === card.correctIndex;
        case 'upset': return draft.index === card.correctIndex;
        case 'order':
            return draft.order.join() === card.correctOrder.join();
        default: return null;
    }
}

function confirmLabel(card: GameCard, draft: Draft): string {
    if (card.kind !== 'combo') return 'Επιβεβαίωση';
    const left = card.pickCount - draft.indices.length;
    if (left === 0) return 'Κλείδωσε';
    if (draft.indices.length === 0) return `Διάλεξε ${card.pickCount}`;
    return `Διάλεξε ${left} ακόμα`;
}

type Screen = 'hub' | 'run' | 'bonus';

export default function DailyPage() {
    const [state, setState] = useState<DailyState | null>(null);
    const [screen, setScreen] = useState<Screen>('hub');

    useEffect(() => {
        // Hidden escape hatch for testers: /daily?reset=1 wipes np_daily_v1.
        const reset = new URLSearchParams(window.location.search).get('reset') === '1';
        if (reset) {
            clearDailyState();
            window.history.replaceState(null, '', window.location.pathname);
            const blank = defaultDailyState();
            setHapticsEnabled(blank.haptics);
            setState(blank);
            return;
        }
        const loaded = loadDailyState();
        setHapticsEnabled(loaded.haptics);
        setState(loaded);
    }, []);

    // Reads the persisted state rather than the render's copy, and writes
    // outside any updater — a state updater must stay free of side effects or
    // StrictMode's double invoke banks the run twice.
    const finishRun = useCallback((run: RunState) => {
        const base = loadDailyState();
        // Only cards with a right answer count towards accuracy — a vote stores
        // the chosen index, and index 0 is not a wrong answer.
        const scored = run.cards.filter((c) => c.scoring);
        const correct = scored.filter((c) => run.answers[c.id] === true).length;
        setState(patchDailyState({
            streak: base.streak + 1,
            lastPlayedOn: today(),
            totalPoints: base.totalPoints + run.points,
            shield: run.shield,
            seenCardIds: [...base.seenCardIds, ...run.cards.map((c) => c.id)],
            history: [
                ...base.history,
                {
                    date: today(),
                    points: run.points,
                    correct,
                    total: scored.length,
                },
            ],
        }));
        setScreen('hub');
    }, []);

    // The bonus round has no streak, no combo and no cards to mark seen — it
    // only ever adds points, and only once a day.
    const finishBonus = useCallback((earned: number) => {
        const base = loadDailyState();
        setState(patchDailyState({
            totalPoints: base.totalPoints + earned,
            bonusPlayedOn: today(),
        }));
        setScreen('hub');
    }, []);

    // Nothing renders until local state is read, so server and client agree.
    if (state === null) return <div className="np-stage" />;

    if (state.profile === null) {
        return (
            <div className="np-stage">
                <Onboarding
                    onComplete={(profile: DailyProfile) =>
                        setState(patchDailyState({ profile }))
                    }
                />
            </div>
        );
    }

    return (
        <div className="np-stage">
            {screen === 'run' ? (
                <Run state={state} onFinish={finishRun} />
            ) : screen === 'bonus' ? (
                <RapidRound streak={state.streak} onFinish={finishBonus} />
            ) : (
                <Hub
                    state={state}
                    onState={(next) => {
                        setHapticsEnabled(next.haptics);
                        setState(next);
                    }}
                    onStart={() => setScreen('run')}
                    onStartBonus={() => setScreen('bonus')}
                />
            )}
        </div>
    );
}

/* ================= the run ================= */

function Run({
    state, onFinish,
}: {
    state: DailyState;
    onFinish: (run: RunState) => void;
}) {
    // Seeded on the date, so a mid-run reload returns the same eight cards.
    const [run, setRun] = useState<RunState>(() => ({
        cards: buildRun({ seenCardIds: state.seenCardIds, seed: today() }),
        index: 0,
        points: 0,
        pending: 0,
        combo: 0,
        shield: state.shield,
        answers: {},
    }));

    const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
    const [answered, setAnswered] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);
    // 'risk' is the keep / half / double offer; 'double' is the question you
    // bet the table on. Both only ever follow a correct scoring answer.
    const [phase, setPhase] = useState<'ask' | 'risk' | 'double' | 'done'>('ask');
    const [doubleIndex, setDoubleIndex] = useState(0);
    const [doublePick, setDoublePick] = useState<number | null>(null);
    // Scratch cards hold the sheet shut until the foil is off.
    const [scratched, setScratched] = useState(false);
    // A takeover, plus what to do once the player dismisses it.
    const [party, setParty] = useState<
        { spec: CelebrationSpec; then: 'next' | 'finish' } | null
    >(null);
    const haptics = useHaptics();

    const card: GameCard | undefined = run.cards[run.index];
    const last = run.index === run.cards.length - 1;
    const question = DOUBLE_UP_QUESTIONS[doubleIndex % DOUBLE_UP_QUESTIONS.length];

    // An empty deck would strand the tester on a blank screen.
    useEffect(() => {
        if (run.cards.length === 0) onFinish(run);
    }, [run, onFinish]);

    if (!card) return <div className="np-run" />;

    const correct = isCorrect(card, draft);
    const titles = TITLES[card.kind];

    /** Pull the money out of the run, apply a rule, put it back. */
    const applyScore = (fn: (s: Score) => Score) =>
        setRun((r) => {
            const next = fn({
                points: r.points, pending: r.pending, combo: r.combo, shield: r.shield,
            });
            return { ...r, ...next };
        });

    const nextCard = () => {
        haptics.tap();
        setSheetOpen(false);
        // Let the sheet slide out before the next card swaps in.
        window.setTimeout(() => {
            if (last) {
                // A blank run is not worth a takeover.
                if (run.points > 0) {
                    haptics.streak();
                    setParty({
                        spec: {
                            label: 'ΤΕΛΟΣ ΓΥΡΟΥ',
                            title: `Σερί ${state.streak + 1} ημερών`,
                            points: run.points,
                            total: state.totalPoints,
                            sub: 'Επιστρέφεις αύριο στις 09:00 για οκτώ νέα παιχνίδια.',
                        },
                        then: 'finish',
                    });
                    return;
                }
                onFinish(run);
                return;
            }
            setRun((r) => ({ ...r, index: r.index + 1 }));
            setDraft(EMPTY_DRAFT);
            setAnswered(false);
            setDoublePick(null);
            setScratched(false);
            setPhase('ask');
        }, 240);
    };

    const submit = () => {
        if (!isReady(card, draft)) return;
        const ok = isCorrect(card, draft) === true;

        // A prediction that can be right buzzes right or wrong; a vote just locks.
        if (card.scoring) (ok ? haptics.correct : haptics.wrong)();
        else haptics.lock();

        setRun((r) => ({
            ...r,
            answers: {
                ...r.answers,
                [card.id]: card.scoring
                    ? ok
                    : card.kind === 'combo' ? draft.indices : draft.index,
            },
        }));

        if (card.scoring) {
            applyScore((s) => resolveAnswer(s, card.points, ok));
            // A win goes on the table and the player chooses what to do with it.
            setPhase(ok ? 'risk' : 'done');
        } else {
            // A vote always pays. A combo banks nothing — it resolves later.
            if (card.kind !== 'combo') applyScore((s) => bankVote(s, card.points));
            setPhase('done');
        }

        setAnswered(true);
        setSheetOpen(true);
    };

    // Banking is a lock; taking the shield is a streak buzz.
    const chooseKeep = () => { haptics.lock(); applyScore(keep); nextCard(); };
    const chooseHalf = () => { haptics.streak(); applyScore(halfAndShield); nextCard(); };

    const chooseDouble = () => {
        haptics.select();
        setSheetOpen(false);
        window.setTimeout(() => setPhase('double'), 260);
    };

    const answerDouble = (index: number) => {
        setDoublePick(index);
        const ok = index === question.correctIndex;
        // Captured before the rules run — resolveDouble clears the table.
        const won = run.pending * 2;
        (ok ? haptics.streak : haptics.wrong)();
        applyScore((s) => resolveDouble(s, ok));
        setDoubleIndex((i) => i + 1);
        setPhase('done');

        if (ok) {
            setParty({
                spec: {
                    label: 'ΔΙΠΛΑΣΙΑΣΜΟΣ',
                    title: 'Το πήρες',
                    points: won,
                    total: state.totalPoints + run.points,
                    sub: question.explanation,
                    huge: true,
                },
                then: 'next',
            });
            return;
        }
        setSheetOpen(true);
    };

    const pickIndex = (index: number) => {
        haptics.select();
        setDraft((d) => ({ ...d, index }));
    };

    const toggleIndex = (index: number) => {
        haptics.select();
        setDraft((d) => ({
            ...d,
            indices: d.indices.includes(index)
                ? d.indices.filter((i) => i !== index)
                : [...d.indices, index],
        }));
    };

    // What the sheet says depends on which of the three endings we reached.
    const doubleWon = doublePick !== null && doublePick === question.correctIndex;
    const foiled = card.reveal === 'scratch';
    const sheet = phase === 'risk'
        ? {
            mood: 'win' as FeedbackMood,
            title: titles?.win ?? 'Σωστά!',
            explanation: card.explanation,
            scratch: foiled,
        }
        : doublePick !== null
            ? {
                // The double-up answer is never hidden — you already gambled.
                mood: (doubleWon ? 'win' : 'lose') as FeedbackMood,
                title: doubleWon ? 'Διπλασιάστηκε' : 'Τα έχασες',
                explanation: question.explanation,
                scratch: false,
            }
            : {
                mood: (!card.scoring ? 'info' : correct ? 'win' : 'lose') as FeedbackMood,
                title: !card.scoring
                    ? INFO_TITLES[card.kind] ?? 'Καταχωρήθηκε'
                    : correct ? titles?.win ?? 'Σωστά!' : titles?.lose ?? 'Όχι αυτή τη φορά',
                explanation: card.explanation,
                scratch: foiled,
            };

    return (
        <div className="np-run">
            <div className="np-top">
                <RunProgress total={run.cards.length} index={run.index} />
                <RunHeader
                    streak={state.streak}
                    combo={run.combo}
                    shield={run.shield}
                    points={run.points}
                />
            </div>

            <div className="np-body">
                {phase === 'double' ? (
                    <div key="double" className="np-fade np-game-grid">
                        <div className="np-stage-copy">
                            <span className="np-riskbar">
                                ⚡ {run.pending} ΠΟΝΤΟΙ ΣΕ ΚΙΝΔΥΝΟ
                            </span>
                            <div className="np-gtype">
                                ΔΙΠΛΑΣΙΑΣΜΟΣ · {run.pending * 2} πόντοι
                            </div>
                            <h2 className="np-ask">{question.question}</h2>
                            <p className="np-hintline">
                                Σωστή απάντηση και διπλασιάζεις. Λάθος και τα χάνεις όλα.
                            </p>
                        </div>
                        <div>
                            <OptionList
                                options={question.options}
                                selectedIndex={doublePick}
                                answered={doublePick !== null}
                                onSelect={answerDouble}
                                correctIndex={question.correctIndex}
                            />
                        </div>
                    </div>
                ) : (
                    <div key={card.id} className="np-fade np-game-grid">
                        <CardStage
                            kind={card.kind}
                            points={card.points}
                            kicker={card.kicker}
                            question={card.question}
                            lede={card.lede}
                        />
                        <div>
                            {card.kind === 'result' && (
                                <PlayerPair
                                    card={card}
                                    selectedId={draft.id}
                                    answered={answered}
                                    onSelect={(id) => {
                                        haptics.select();
                                        setDraft((d) => ({ ...d, id }));
                                    }}
                                />
                            )}

                            {(card.kind === 'score' || card.kind === 'guess') && (
                                <OptionList
                                    options={card.options}
                                    selectedIndex={draft.index}
                                    answered={answered}
                                    onSelect={pickIndex}
                                    correctIndex={card.correctIndex}
                                    clues={card.clues}
                                />
                            )}

                            {(card.kind === 'poll' || card.kind === 'award') && (
                                <OptionList
                                    options={card.options}
                                    selectedIndex={draft.index}
                                    answered={answered}
                                    onSelect={pickIndex}
                                    crowdSplit={card.crowdSplit}
                                />
                            )}

                            {card.kind === 'thisThat' && (
                                <ThisOrThat
                                    options={card.options}
                                    crowdSplit={card.crowdSplit}
                                    selectedIndex={draft.index}
                                    answered={answered}
                                    onSelect={pickIndex}
                                />
                            )}

                            {card.kind === 'upset' && (
                                <RowList
                                    rows={card.rows}
                                    mode="single"
                                    selected={draft.index === null ? [] : [draft.index]}
                                    answered={answered}
                                    onToggle={pickIndex}
                                    correctIndex={card.correctIndex}
                                />
                            )}

                            {card.kind === 'combo' && (
                                <RowList
                                    rows={card.rows}
                                    mode="multi"
                                    selected={draft.indices}
                                    answered={answered}
                                    onToggle={toggleIndex}
                                    pickCount={card.pickCount}
                                />
                            )}

                            {card.kind === 'order' && (
                                <OrderList
                                    cardId={card.id}
                                    items={card.items}
                                    picked={draft.order}
                                    answered={answered}
                                    correct={correct === true}
                                    onPick={(id) => {
                                        haptics.select();
                                        setDraft((d) => ({ ...d, order: [...d.order, id] }));
                                    }}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>

            {!answered && (
                <div className="np-foot">
                    <button
                        type="button"
                        className="np-cta"
                        disabled={!isReady(card, draft)}
                        onClick={submit}
                    >
                        {confirmLabel(card, draft)}
                    </button>
                </div>
            )}

            <FeedbackSheet
                open={sheetOpen}
                mood={sheet.mood}
                title={sheet.title}
                explanation={sheet.explanation}
                actionLabel={last ? 'Τελείωσες' : 'Επόμενο'}
                onAction={nextCard}
                scratch={sheet.scratch}
                scratchKey={`${card.id}-${phase}`}
                scratched={scratched}
                onScratchCleared={() => { haptics.streak(); setScratched(true); }}
                onScratchTick={haptics.tick}
                onScratchStart={haptics.select}
            >
                {phase === 'risk' ? (
                    <RiskChoice
                        pending={run.pending}
                        disabled={sheet.scratch && !scratched}
                        onKeep={chooseKeep}
                        onHalf={chooseHalf}
                        onDouble={chooseDouble}
                    />
                ) : undefined}
            </FeedbackSheet>

            {party && (
                <Celebration
                    spec={party.spec}
                    onImpact={() => haptics.impact(party.spec.huge)}
                    onTick={haptics.tick}
                    onDone={() => {
                        const { then } = party;
                        setParty(null);
                        // nextCard taps on its own; finishing does not.
                        if (then === 'finish') {
                            haptics.tap();
                            onFinish(run);
                        } else {
                            nextCard();
                        }
                    }}
                />
            )}
        </div>
    );
}
