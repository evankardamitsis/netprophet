import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useFrameCallback, useReducedMotion, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCopy } from '../i18n';
import { useStgIn } from '../lib/motion';
import { colors } from '../theme';
import { BALLS, Ball, BouncingLogo, Shade, type BallKind } from './BouncingLogo';
import { Primary } from './OnboardingControls';

/** the big lockup in the middle */
const LOGO_H = 56;
/** the balls' ground: this far above the bottom edge (over the button and its padding) */
const GROUND_ABOVE_CTA = 104;

/**
 * Each sport's ball moves like itself (founder, 14 Oct: "do something similar for better balls on the first
 * screen"): how lively the bounce is, how much grip it has on the ground, and how it gets back into play.
 * bounce: speed kept on landing; grip: speed kept along the ground each landing; kick: launch speed up, px/s.
 */
interface Sport {
  kind: BallKind;
  size: number;
  bounce: number;
  grip: number;
  kick: [number, number];
  spin: number;
  start: [number, number];
  delay: number;
}
const FLYERS: Sport[] = [
  // tennis: lively, topspin, high bounces
  { kind: BALLS[0]!, size: 34, bounce: 0.82, grip: 0.96, kick: [1450, 1800], spin: 1.6, start: [0.15, 0.1], delay: 0 },
  // padel: a touch softer than tennis
  { kind: BALLS[1]!, size: 30, bounce: 0.76, grip: 0.94, kick: [1300, 1650], spin: 1.3, start: [0.8, 0.05], delay: 350 },
  // basketball: big and heavy, a slow turn
  { kind: BALLS[2]!, size: 46, bounce: 0.7, grip: 0.9, kick: [1550, 1900], spin: 0.7, start: [0.55, 0.0], delay: 700 },
  // football: lands dead and rolls along the ground before the next kick
  { kind: BALLS[3]!, size: 40, bounce: 0.5, grip: 0.985, kick: [1300, 1650], spin: 1, start: [0.3, 0.2], delay: 1050 },
];
/** px/s² */
const GRAVITY = 2200;
/** below this upward speed a landing counts as resting */
const REST_SPEED = 140;
/** how long a ball sits before it is kicked back into play, s */
const REST_S = 0.5;
/** a touch this close to a ball's edge grabs it, px */
const GRAB_SLOP = 18;
/** a touch pushes away the balls within this distance of it, px; the push is strongest right next to the finger, px/s */
const PUSH_R = 190;
const PUSH = 1500;
/** let go slower than this and the ball pops up as if tapped; a throw never leaves faster than THROW_MAX, px/s */
const POP_BELOW = 250;
const THROW_MAX = 2100;
/** a finger moving faster than this through a ball knocks it along, px/s */
const SWAT_SPEED = 300;

/**
 * The finger on the intro (founder, 15 Oct: "make the balls responsive to touch"): where it is, how fast it moves,
 * whether it is down, a count of touches so each ball reacts once to each, and which ball it holds (-1 for none).
 */
interface Touch {
  x: SharedValue<number>;
  y: SharedValue<number>;
  vx: SharedValue<number>;
  vy: SharedValue<number>;
  down: SharedValue<number>;
  pokes: SharedValue<number>;
  held: SharedValue<number>;
}

function useTouch(): Touch {
  return {
    x: useSharedValue(0),
    y: useSharedValue(0),
    vx: useSharedValue(0),
    vy: useSharedValue(0),
    down: useSharedValue(0),
    pokes: useSharedValue(0),
    held: useSharedValue(-1),
  };
}

function tick() {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

/**
 * The first screen (founder, 12 Oct): the NetProphet lockup large in the middle with its ball hopping over the
 * net, the four sports' balls bouncing around it each in its own way (gravity, the walls and a ground above the
 * button), and «Πάμε» to begin, which opens the welcome card. The balls answer the finger: a touch pushes the
 * near ones away, a ball can be grabbed and thrown, a tap on one pops it up, a swipe through one knocks it along.
 */
export function Intro({ onStart }: { onStart: () => void }) {
  const t = useCopy();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const logo = useStgIn(700, 150);
  const cta = useStgIn(500, 700);
  const touch = useTouch();
  // the whole screen behind the logo and «Πάμε» takes the finger; the button keeps its own touches
  const finger = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      touch.x.value = e.x;
      touch.y.value = e.y;
      touch.vx.value = 0;
      touch.vy.value = 0;
      touch.down.value = 1;
      touch.pokes.value += 1;
      scheduleOnRN(tick);
    })
    .onUpdate((e) => {
      touch.x.value = e.x;
      touch.y.value = e.y;
      touch.vx.value = e.velocityX;
      touch.vy.value = e.velocityY;
    })
    .onFinalize(() => {
      touch.down.value = 0;
    });
  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <GestureDetector gesture={finger}>
        <View style={StyleSheet.absoluteFill} />
      </GestureDetector>
      {FLYERS.map((f, i) => (
        // the ground is just above «Πάμε», so the balls land on it rather than behind the button
        <Flyer key={f.kind} {...f} index={i} touch={touch} width={width} floor={height - insets.bottom - GROUND_ABOVE_CTA} />
      ))}
      <Animated.View pointerEvents="none" style={[styles.middle, logo]}>
        <BouncingLogo height={LOGO_H} />
      </Animated.View>
      <Animated.View pointerEvents="box-none" style={[styles.bottom, { paddingBottom: insets.bottom + 20 }, cta]}>
        <Primary label={t.welcome.cta} onPress={onStart} tall />
      </Animated.View>
    </View>
  );
}

