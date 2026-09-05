'use client';

import { useCopy } from '@/lib/daily/copy';
import { halfOf } from '@/lib/daily/scoring';

// What to do with points that are on the table but not yet banked. Offered only
// after a correct answer on a scoring card.

export function RiskChoice({
    pending, disabled, onKeep, onHalf, onDouble,
}: {
    pending: number;
    /** the scratch reveal gates these until the foil is off */
    disabled?: boolean;
    onKeep: () => void;
    onHalf: () => void;
    onDouble: () => void;
}) {
    const copy = useCopy();
    const half = halfOf(pending);

    return (
        <>
            <p className="np-table">{copy.risk.onTable(pending)}</p>
            <div className="np-choice3">
                <button
                    type="button"
                    className="np-ch is-keep"
                    disabled={disabled}
                    onClick={onKeep}
                >
                    {copy.risk.keep}<small>{copy.common.points(pending)}</small>
                </button>
                <button
                    type="button"
                    className="np-ch is-half"
                    disabled={disabled}
                    onClick={onHalf}
                >
                    {copy.risk.half}<small>{copy.risk.halfSub(half)}</small>
                </button>
                <button
                    type="button"
                    className="np-ch is-risk"
                    disabled={disabled}
                    onClick={onDouble}
                >
                    {copy.risk.double}<small>{copy.risk.doubleSub(pending * 2)}</small>
                </button>
            </div>
        </>
    );
}
