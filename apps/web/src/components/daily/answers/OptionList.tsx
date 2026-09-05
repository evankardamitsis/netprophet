'use client';

// A stack of options, used two ways:
//   score / guess  one is right — the correct row goes green, a wrong pick red
//   poll / award   nothing is right — every row fills to its share of the vote
//
// `clues` renders the hint stack above the options; only `guess` uses it.

export function OptionList({
    options, selectedIndex, answered, onSelect, correctIndex, crowdSplit, clues,
}: {
    options: string[];
    selectedIndex: number | null;
    answered: boolean;
    onSelect: (index: number) => void;
    correctIndex?: number;
    crowdSplit?: number[];
    clues?: string[];
}) {
    return (
        <>
            {clues && clues.length > 0 && (
                <div className="np-clues">
                    {clues.map((clue, k) => (
                        <div key={k} className="np-clue">
                            <b>{k + 1}</b>{clue}
                        </div>
                    ))}
                </div>
            )}

            <div className="np-opts">
                {options.map((text, k) => {
                    const isPicked = k === selectedIndex;
                    const isCorrect = correctIndex !== undefined && k === correctIndex;
                    const share = crowdSplit?.[k];

                    const marks = [
                        !answered && isPicked ? 'is-sel' : '',
                        answered && isCorrect ? 'is-ok' : '',
                        answered && isPicked && correctIndex !== undefined && !isCorrect
                            ? 'is-no' : '',
                    ].filter(Boolean).join(' ');

                    return (
                        <button
                            key={k}
                            type="button"
                            disabled={answered}
                            aria-pressed={isPicked}
                            onClick={() => onSelect(k)}
                            className={`np-opt ${marks}`.trim()}
                        >
                            <span
                                className="np-fill"
                                style={
                                    answered && share !== undefined
                                        ? { width: `${share}%` }
                                        : undefined
                                }
                            />
                            <span>{text}</span>
                            <span className="np-pc">
                                {answered && share !== undefined ? `${share}%` : ''}
                            </span>
                        </button>
                    );
                })}
            </div>
        </>
    );
}
