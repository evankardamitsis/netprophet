'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FeedbackSheet } from '@/components/daily/FeedbackSheet';
import { RunHeader } from '@/components/daily/RunHeader';
import { RunProgress } from '@/components/daily/RunProgress';
import { useHaptics } from '@/hooks/useHaptics';
import { buildRapidRound, rapidAward } from '@/lib/daily/generators/rapid';

// Five true/false calls in eighteen seconds. Unlike the daily run there is no
// combo, no table and no risk — the clock is the whole pressure. A partial
// score still pays out proportionally, so running out of time is a bad round
// rather than a wasted one.

/** How long a right/wrong answer stays on screen before the next question. */
const REVEAL_MS = 260;

export function RapidRound({
    streak, onFinish,
}: {
    streak: number;
    /** called with what the round was worth */
    onFinish: (earned: number, correct: number, total: number) => void;
}) {
    const [round] = useState(buildRapidRound);
    const [index, setIndex] = useState(0);
    const [marks, setMarks] = useState<boolean[]>([]);
    const [picked, setPicked] = useState<number | null>(null);
    const [left, setLeft] = useState(round.seconds);
    const [over, setOver] = useState(false);
    const haptics = useHaptics();

    const total = round.questions.length;
    const correct = marks.filter(Boolean).length;
    const earned = rapidAward(round, correct);

    // The timer can finish the round from under the player mid-answer, so the
    // ending is guarded rather than assumed to happen once.
    const ended = useRef(false);
    const end = useCallback(() => {
        if (ended.current) return;
        ended.current = true;
        setOver(true);
    }, []);

    useEffect(() => {
        if (over) return;
        const id = window.setInterval(() => setLeft((l) => l - 1), 1000);
        return () => window.clearInterval(id);
    }, [over]);

    useEffect(() => {
        if (over) return;
        if (left <= 0) { end(); return; }
        // The last five seconds tick audibly under the finger.
        if (left <= 5) haptics.tick();
    }, [left, over, end, haptics]);

    useEffect(() => {
        if (!over) return;
        (correct >= 4 ? haptics.streak : haptics.tap)();
        // Fires once — `over` only ever goes false -> true.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [over]);

    const answer = (option: number) => {
        if (picked !== null || over) return;
        const ok = option === round.questions[index].correctIndex;
        (ok ? haptics.correct : haptics.wrong)();
        setPicked(option);
        setMarks((m) => [...m, ok]);

        window.setTimeout(() => {
            setPicked(null);
            if (index + 1 >= total) end();
            else setIndex((i) => i + 1);
        }, REVEAL_MS);
    };

    const question = round.questions[index];
    const urgent = left <= 5;

    return (
        <div className="np-run">
            <div className="np-top">
                <RunProgress total={total} index={Math.min(index, total - 1)} />
                <RunHeader streak={streak} combo={0} shield={false} points={earned} />
            </div>

            <div className="np-body">
                <div className="np-fade np-game-grid">
                    <div className="np-stage-copy">
                        <div className="np-gtype">{round.label} · {round.points} πόντοι</div>
                        <div
                            className={`np-timer${urgent ? ' is-urgent' : ''}`}
                            role="timer"
                            aria-label={`${Math.max(0, left)} δευτερόλεπτα`}
                        >
                            <i style={{ width: `${Math.max(0, (left / round.seconds) * 100)}%` }} />
                        </div>
                        <div className="np-tally">
                            {round.questions.map((_, k) => (
                                <i
                                    key={k}
                                    className={
                                        k < marks.length ? (marks[k] ? 'w' : 'l') : undefined
                                    }
                                />
                            ))}
                        </div>
                        <div className="np-rapid-q">{question.question}</div>
                    </div>

                    <div className="np-opts">
                        {round.options.map((label, k) => {
                            const isPicked = k === picked;
                            const isCorrect = k === question.correctIndex;
                            const marksFor = [
                                isPicked && isCorrect ? 'is-ok' : '',
                                isPicked && !isCorrect ? 'is-no' : '',
                            ].filter(Boolean).join(' ');
                            return (
                                <button
                                    key={label}
                                    type="button"
                                    disabled={picked !== null || over}
                                    onClick={() => answer(k)}
                                    className={`np-opt ${marksFor}`.trim()}
                                >
                                    <span>{label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <FeedbackSheet
                open={over}
                mood={correct >= 4 ? 'win' : 'info'}
                title={`${correct} στα ${total}`}
                explanation={`Κέρδισες <b>${earned} πόντους</b> στον γρήγορο γύρο.`}
                actionLabel="Τέλος"
                onAction={() => { haptics.tap(); onFinish(earned, correct, total); }}
            />
        </div>
    );
}
