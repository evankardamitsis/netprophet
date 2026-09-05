'use client';

import { useCopy } from '@/lib/daily/copy';
import { comboMultiplier } from '@/lib/daily/scoring';

// Streak on the left, the combo multiplier and shield in the middle, points
// banked so far on the right.

export function RunHeader({
    streak, combo, shield, points,
}: {
    streak: number; combo: number; shield: boolean; points: number;
}) {
    const copy = useCopy();
    const multiplier = comboMultiplier(combo);

    return (
        <div className="np-runhead">
            <span className="np-meta">🔥 <b>{streak}</b> {copy.run.streakDays(streak)}</span>
            <span className="np-combo">
                {combo > 0 && <span className="np-mult">×{multiplier}</span>}
                {shield && <span aria-label={copy.run.shieldLabel}>🛡️</span>}
            </span>
            <span className="np-meta">{copy.common.points(points)}</span>
        </div>
    );
}
