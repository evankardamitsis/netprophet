'use client';

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
    const half = halfOf(pending);

    return (
        <>
            <p className="np-table">
                Έχεις <b>{pending} πόντους</b> στο τραπέζι.
            </p>
            <div className="np-choice3">
                <button
                    type="button"
                    className="np-ch is-keep"
                    disabled={disabled}
                    onClick={onKeep}
                >
                    Κράτα<small>{pending} πόντοι</small>
                </button>
                <button
                    type="button"
                    className="np-ch is-half"
                    disabled={disabled}
                    onClick={onHalf}
                >
                    Τα μισά<small>{half} + ασπίδα</small>
                </button>
                <button
                    type="button"
                    className="np-ch is-risk"
                    disabled={disabled}
                    onClick={onDouble}
                >
                    Διπλασίασε<small>{pending * 2} ή τίποτα</small>
                </button>
            </div>
        </>
    );
}
