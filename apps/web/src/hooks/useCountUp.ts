'use client';

import { useEffect, useRef, useState } from 'react';

// One frame loop, one number. Everything the celebration animates is derived
// from this single value — the big number and the running total both read it,
// so they can never drift apart across frames.
//
// With `enabled: false` (reduced motion) it lands on the target immediately and
// reports done on the next tick, so nothing waits on an animation that is not
// going to run.

export function useCountUp(
    target: number,
    {
        duration = 950,
        delay = 0,
        enabled = true,
        onTick,
        onDone,
    }: {
        duration?: number;
        delay?: number;
        enabled?: boolean;
        /** fires roughly every 110ms while counting */
        onTick?: () => void;
        onDone?: () => void;
    } = {},
): number {
    const [value, setValue] = useState(enabled ? 0 : target);

    // Kept in refs so a caller passing fresh closures each render does not
    // restart the animation.
    const tickRef = useRef(onTick);
    const doneRef = useRef(onDone);
    tickRef.current = onTick;
    doneRef.current = onDone;

    useEffect(() => {
        if (!enabled) {
            setValue(target);
            const id = window.setTimeout(() => doneRef.current?.(), 0);
            return () => window.clearTimeout(id);
        }

        let frame = 0;
        let start = 0;
        let lastTick = 0;

        const step = (now: number) => {
            if (start === 0) start = now;
            const k = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - k, 3);
            setValue(Math.round(target * eased));

            if (now - lastTick > 110) {
                lastTick = now;
                tickRef.current?.();
            }

            if (k < 1) {
                frame = requestAnimationFrame(step);
            } else {
                doneRef.current?.();
            }
        };

        const id = window.setTimeout(() => {
            frame = requestAnimationFrame(step);
        }, delay);

        return () => {
            window.clearTimeout(id);
            cancelAnimationFrame(frame);
        };
    }, [target, duration, delay, enabled]);

    return value;
}
