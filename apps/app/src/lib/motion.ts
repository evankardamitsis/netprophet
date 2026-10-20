import { useEffect, useMemo, useRef, useState } from 'react';
import {
  cubicBezier,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type CSSAnimationTimingFunction,
  type SharedValue,
} from 'react-native-reanimated';
import type { ViewStyle } from 'react-native';
import { bezier, springBezier, springEase } from '../theme';

/**
 * The prototype's shared motions (V2.dc.html), so every screen moves the same way.
 * button:active   scale .94, 180ms on --spring
 * pop             scale .4 → 1.18 (60%) → 1, fading in
 * jpop            scale .9 → 1.14 (35%) → .98 (65%) → 1
 * stg             rise 14px from scale .985 while fading in (list items, staggered)
 * slam            scale 2.4 → .94 (70%) → 1, fading in (tags that land)
 * rise            fade in from 40px below (profile lines)
 * grow            width 0 → full (dividers)
 */
export const PRESS_SCALE = 0.94;
export const PRESS_MS = 180;

export function usePress(scaleTo = PRESS_SCALE) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return {
    style,
    onPressIn: () => {
      scale.value = withTiming(scaleTo, { duration: PRESS_MS, easing: springEase });
    },
    onPressOut: () => {
      scale.value = withTiming(1, { duration: PRESS_MS, easing: springEase });
    },
  };
}


/** CSS `pop` (prototype): the animation's timing function applies to every keyframe segment, so all use the spring. */
export function runPop(scale: SharedValue<number>, opacity: SharedValue<number>, durationMs: number, delayMs = 0) {
  scale.value = 0.4;
  opacity.value = 0;
  scale.value = withDelay(
    delayMs,
    withSequence(
      withTiming(1.18, { duration: durationMs * 0.6, easing: springEase }),
      withTiming(1, { duration: durationMs * 0.4, easing: springEase }),
    ),
  );
  opacity.value = withDelay(delayMs, withTiming(1, { duration: durationMs * 0.6, easing: springEase }));
}

export function runJpop(scale: SharedValue<number>, durationMs: number) {
  scale.value = 0.9;
  scale.value = withSequence(
    withTiming(1.14, { duration: durationMs * 0.35, easing: springEase }),
    withTiming(0.98, { duration: durationMs * 0.3, easing: springEase }),
    withTiming(1, { duration: durationMs * 0.35, easing: springEase }),
  );
}

/*
 * Mount entrances are Reanimated CSS animations (20 Oct): keyframes run natively from the style itself, with no shared
 * value to hand between threads. Shared-value entrances started in an effect froze part-way on some cold launches in
 * Expo Go on iOS 27 (cards stuck at a third of their opacity, chips stuck small), and Reanimated kept re-applying the
 * frozen value over a plain fallback style. Fill mode `backwards` shows the first keyframe during the delay; after the
 * animation the element's own style (the final state) applies. Every timing function applies per keyframe segment,
 * as in the prototype's CSS.
 */
const EASE_CSS = cubicBezier(...bezier);
const SPRING_CSS = cubicBezier(...springBezier);

/** keyframes of plain view props (opacity, transform), so the style fits a View, a Text or an Image */
type Keyframes = Record<string, Pick<ViewStyle, 'opacity' | 'transform'>>;
/** one timing function (the CSS types also allow a list, one per animation) */
type Timing = Exclude<CSSAnimationTimingFunction, readonly unknown[]>;
/** a single entrance, typed narrow enough for any Animated style prop */
export type EntranceStyle = {
  animationName: Keyframes;
  animationDuration: number;
  animationDelay: number;
  animationFillMode: 'backwards';
  animationTimingFunction: Timing;
};


type NoEntrance = Record<string, never>;
const NO_ENTRANCE: NoEntrance = {};

/** A memoised CSS entrance style: `keyframes` over `durationMs` after `delayMs`. */
export function useEntrance(
  keyframes: Keyframes,
  durationMs: number,
  delayMs = 0,
  timing: Timing = EASE_CSS,
): EntranceStyle | NoEntrance {
  // the system's reduce motion: no entrance, the element's own (final) style at once, as withTiming did
  const reduced = useReducedMotion();
  return useMemo(
    () =>
      reduced
        ? NO_ENTRANCE
        : {
            animationName: keyframes,
            animationDuration: durationMs,
            animationDelay: delayMs,
            animationFillMode: 'backwards',
            animationTimingFunction: timing,
          },
    [reduced, keyframes, durationMs, delayMs, timing],
  );
}

