'use client';

// Label on the left, detail on the right. Two modes:
//   single  upset — pick the one shock result, revealed right or wrong
//   multi   combo — pick exactly `pickCount`; unpicked rows dim once locked

export function RowList({
    rows, mode, selected, answered, onToggle, correctIndex, pickCount,
}: {
    rows: { label: string; right: string }[];
    mode: 'single' | 'multi';
    /** the picked index in single mode, the picked indices in multi */
    selected: number[];
    answered: boolean;
    onToggle: (index: number) => void;
    correctIndex?: number;
    pickCount?: number;
}) {
    return (
        <div className="np-rows">
            {rows.map((row, k) => {
                const isPicked = selected.includes(k);
                const isCorrect = correctIndex !== undefined && k === correctIndex;
                // A full multi selection locks the rest out until something is undone.
                const isFull = mode === 'multi'
                    && pickCount !== undefined
                    && selected.length >= pickCount;

                const marks = [
                    !answered && isPicked ? 'is-sel' : '',
                    answered && mode === 'single' && isCorrect ? 'is-ok' : '',
                    answered && mode === 'single' && isPicked && !isCorrect ? 'is-no' : '',
                    answered && mode === 'multi' && !isPicked ? 'is-dim' : '',
                ].filter(Boolean).join(' ');

                return (
                    <button
                        key={k}
                        type="button"
                        disabled={answered || (isFull && !isPicked)}
                        aria-pressed={isPicked}
                        onClick={() => onToggle(k)}
                        className={`np-rowline ${marks}`.trim()}
                    >
                        <span className="np-l">{row.label}</span>
                        <span className="np-r">{row.right}</span>
                    </button>
                );
            })}
        </div>
    );
}
