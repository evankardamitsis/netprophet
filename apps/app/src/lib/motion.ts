import { useEffect, useRef } from 'react';
import {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { ease, springEase } from '../theme';

/**
 * The prototype's shared motions (V2.dc.html), so every screen moves the same way.
 * button:active   scale .94, 180ms on --spring
 * pop             scale .4 → 1.18 (60%) → 1, fading in
 * jpop            scale .9 → 1.14 (35%) → .98 (65%) → 1
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

export function runPop(scale: SharedValue<number>, opacity: SharedValue<number>, durationMs: number, delayMs = 0) {
  scale.value = 0.4;
  opacity.value = 0;
  scale.value = withDelay(
    delayMs,
    withSequence(
      withTiming(1.18, { duration: durationMs * 0.6, easing: springEase }),
      withTiming(1, { duration: durationMs * 0.4, easing: ease }),
    ),
  );
  opacity.value = withDelay(delayMs, withTiming(1, { duration: durationMs * 0.6 }));
}

export function runJpop(scale: SharedValue<number>, durationMs: number) {
  scale.value = 0.9;
  scale.value = withSequence(
    withTiming(1.14, { duration: durationMs * 0.35, easing: springEase }),
    withTiming(0.98, { duration: durationMs * 0.3, easing: ease }),
    withTiming(1, { duration: durationMs * 0.35, easing: ease }),
  );
}

/** `pop` once on mount (after `delayMs`), like the prototype's `animation: pop … backwards`. */
export function usePopIn(durationMs: number, delayMs = 0) {
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0);
  useEffect(() => {
    runPop(scale, opacity, durationMs, delayMs);
  }, [scale, opacity, durationMs, delayMs]);
  return useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
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