const POP: Keyframes = {
  '0%': { opacity: 0, transform: [{ scale: 0.4 }] },
  '60%': { opacity: 1, transform: [{ scale: 1.18 }] },
  '100%': { opacity: 1, transform: [{ scale: 1 }] },
};

const STG: Keyframes = {
  from: { opacity: 0, transform: [{ translateY: 14 }, { scale: 0.985 }] },
  to: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
};

const SLAM: Keyframes = {
  '0%': { opacity: 0, transform: [{ scale: 2.4 }] },
  '70%': { opacity: 1, transform: [{ scale: 0.94 }] },
  '100%': { opacity: 1, transform: [{ scale: 1 }] },
};

const GROW: Keyframes = {
  from: { transform: [{ scaleX: 0 }] },
  to: { transform: [{ scaleX: 1 }] },
};

/** fade in from `dy` px below, one keyframes object per distance */
const fadeUp = new Map<number, Keyframes>();
function fadeUpFrom(dy: number): Keyframes {
  let k = fadeUp.get(dy);
  if (!k) {
    k = { from: { opacity: 0, transform: [{ translateY: dy }] }, to: { opacity: 1, transform: [{ translateY: 0 }] } };
    fadeUp.set(dy, k);
  }
  return k;
}

/** `pop` once on mount (after `delayMs`), like the prototype's `animation: pop … backwards`, every segment on --spring. */
export function usePopIn(durationMs: number, delayMs = 0) {
  return useEntrance(POP, durationMs, delayMs, SPRING_CSS);
}

/** `stg` once on mount: fade in, rise 14px, scale .985 → 1, on --ease (prototype .45s, staggered by delay). */
export function useStgIn(durationMs: number, delayMs = 0) {
  return useEntrance(STG, durationMs, delayMs);
}

/** `slam` once on mount: from 2.4× and invisible to .94 at 70%, settling at 1, every segment on --ease. */
export function useSlamIn(durationMs: number, delayMs = 0) {
  return useEntrance(SLAM, durationMs, delayMs);
}

/** `inA` / `meIn`: fade in from `dy` px below on --ease (titles 12px, the celebration's lines 16px). */
export function useFadeUpIn(durationMs: number, delayMs = 0, dy = 12) {
  return useEntrance(fadeUpFrom(dy), durationMs, delayMs);
}

/** `rise` once on mount: fade in from 40px below, on --ease. */
export function useRiseIn(durationMs: number, delayMs = 0) {
  return useFadeUpIn(durationMs, delayMs, 40);
}

/**
 * `grow` once on mount: 0 → full width, on --ease. Drawn as scaleX from the left edge (the element keeps its full
 * width), so the end state is the element's own layout.
 */
export function useGrowIn(durationMs: number, delayMs = 0) {
  const entrance = useEntrance(GROW, durationMs, delayMs);
  return useMemo(() => ({ ...entrance, transformOrigin: 'left' }) as const, [entrance]);
}

/** `pop` whenever `value` changes after the first render (header numbers). */
export function usePopOnChange(value: unknown, durationMs: number) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    runPop(scale, opacity, durationMs);
  }, [value, scale, opacity, durationMs]);
  return useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
}

/** Count a number up or down over 800ms, ease-out cubic (prototype `.rvn`). The first value shows as is. */
export function useCountUp(value: number | undefined, durationMs = 800): number | undefined {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (value === undefined || from.current === undefined || from.current === value) {
      from.current = value;
      setShown(value);
      return undefined;
    }
    const start = from.current;
    const t0 = Date.now();
    let raf = 0;
    const step = () => {
      const q = Math.min(1, (Date.now() - t0) / durationMs);
      const e = 1 - Math.pow(1 - q, 3);
      setShown(Math.round(start + (value - start) * e));
      if (q < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value, durationMs]);
  return shown;
}

/** «5», or «9-3»: each number in the text counts up from 0 over `ms` after `delay` (ease-out cubic) */
export function useCountFromZero(value: string, ms: number, delay: number): string {
  const [q, setQ] = useState(0);
  useEffect(() => {
    let raf = 0;
    let t0 = 0;
    const step = () => {
      const p = Math.min(1, (Date.now() - t0) / ms);
      setQ(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    const id = setTimeout(() => {
      t0 = Date.now();
      raf = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(id);
      cancelAnimationFrame(raf);
    };
  }, [value, ms, delay]);
  return value.replace(/\d+/g, (n) => String(Math.round(Number(n) * q)));
}
