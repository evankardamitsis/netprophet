'use client';

// Story-style segment bar: one segment per card, the current one part-filled.

export function RunProgress({ total, index }: { total: number; index: number }) {
    return (
        <div
            className="np-seg"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={Math.min(index + 1, total)}
        >
            {Array.from({ length: total }, (_, k) => (
                <i
                    key={k}
                    className={k < index ? 'is-on' : k === index ? 'is-cur' : undefined}
                />
            ))}
        </div>
    );
}
