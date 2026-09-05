'use client';

// Two framed choices. Nothing is right, so answering only reveals which way
// the scene leaned — the bar across the bottom of each card.

export function ThisOrThat({
    options, crowdSplit, selectedIndex, answered, onSelect,
}: {
    options: { title: string; sub: string; gradient: string }[];
    crowdSplit: [number, number];
    selectedIndex: number | null;
    answered: boolean;
    onSelect: (index: number) => void;
}) {
    return (
        <div className="np-tt">
            {options.map((option, k) => (
                <button
                    key={option.title}
                    type="button"
                    disabled={answered}
                    aria-pressed={k === selectedIndex}
                    onClick={() => onSelect(k)}
                    className={`np-ttc${!answered && k === selectedIndex ? ' is-sel' : ''}`}
                >
                    <span className="np-bgx" style={{ background: option.gradient }} />
                    <span className="np-tx">
                        <b>{option.title}</b>
                        <small>{option.sub}</small>
                    </span>
                    <span
                        className="np-vt"
                        style={answered ? { width: `${crowdSplit[k]}%` } : undefined}
                    />
                </button>
            ))}
        </div>
    );
}