function Flyer({
  kind,
  size,
  bounce,
  grip,
  kick,
  spin,
  start,
  delay,
  index,
  touch,
  width,
  floor,
}: Sport & { index: number; touch: Touch; width: number; floor: number }) {
  const reduced = useReducedMotion();
  const x = useSharedValue(start[0] * (width - size));
  const y = useSharedValue(start[1] * floor);
  const vx = useSharedValue((start[0] < 0.5 ? 1 : -1) * (180 + size * 3));
  const vy = useSharedValue(0);
  const rot = useSharedValue(0);
  const squash = useSharedValue(0);
  const rest = useSharedValue(0);
  const wait = useSharedValue(delay / 1000);
  const seen = useSharedValue(0);

  // a little physics on the UI thread: gravity, walls, the ground, a squash on every landing, a kick when it rests
  useFrameCallback((frame) => {
    const dt = Math.min((frame.timeSincePreviousFrame ?? 16) / 1000, 1 / 30);
    const right = width - size;
    const bottom = floor - size;
    const r = size / 2;
    const dx = x.value + r - touch.x.value;
    const dy = y.value + r - touch.y.value;
    const d = Math.max(1, Math.hypot(dx, dy));
    const wake = () => {
      wait.value = 0;
      rest.value = 0;
    };
    // a new touch: grab the ball under the finger, push the others near it away (and always a little up)
    if (touch.pokes.value !== seen.value) {
      seen.value = touch.pokes.value;
      if (d < r + GRAB_SLOP && touch.held.value < 0) {
        touch.held.value = index;
      } else if (d < PUSH_R) {
        const f = (1 - d / PUSH_R) * PUSH;
        vx.value += (dx / d) * f;
        vy.value += (dy / d) * f - f * 0.6;
        wake();
      }
    }
    if (touch.held.value === index) {
      if (touch.down.value) {
        // held: it follows the finger and turns with it
        const nx = Math.min(right, Math.max(0, touch.x.value - r));
        rot.value += (((nx - x.value) / r) * 180) / Math.PI;
        x.value = nx;
        y.value = Math.min(bottom, Math.max(0, touch.y.value - r));
        vx.value = touch.vx.value;
        vy.value = touch.vy.value;
        squash.value = Math.max(0, squash.value - dt * 7);
        wake();
        return;
      }
      // let go: thrown with the finger's speed, or popped up when it was just a tap
      touch.held.value = -1;
      const speed = Math.hypot(vx.value, vy.value);
      if (speed < POP_BELOW) {
        vy.value = -kick[1];
        vx.value = (Math.random() - 0.5) * 500;
      } else if (speed > THROW_MAX) {
        vx.value *= THROW_MAX / speed;
        vy.value *= THROW_MAX / speed;
      }
      squash.value = 0.5;
      wake();
    } else if (touch.down.value && d < r + GRAB_SLOP && Math.hypot(touch.vx.value, touch.vy.value) > SWAT_SPEED) {
      // a finger swiped through it: knocked along the way the finger went
      vx.value = touch.vx.value * 0.8 + (dx / d) * 200;
      vy.value = Math.min(touch.vy.value * 0.8, -400);
      squash.value = 0.4;
      wake();
    }
    if (wait.value > 0) {
      wait.value -= dt;
      return;
    }
    vy.value += GRAVITY * dt;
    x.value += vx.value * dt;
    y.value += vy.value * dt;
    if (x.value < 0) {
      x.value = 0;
      vx.value = Math.abs(vx.value) * 0.9;
    } else if (x.value > right) {
      x.value = right;
      vx.value = -Math.abs(vx.value) * 0.9;
    }
    if (y.value >= bottom) {
      y.value = bottom;
      if (vy.value > REST_SPEED) {
        squash.value = Math.min(1, vy.value / 1600);
        vy.value = -vy.value * bounce;
        vx.value *= grip;
      } else {
        vy.value = 0;
        vx.value *= Math.pow(grip, dt * 60);
        rest.value += dt;
        if (rest.value > REST_S) {
          // back into play: up and across, never straight down the same line
          rest.value = 0;
          vy.value = -(kick[0] + Math.random() * (kick[1] - kick[0]));
          const dir = x.value > right / 2 ? -1 : 1;
          vx.value = dir * (140 + Math.random() * 260);
        }
      }
    } else {
      rest.value = 0;
    }
    squash.value = Math.max(0, squash.value - dt * 7);
    // a ball rolls: its turn follows the distance it travels along the ground
    rot.value += ((vx.value * dt) / (size / 2)) * (180 / Math.PI) * spin;
  }, !reduced);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value + squash.value * size * 0.12 },
      { scaleX: 1 + 0.22 * squash.value },
      { scaleY: 1 - 0.24 * squash.value },
    ],
  }));
  const turn = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.flyer, { width: size, height: size }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, turn]}>
        <Ball kind={kind} size={size} />
      </Animated.View>
      <Shade size={size} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink, overflow: 'hidden' },
  flyer: { position: 'absolute', left: 0, top: 0 },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bottom: { paddingHorizontal: 20 },
});
