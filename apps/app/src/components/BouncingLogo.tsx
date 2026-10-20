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
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { Image } from 'expo-image';
import { colors } from '../theme';

/**
 * The «net» lockup with its ball in play: each sport's ball plays its own way (see PLAYS), then hops and lands as
 * the next sport's ball in its own colours (tennis, padel, basketball, football), a hint that more sports are coming.
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
const REST_X = 66;
const REST_Y = 26;

const REST_MS = 1600;

export type BallKind = 'tennis' | 'padel' | 'basketball' | 'football';
export const BALLS: BallKind[] = ['tennis', 'padel', 'basketball', 'football'];

/**
 * One move of a play: go to (x, up) in `ms`, `up` in logo units above the resting height, turning the ball by `spin`
 * degrees; `arc` lifts the path in the middle (a throw), `hit` squashes the ball on arrival ('floor' flattens it,
 * 'wall' narrows it), `ease` is the vertical feel ('throw' slows at the top, 'fall' speeds up into the ground).
 */
interface Move {
  x: number;
  up: number;
  ms: number;
  spin?: number;
  arc?: number;
  hit?: 'floor' | 'wall';
}

/**
 * Each sport plays the way its ball moves (founder, 14 Oct): tennis rallies back and forth over the net with topspin,
 * padel comes off an invisible side wall, basketball arcs into an invisible hoop high on the left, drops through and
 * dribbles back, football is kept up twice. Every play starts and ends at rest on the «net».
 */
const PLAYS: Record<BallKind, Move[]> = {
  tennis: [
    { x: 34, up: 0, ms: 520, arc: 20, spin: 540, hit: 'floor' },
    { x: 66, up: 0, ms: 520, arc: 20, spin: 540, hit: 'floor' },
    { x: 34, up: 0, ms: 480, arc: 16, spin: 540, hit: 'floor' },
    { x: 66, up: 0, ms: 480, arc: 16, spin: 540, hit: 'floor' },
  ],
  padel: [
    { x: 16, up: 18, ms: 420, arc: 10, spin: 360, hit: 'wall' },
    { x: 46, up: 0, ms: 380, arc: 6, spin: 300, hit: 'floor' },
    { x: 66, up: 0, ms: 420, arc: 16, spin: 240, hit: 'floor' },
  ],
  basketball: [
    { x: 30, up: 52, ms: 760, arc: 26, spin: -320 },
    { x: 28, up: 0, ms: 380, spin: -60, hit: 'floor' },
    { x: 34, up: 0, ms: 420, arc: 18, spin: -120, hit: 'floor' },
    { x: 46, up: 0, ms: 300, arc: 9, spin: -120, hit: 'floor' },
    { x: 56, up: 0, ms: 260, arc: 7, spin: -120, hit: 'floor' },
    { x: 66, up: 0, ms: 240, arc: 6, spin: -120, hit: 'floor' },
  ],
  football: [
    { x: 64, up: 0, ms: 620, arc: 30, spin: 360, hit: 'floor' },
    { x: 68, up: 0, ms: 560, arc: 24, spin: 360, hit: 'floor' },
    { x: 66, up: 0, ms: 360, arc: 8, spin: 120, hit: 'floor' },
  ],
};
/** the hop in place that turns one ball into the next (the change happens at the top) */
const SWAP: Move = { x: REST_X, up: 0, ms: 600, arc: 22, spin: 180, hit: 'floor' };
const SQUASH_MS = 140;

