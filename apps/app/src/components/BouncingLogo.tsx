import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { Image } from 'expo-image';
import { colors } from '../theme';

/**
 * The «net» lockup with its ball in play: every few seconds the ball hops over the net and lands as
 * another sport's ball in its own colours (tennis, padel, basketball, football), a hint that more sports are coming.
 * The lockup without its ball is brand/logo/lockup-on-ink-tight-noball.svg; the ball is drawn here.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const LOCKUP = require('../../assets/logo-on-ink-noball.svg');

/** lockup viewBox "8 11 426.4 80": logo units, the ball sits at (66, 26) with radius 15 */
const VB_X = 8;
const VB_Y = 11;
const VB_W = 426.4;
const VB_H = 80;
const BALL_R = 15;
const REST_Y = 26;
/** the two sides of the net (it spans x 8..92) */
const SIDE_X = [66, 34] as const;
/** how high the hop goes above the resting height */
const HOP_UP = 22;

const REST_MS = 1800;
const HOP_MS = 700;
const SQUASH_MS = 140;

export type BallKind = 'tennis' | 'padel' | 'basketball' | 'football';
export const BALLS: BallKind[] = ['tennis', 'padel', 'basketball', 'football'];

export function BouncingLogo({ height }: { height: number }) {
  const unit = height / VB_H;
  const reduced = useReducedMotion();
  const [kind, setKind] = useState(0);
  const side = useSharedValue(0); // 0 right, 1 left, animated between
  const lift = useSharedValue(0); // 0 resting, 1 at the top of the hop
  const squash = useSharedValue(0);

  useEffect(() => {
    if (reduced) return undefined;
    let hop = 0;
    let timer: ReturnType<typeof setTimeout>;
    const play = () => {
      hop += 1;
      const to = hop % 2;
      side.value = withTiming(to, { duration: HOP_MS, easing: Easing.inOut(Easing.quad) });
      lift.value = withSequence(
        withTiming(1, { duration: HOP_MS / 2, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: HOP_MS / 2, easing: Easing.in(Easing.quad) }),
      );
      squash.value = withSequence(
        withTiming(0, { duration: HOP_MS }),
        withTiming(1, { duration: SQUASH_MS / 2, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: SQUASH_MS / 2, easing: Easing.in(Easing.quad) }),
      );
      // the ball changes sport at the top of the hop, where the eye least expects a cut
      timer = setTimeout(() => {
        setKind((k) => (k + 1) % BALLS.length);
        timer = setTimeout(play, HOP_MS / 2 + REST_MS);
      }, HOP_MS / 2);
    };
    timer = setTimeout(play, REST_MS);
    return () => clearTimeout(timer);
  }, [reduced, side, lift, squash]);

  const ballStyle = useAnimatedStyle(() => {
    const x = SIDE_X[0] + (SIDE_X[1] - SIDE_X[0]) * side.value;
    const y = REST_Y - HOP_UP * lift.value;
    return {
      transform: [
        { translateX: (x - BALL_R - VB_X) * unit },
        { translateY: (y - BALL_R - VB_Y) * unit + squash.value * 2 * unit },
        { scaleX: 1 + 0.14 * squash.value },
        { scaleY: 1 - 0.18 * squash.value },
      ],
    };
  });

  const size = BALL_R * 2 * unit;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="NetProphet" style={{ height, width: VB_W * unit }}>
      <Image source={LOCKUP} style={StyleSheet.absoluteFill} contentFit="contain" />
      <Animated.View style={[styles.ball, { width: size, height: size }, ballStyle]} pointerEvents="none">
        <Ball kind={BALLS[kind]!} size={size} />
      </Animated.View>
    </View>
  );
}

/** Four balls in their own colours, drawn on a 30×30 box. */
export function Ball({ kind, size }: { kind: BallKind; size: number }) {
  const seam = { fill: 'none', strokeWidth: 2.2, strokeLinecap: 'round' as const };
  const line = { fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30">
      {kind === 'tennis' || kind === 'padel' ? (
        <>
          <Circle cx={15} cy={15} r={15} fill={kind === 'tennis' ? colors.lime : colors.padelBall} />
          <Path d="M4 6 C 11 11, 11 19, 4 24" stroke={colors.paper} {...seam} />
          <Path d="M26 6 C 19 11, 19 19, 26 24" stroke={colors.paper} {...seam} />
        </>
      ) : null}
      {kind === 'basketball' ? (
        <>
          <Circle cx={15} cy={15} r={15} fill={colors.basketBall} />
          <Path d="M15 0 V30" stroke={colors.ink} {...line} />
          <Path d="M0 15 H30" stroke={colors.ink} {...line} />
          <Path d="M5 3.5 C 11 9, 11 21, 5 26.5" stroke={colors.ink} {...line} />
          <Path d="M25 3.5 C 19 9, 19 21, 25 26.5" stroke={colors.ink} {...line} />
        </>
      ) : null}
      {kind === 'football' ? (
        <>
          <Circle cx={15} cy={15} r={15} fill={colors.paper} />
          {['M15.0 9.8 L15.0 0.0', 'M19.9 13.4 L29.3 10.4', 'M18.1 19.2 L23.8 27.1', 'M11.9 19.2 L6.2 27.1', 'M10.1 13.4 L0.7 10.4'].map((d) => (
            <Path key={d} d={d} stroke={colors.ink} {...line} />
          ))}
          <Path d="M15.0 9.8 L19.9 13.4 L18.1 19.2 L11.9 19.2 L10.1 13.4 Z" fill={colors.ink} />
        </>
      ) : null}
    </Svg>
  );
}


const styles = StyleSheet.create({
  ball: { position: 'absolute', left: 0, top: 0 },
});
