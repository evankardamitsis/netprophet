import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { AvatarLook } from '../lib/avatar';
import { nextPoke } from '../lib/baller';
import { playSound } from '../lib/sound';
import { LEVEL_UP } from '../lib/levelUp';
import { alpha, colors, motion } from '../theme';
import { BallArt, type Mouth } from './Avatar';
import { EFFECT_BEHIND, EFFECT_SOUND, WinEffect } from './WinEffects';

/**
 * Baller (founder, 17 Oct: "we need this Baller figure to be our trademark"): the one living ball person. It bobs,
 * blinks and looks around on its own, and plays named moves on cue: `ref.current.play('jump')`. Every move has its
 * haptic. With `pokeable` it answers a touch: a tap squashes it, five quick taps make it dizzy, a long press makes it
 * jump. Lists keep the still `Avatar`; Baller is for the places where it is the star.
 */
export type BallerMove = 'jump' | 'spin' | 'squash' | 'sigh' | 'wave' | 'dizzy' | 'drop' | 'hop' | 'levelUp';

/**
 * «Ανέβηκες level!» has its own move (founder, 18 Oct: "the level up should have a different baller animation"): a
 * crouch, then Baller grows and spins up twice inside a lime glow ring, comes down, lands with a bounce and does a
 * little victory hop. Lime because a level is earned. Used only for a new level; timing in lib/levelUp.
 */
const { crouch: LU_CROUCH, rise: LU_RISE, fall: LU_FALL, land: LU_LAND, hopAt: LU_HOP_AT } = LEVEL_UP;

export interface BallerHandle {
  play: (move: BallerMove) => void;
}

interface Props {
  look: AvatarLook;
  size: number;
  kit?: string;
  gear?: string | null;
  frame?: string | null;
  bg?: string | null;
  /** the win effect worn: it plays round Baller on every jump */
  effect?: string | null;
  /** a new number plays a jump (for screens that count celebrations) */
  jump?: number;
  /** answer touches: tap, quick taps, long press */
  pokeable?: boolean;
  /** told after each poke, with the move it played */
  onPoke?: (move: BallerMove) => void;
  /** the first thing it does when it appears */
  enter?: BallerMove | null;
  /** its face at rest: a smile, or a little sad on an empty screen */
  mood?: Mouth;
  /** drag it and let go: it flies back and lands with a squash */
  throwable?: boolean;
}

function buzz(kind: 'light' | 'medium' | 'soft' | 'rigid' | 'success' | 'select') {
  if (Platform.OS === 'web') return;
  const run =
    kind === 'success'
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      : kind === 'select'
        ? Haptics.selectionAsync()
        : Haptics.impactAsync(
            kind === 'light'
              ? Haptics.ImpactFeedbackStyle.Light
              : kind === 'medium'
                ? Haptics.ImpactFeedbackStyle.Medium
                : kind === 'soft'
                  ? Haptics.ImpactFeedbackStyle.Soft
                  : Haptics.ImpactFeedbackStyle.Rigid,
          );
  run.catch(() => undefined);
}

