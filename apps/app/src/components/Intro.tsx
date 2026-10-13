import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCopy } from '../i18n';
import { useStgIn } from '../lib/motion';
import { colors } from '../theme';
import { BALLS, Ball, BouncingLogo, type BallKind } from './BouncingLogo';
import { Primary } from './OnboardingControls';

/** the big lockup in the middle */
const LOGO_H = 56;

/** the four sports' balls bouncing around the screen: size, speed across and up/down (ms per wall), phase */
const FLYERS: { kind: BallKind; size: number; xMs: number; yMs: number; delay: number }[] = [
  { kind: BALLS[0]!, size: 34, xMs: 5200, yMs: 3700, delay: 0 },
  { kind: BALLS[1]!, size: 28, xMs: 6100, yMs: 4300, delay: 400 },
  { kind: BALLS[2]!, size: 38, xMs: 4700, yMs: 5100, delay: 800 },
  { kind: BALLS[3]!, size: 32, xMs: 6800, yMs: 3300, delay: 1200 },
];

/**
 * The first screen (founder, 12 Oct): the NetProphet lockup large in the middle with its ball hopping over the
 * net, the four sports' balls bouncing off the edges around it, and «Πάμε» to begin, which opens the welcome card.
 */
export function Intro({ onStart }: { onStart: () => void }) {
  const t = useCopy();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const logo = useStgIn(700, 150);
  const cta = useStgIn(500, 700);
  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      {FLYERS.map((f, i) => (
        <Flyer key={i} {...f} width={width} height={height} index={i} />
      ))}
      <Animated.View style={[styles.middle, logo]}>
        <BouncingLogo height={LOGO_H} />
      </Animated.View>
      <Animated.View style={[styles.bottom, { paddingBottom: insets.bottom + 20 }, cta]}>
        <Primary label={t.welcome.cta} onPress={onStart} tall />
      </Animated.View>
    </View>
  );
}

function Flyer({ kind, size, xMs, yMs, delay, width, height, index }: { kind: BallKind; size: number; xMs: number; yMs: number; delay: number; width: number; height: number; index: number }) {
  const reduced = useReducedMotion();
  const x = useSharedValue(index % 2 === 0 ? 0 : 1);
  const y = useSharedValue(index < 2 ? 0 : 1);
  const spin = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    // straight lines that bounce off each wall, like a ball on a table seen from above
    x.value = withDelay(delay, withRepeat(withTiming(x.value === 0 ? 1 : 0, { duration: xMs, easing: Easing.linear }), -1, true));
    y.value = withDelay(delay, withRepeat(withTiming(y.value === 0 ? 1 : 0, { duration: yMs, easing: Easing.linear }), -1, true));
    spin.value = withRepeat(withTiming(1, { duration: xMs * 1.5, easing: Easing.linear }), -1, false);
  }, [reduced, x, y, spin, xMs, yMs, delay]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value * (width - size) }, { translateY: y.value * (height - size) }, { rotate: `${spin.value * 360}deg` }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.flyer, { width: size, height: size }, style]}>
      <Ball kind={kind} size={size} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink, overflow: 'hidden' },
  flyer: { position: 'absolute', left: 0, top: 0, opacity: 0.9 },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bottom: { paddingHorizontal: 20 },
});