export function BouncingLogo({ height }: { height: number }) {
  const unit = height / VB_H;
  const reduced = useReducedMotion();
  const [kind, setKind] = useState(0);
  const x = useSharedValue(REST_X);
  const y = useSharedValue(0); // height above rest, logo units
  const arcUp = useSharedValue(0); // the throw's extra height, 0 → 1 → 0 across a move
  const arcH = useSharedValue(0);
  const rot = useSharedValue(0);
  const squashY = useSharedValue(0);
  const squashX = useSharedValue(0);

  useEffect(() => {
    if (reduced) return undefined;
    let timer: ReturnType<typeof setTimeout>;
    let k = 0;
    // where the ball is, kept on the JS side: reading shared values from JS is a synchronous call into the UI runtime
    let atUp = 0;
    let turned = 0;
    const move = (m: Move) => {
      x.value = withTiming(m.x, { duration: m.ms, easing: Easing.inOut(Easing.quad) });
      y.value = withTiming(m.up, { duration: m.ms, easing: m.up > atUp ? Easing.out(Easing.quad) : Easing.in(Easing.quad) });
      atUp = m.up;
      arcH.value = m.arc ?? 0;
      arcUp.value = 0;
      arcUp.value = withTiming(1, { duration: m.ms, easing: Easing.linear });
      turned += m.spin ?? 0;
      rot.value = withTiming(turned, { duration: m.ms, easing: Easing.linear });
      const hit = m.hit === 'wall' ? squashX : m.hit === 'floor' ? squashY : null;
      if (hit) {
        hit.value = withSequence(
          withTiming(0, { duration: m.ms }),
          withTiming(1, { duration: SQUASH_MS / 2, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: SQUASH_MS / 2, easing: Easing.in(Easing.quad) }),
        );
      }
      return m.ms + (hit ? SQUASH_MS / 2 : 0);
    };
    const run = (moves: Move[], i: number, done: () => void) => {
      if (i >= moves.length) return done();
      timer = setTimeout(() => run(moves, i + 1, done), move(moves[i]!));
    };
    const play = () => {
      run(PLAYS[BALLS[k]!], 0, () => {
        timer = setTimeout(() => {
          // the swap hop: the ball turns into the next sport at the top, where the eye least expects a cut
          const ms = move(SWAP);
          timer = setTimeout(() => {
            k = (k + 1) % BALLS.length;
            setKind(k);
            timer = setTimeout(play, ms - SWAP.ms / 2 + REST_MS);
          }, SWAP.ms / 2);
        }, REST_MS);
      });
    };
    timer = setTimeout(play, REST_MS);
    return () => clearTimeout(timer);
  }, [reduced, x, y, arcUp, arcH, rot, squashY, squashX]);

  const ballStyle = useAnimatedStyle(() => {
    // a parabola across the move: 4p(1-p) is 0 at both ends and 1 in the middle
    const lift = y.value + arcH.value * 4 * arcUp.value * (1 - arcUp.value);
    return {
      transform: [
        { translateX: (x.value - BALL_R - VB_X) * unit },
        { translateY: (REST_Y - lift - BALL_R - VB_Y) * unit + squashY.value * 2 * unit },
        { scaleX: 1 + 0.16 * squashY.value - 0.22 * squashX.value },
        { scaleY: 1 - 0.2 * squashY.value + 0.12 * squashX.value },
      ],
    };
  });
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));

  const size = BALL_R * 2 * unit;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="NetProphet" style={{ height, width: VB_W * unit, overflow: 'visible' }}>
      <Image source={LOCKUP} style={StyleSheet.absoluteFill} contentFit="contain" />
      <Animated.View style={[styles.ball, { width: size, height: size }, ballStyle]} pointerEvents="none">
        {/* the seams turn, the light stays: that is what makes it read as a round ball */}
        <Animated.View style={[StyleSheet.absoluteFill, spinStyle]}>
          <Ball kind={BALLS[kind]!} size={size} />
        </Animated.View>
        <Shade size={size} />
      </Animated.View>
    </View>
  );
}

/** light from the top left and a darker rim at the bottom right, drawn over the ball and never turning */
export function Shade({ size, strength = 1 }: { size: number; strength?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="np-ball-light" cx="35%" cy="30%" r="55%">
          <Stop offset="0" stopColor={colors.white} stopOpacity={0.55 * strength} />
          <Stop offset="1" stopColor={colors.white} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="np-ball-dark" cx="38%" cy="34%" r="70%">
          <Stop offset="0.6" stopColor={colors.ink} stopOpacity={0} />
          <Stop offset="1" stopColor={colors.ink} stopOpacity={0.45 * strength} />
        </RadialGradient>
      </Defs>
      <Circle cx={15} cy={15} r={15} fill="url(#np-ball-dark)" />
      <Circle cx={15} cy={15} r={15} fill="url(#np-ball-light)" />
    </Svg>
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