export const Baller = forwardRef<BallerHandle, Props>(function Baller(
  { look, size, kit, gear = null, frame = null, bg = null, effect = null, jump = 0, pokeable = false, onPoke, enter = null, mood = 'smile', throwable = false },
  ref,
) {
  const reduced = useReducedMotion();
  // idle
  const bob = useSharedValue(0);
  const open = useSharedValue(1);
  const glance = useSharedValue(0);
  // moves
  const lift = useSharedValue(0);
  const sx = useSharedValue(1);
  const sy = useSharedValue(1);
  const tilt = useSharedValue(0);
  const turn = useSharedValue(0);
  // level up: Baller grows, and the lime ring behind it (two waves) opens and fades
  const grow = useSharedValue(1);
  const ring = useSharedValue(0);
  const ring2 = useSharedValue(0);
  const [glow, setGlow] = useState(0);
  const [raised, setRaised] = useState(false);
  const [mouth, setMouth] = useState<Mouth>(mood);
  // a throw: where the finger took it
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const [dizzy, setDizzy] = useState(false);
  const [burst, setBurst] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const taps = useRef<number[]>([]);

  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (reduced) return;
    bob.value = withRepeat(withTiming(1, { duration: 800, easing: Easing.inOut(Easing.sin) }), -1, true);
    open.value = withRepeat(withSequence(withDelay(3200, withTiming(0.08, { duration: 70 })), withTiming(1, { duration: 90 })), -1);
    glance.value = withRepeat(
      withSequence(withDelay(1400, withTiming(1, { duration: 260 })), withDelay(900, withTiming(-1, { duration: 360 })), withDelay(800, withTiming(0, { duration: 260 }))),
      -1,
    );
  }, [reduced, bob, open, glance]);

  /** a squash and stretch: x and y move against each other */
  const squish = useCallback(
    (steps: [number, number][]) => {
      sy.value = withSequence(...steps.map(([v, ms]) => withTiming(v, { duration: ms, easing: Easing.out(Easing.quad) })));
      sx.value = withSequence(...steps.map(([v, ms]) => withTiming(2 - v, { duration: ms, easing: Easing.out(Easing.quad) })));
    },
    [sx, sy],
  );

  /** the racket up for a while (pairs of [at ms, up]) */
  const swing = useCallback(
    (steps: [number, boolean][]) => {
      steps.forEach(([at, up]) => later(at, () => setRaised(up)));
    },
    [later],
  );

  const face = useCallback(
    (m: Mouth, ms: number) => {
      setMouth(m);
      later(ms, () => setMouth(mood));
    },
    [later, mood],
  );

  const play = useCallback(
    (move: BallerMove) => {
      if (reduced) {
        buzz(move === 'jump' ? 'success' : 'light');
        return;
      }
      const out = Easing.out(Easing.quad);
      switch (move) {
        case 'jump':
          face('open', 950);
          buzz('medium');
          playSound('cheer');
          squish([[0.84, 90], [1.12, 170], [0.88, 330], [1, 220]]);
          lift.value = withSequence(withTiming(size * 0.38, { duration: 260, easing: out }), withTiming(0, { duration: 330, easing: Easing.in(Easing.quad) }), withTiming(size * 0.06, { duration: 120, easing: out }), withTiming(0, { duration: 140 }));
          tilt.value = withSequence(withTiming(-8, { duration: 260 }), withTiming(0, { duration: 420 }));
          swing([[60, true], [760, false]]);
          if (effect) {
            setBurst((b) => b + 1);
            const sound = EFFECT_SOUND[effect];
            if (sound) later(120, () => playSound(sound));
          }
          later(590, () => buzz('success'));
          break;
        case 'hop':
          buzz('light');
          playSound('pop');
          lift.value = withSequence(withTiming(size * 0.12, { duration: 140, easing: out }), withTiming(0, { duration: 220, easing: Easing.bounce }));
          break;
        case 'spin':
          buzz('select');
          turn.value = withSequence(withTiming(360, { duration: 620, easing: Easing.out(Easing.cubic) }), withTiming(0, { duration: 0 }));
          squish([[0.92, 310], [1, 310]]);
          break;
        case 'squash':
          face('open', 380);
          buzz('light');
          playSound('squeak');
          squish([[0.74, 90], [1.08, 150], [0.97, 120], [1, 120]]);
          break;
        case 'sigh':
          face('sad', 1500);
          buzz('soft');
          playSound('aw');
          lift.value = withSequence(withTiming(-size * 0.06, { duration: 380, easing: out }), withTiming(0, { duration: 620, easing: Easing.inOut(Easing.sin) }));
          squish([[0.9, 380], [1, 620]]);
          break;
        case 'wave':
          buzz('light');
          swing([[0, true], [200, false], [400, true], [700, false]]);
          break;
        case 'dizzy':
          setDizzy(true);
          face('open', 1500);
          buzz('rigid');
          playSound('squeak');
          tilt.value = withSequence(withRepeat(withSequence(withTiming(12, { duration: 120 }), withTiming(-12, { duration: 120 })), 5), withTiming(0, { duration: 160 }));
          later(1500, () => setDizzy(false));
          break;
        case 'drop':
          // falls in from above the frame, lands with a squash, bounces once and waves
          lift.value = size * 2.2;
          lift.value = withSequence(
            withTiming(0, { duration: 420, easing: Easing.in(Easing.quad) }),
            withTiming(size * 0.16, { duration: 200, easing: out }),
            withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }),
          );
          sy.value = withSequence(withTiming(1.08, { duration: 420 }), withTiming(0.78, { duration: 80 }), withTiming(1.06, { duration: 160 }), withTiming(1, { duration: 180 }));
          sx.value = withSequence(withTiming(0.94, { duration: 420 }), withTiming(1.22, { duration: 80 }), withTiming(0.96, { duration: 160 }), withTiming(1, { duration: 180 }));
          later(420, () => {
            buzz('medium');
            playSound('pop');
          });
          swing([[900, true], [1100, false], [1300, true], [1600, false]]);
          break;
        case 'levelUp': {
          // crouch, then up: a quarter bigger, two turns, the lime ring opening behind; down, a bounce, a hop
          face('open', LU_LAND + 400);
          buzz('medium');
          setGlow((g) => g + 1);
          squish([[0.8, LU_CROUCH], [1.1, Math.round(LU_RISE * 0.3)], [1, Math.round(LU_RISE * 0.7)], [1, LU_FALL], [0.76, 90], [1.1, 160], [0.97, 140], [1, 160]]);
          grow.value = withSequence(
            withTiming(1, { duration: LU_CROUCH }),
            withTiming(1.25, { duration: LU_RISE, easing: Easing.out(Easing.cubic) }),
            withTiming(1, { duration: LU_FALL, easing: Easing.in(Easing.quad) }),
          );
          lift.value = withSequence(
            withTiming(-size * 0.04, { duration: LU_CROUCH, easing: out }),
            withTiming(size * 0.55, { duration: LU_RISE, easing: Easing.out(Easing.cubic) }),
            withTiming(0, { duration: LU_FALL, easing: Easing.in(Easing.quad) }),
            withTiming(size * 0.1, { duration: 150, easing: out }),
            withTiming(0, { duration: 170, easing: Easing.in(Easing.quad) }),
            // the victory hop
            withDelay(LU_HOP_AT - LU_LAND - 320, withTiming(size * 0.18, { duration: 170, easing: out })),
            withTiming(0, { duration: 280, easing: Easing.bounce }),
          );
          turn.value = withSequence(
            withDelay(LU_CROUCH, withTiming(720, { duration: LU_RISE + LU_FALL, easing: Easing.inOut(Easing.cubic) })),
            withTiming(0, { duration: 0 }),
          );
          ring.value = 0;
          ring2.value = 0;
          ring.value = withDelay(LU_CROUCH, withTiming(1, { duration: LU_RISE + LU_FALL, easing: Easing.out(Easing.cubic) }));
          ring2.value = withDelay(LU_CROUCH + motion.stagger * 4, withTiming(1, { duration: LU_RISE + LU_FALL, easing: Easing.out(Easing.cubic) }));
          later(LU_CROUCH, () => playSound('whoosh'));
          later(LU_LAND, () => {
            buzz('success');
            playSound('cheer');
            if (effect) setBurst((b) => b + 1);
          });
          swing([[LU_LAND, true], [LU_HOP_AT + 300, false]]);
          later(LU_HOP_AT, () => {
            buzz('light');
            playSound('pop');
          });
          break;
        }
      }
    },
    [reduced, face, squish, swing, size, effect, later, lift, tilt, turn, sx, sy, grow, ring, ring2],
  );

  useImperativeHandle(ref, () => ({ play }), [play]);

  useEffect(() => {
    if (jump) play('jump');
    // a new count is the cue; the play function itself may change with the look
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump]);

  useEffect(() => {
    if (enter) play(enter);
    // only on first appearance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => {
    const up = bob.value * 0.045 * size + lift.value;
    const breathe = 1 - (1 - bob.value) * 0.03;
    return {
      transform: [
        { perspective: 600 },
        { translateX: dx.value },
        { translateY: -up + dy.value },
        { rotateY: `${turn.value}deg` },
        { rotate: `${tilt.value}deg` },
        { scaleX: sx.value * (2 - breathe) * grow.value },
        { scaleY: sy.value * breathe * grow.value },
      ],
    };
  });
  // the level-up ring: opens from Baller's size to twice it and fades; the glow disc under it swells and goes
  const ringStyle = useAnimatedStyle(() => ({ opacity: ring.value === 0 ? 0 : 1 - ring.value, transform: [{ scale: 0.7 + 1.3 * ring.value }] }));
  const ring2Style = useAnimatedStyle(() => ({ opacity: ring2.value === 0 ? 0 : 0.8 * (1 - ring2.value), transform: [{ scale: 0.7 + 1.1 * ring2.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: Math.sin(ring.value * Math.PI) * 0.9, transform: [{ scale: 0.9 + 0.5 * ring.value }] }));
  const ringBase = { position: 'absolute' as const, width: size, height: size, borderRadius: size };

  const poke = () => {
    const r = nextPoke(taps.current, Date.now());
    taps.current = r.taps;
    const move: BallerMove = r.move;
    play(move);
    onPoke?.(move);
  };

  // a throw: Baller follows the finger, then springs back home and lands with a squash
  const fling = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => throwable && Math.abs(g.dx) + Math.abs(g.dy) > 8,
        onPanResponderGrant: () => face('open', 900),
        onPanResponderMove: (_, g) => {
          dx.value = g.dx;
          dy.value = g.dy;
        },
        onPanResponderRelease: (_, g) => {
          const spring = { damping: 7, stiffness: 140, mass: 0.8, velocity: 0 };
          dx.value = withSpring(0, { ...spring, velocity: g.vx * 1000 });
          dy.value = withSpring(0, { ...spring, velocity: g.vy * 1000 });
          later(260, () => play('squash'));
        },
        onPanResponderTerminate: () => {
          dx.value = withSpring(0);
          dy.value = withSpring(0);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [throwable, play],
  );

  const art = (
    <View {...(throwable ? fling.panHandlers : {})}>
      {glow > 0 ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.ringBox]}>
          <Animated.View style={[ringBase, { backgroundColor: alpha(colors.lime, 0.22) }, glowStyle]} />
          <Animated.View style={[ringBase, { borderWidth: Math.max(3, size * 0.045), borderColor: colors.lime }, ringStyle]} />
          <Animated.View style={[ringBase, { borderWidth: Math.max(2, size * 0.025), borderColor: colors.lime }, ring2Style]} />
        </View>
      ) : null}
      {burst > 0 && effect && EFFECT_BEHIND.has(effect) ? <WinEffect key={`b${burst}`} effect={effect} size={size} /> : null}
      <Animated.View style={style}>
        <BallArt look={look} size={size} kit={kit} gear={gear} frame={frame} bg={bg} mouth={mouth} dizzy={dizzy} raised={raised} eyes={{ open, look: glance }} />
      </Animated.View>
      {burst > 0 && effect && !EFFECT_BEHIND.has(effect) ? <WinEffect key={burst} effect={effect} size={size} /> : null}
    </View>
  );
  if (!pokeable) return art;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Baller"
      onPress={poke}
      onLongPress={() => {
        play('jump');
        onPoke?.('jump');
      }}
      delayLongPress={380}
    >
      {art}
    </Pressable>
  );
});

const styles = StyleSheet.create({ ringBox: { alignItems: 'center', justifyContent: 'center' } });
