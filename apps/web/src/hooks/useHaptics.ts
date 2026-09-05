'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

// `navigator.vibrate` is Android/Chrome only — iOS Safari has no equivalent and
// no shim for one. So the hook reports `supported` honestly and the settings
// row says so out loud rather than offering a toggle that does nothing.
//
// If this ever ships native or through Capacitor, swap the body of `fire` for
// the platform call and every call site below keeps working unchanged.

/** The patterns, from section 6 of the porting spec. */
export const PATTERN = {
    /** any tap or nav */
    tap: 8,
    /** selecting an answer */
    select: 14,
    /** locking a prediction, banking points */
    lock: [14, 45, 22],
    correct: [16, 42, 28],
    wrong: [48, 70, 48],
    /** scratching, and the celebration count-up */
    tick: 5,
    /** streak increment, scratch cleared */
    streak: [12, 30, 12, 30, 26],
    /** a takeover landing */
    impactHuge: [24, 50, 18, 50, 34],
    impact: [18, 44, 26],
} as const;

// One flag for the whole prototype. It is read at fire time, so flipping it
// from the settings row takes effect immediately without re-rendering anything
// that only ever fires haptics.
let enabled = true;

export function setHapticsEnabled(next: boolean): void {
    enabled = next;
}

export interface Haptics {
    /** false on iOS, and anywhere else without the Vibration API */
    supported: boolean;
    tap(): void;
    select(): void;
    lock(): void;
    correct(): void;
    wrong(): void;
    tick(): void;
    streak(): void;
    impact(huge?: boolean): void;
}

export function useHaptics(): Haptics {
    // Resolved after mount so the server and the first client render agree.
    const [supported, setSupported] = useState(false);

    useEffect(() => {
        setSupported(typeof navigator !== 'undefined' && 'vibrate' in navigator);
    }, []);

    const fire = useCallback((pattern: number | readonly number[]) => {
        if (!enabled || typeof navigator === 'undefined' || !('vibrate' in navigator)) {
            return;
        }
        try {
            navigator.vibrate(pattern as number | number[]);
        } catch {
            // Some browsers throw on a pattern they dislike. Never a reason to
            // interrupt the game.
        }
    }, []);

    return useMemo(() => ({
        supported,
        tap: () => fire(PATTERN.tap),
        select: () => fire(PATTERN.select),
        lock: () => fire(PATTERN.lock),
        correct: () => fire(PATTERN.correct),
        wrong: () => fire(PATTERN.wrong),
        tick: () => fire(PATTERN.tick),
        streak: () => fire(PATTERN.streak),
        impact: (huge?: boolean) =>
            fire(huge ? PATTERN.impactHuge : PATTERN.impact),
    }), [supported, fire]);
}
