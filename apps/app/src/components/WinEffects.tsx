import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors, cosmetics } from '../theme';
import type { SoundName } from '../lib/sound';
import { Confetti } from './Avatar';

/**
 * The win effects (Πανηγυρισμός; founder, 17 Oct: "more cheers that actually do stuff"): each one is a moment that
 * plays round Baller when it jumps on a right call, in the dressing room and in celebrations. All of them run in
 * about a second and a half and leave nothing behind. `still` draws one frame of it for the dressing room's tiles.
 */
export const WIN_EFFECTS = ['fx_confetti', 'fx_fireworks', 'fx_balls', 'fx_trophy', 'fx_fire', 'fx_flash'] as const;

/** the sound each one makes, over Baller's own cheer */
export const EFFECT_SOUND: Record<string, SoundName | undefined> = {
  fx_fireworks: 'boom',
  fx_balls: 'bounce',
  fx_trophy: 'fanfare',
  fx_fire: 'whoosh',
  fx_flash: 'applause',
};

/** drawn behind Baller rather than in front */
export const EFFECT_BEHIND = new Set(['fx_fire', 'fx_fireworks']);

const fx = cosmetics.effects;

export function WinEffect({ effect, size, still = false }: { effect: string; size: number; still?: boolean }) {
  switch (effect) {
    case 'fx_confetti':
      return <Confetti size={size} />;
    case 'fx_fireworks':
      return <Fireworks size={size} still={still} />;
    case 'fx_balls':
      return <BallRain size={size} still={still} />;
    case 'fx_trophy':
      return <Trophy size={size} still={still} />;
    case 'fx_fire':
      return <Fire size={size} still={still} />;
    case 'fx_flash':
      return <Flashes size={size} still={still} />;
    default:
      return null;
  }
}

/** a clock from 0 to 1 over `ms`, after `delay`; held at `at` when still */
function useClock(ms: number, delay: number, still: boolean, at = 0.55, easing = Easing.out(Easing.cubic)) {
  const t = useSharedValue(still ? at : 0);
  useEffect(() => {
    if (still) return;
    t.value = withDelay(delay, withTiming(1, { duration: ms, easing }));
  }, [t, ms, delay, still, easing]);
  return t;
}

// ── Fireworks: three rockets climb behind Baller and burst into sparks ─────────────────────────────────────────

const BURSTS = [
  { x: 0.18, y: -0.12, delay: 0, colour: 0 },
  { x: 0.82, y: -0.2, delay: 260, colour: 1 },
  { x: 0.5, y: -0.42, delay: 520, colour: 2 },
];
const SPARKS = 14;

function Fireworks({ size, still }: { size: number; still: boolean }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {BURSTS.map((b, i) => (
        <Burst key={i} b={b} size={size} still={still} />
      ))}
    </View>
  );
}

function Burst({ b, size, still }: { b: (typeof BURSTS)[number]; size: number; still: boolean }) {
  const climb = useClock(380, b.delay, still, 1, Easing.out(Easing.quad));
  const pop = useClock(1000, b.delay + 380, still, 0.5);
  const colour = fx.fireworks[b.colour % fx.fireworks.length]!;
  const cx = b.x * size;
  const cy = b.y * size;
  const trail = useAnimatedStyle(() => ({
    opacity: climb.value < 1 ? 0.9 : 0,
    transform: [{ translateY: (1 - climb.value) * (size - cy) }],
  }));
  const flash = useAnimatedStyle(() => ({
    opacity: pop.value > 0 && pop.value < 0.25 ? 1 - pop.value * 4 : 0,
    transform: [{ scale: 0.5 + pop.value * 3 }],
  }));
  const r = size * 0.04;
  return (
    <>
      <Animated.View style={[{ position: 'absolute', left: cx - 1.5, top: cy, width: 3, height: size * 0.12, borderRadius: 2, backgroundColor: fx.spark }, trail]} />
      <Animated.View style={[{ position: 'absolute', left: cx - r, top: cy - r, width: r * 2, height: r * 2, borderRadius: r, backgroundColor: colors.white }, flash]} />
      {Array.from({ length: SPARKS }, (_, i) => (
        <Spark key={i} angle={(i / SPARKS) * Math.PI * 2} cx={cx} cy={cy} reach={size * (0.26 + (i % 3) * 0.05)} colour={i % 4 === 0 ? fx.spark : colour} t={pop} />
      ))}
    </>
  );
}

function Spark({ angle, cx, cy, reach, colour, t }: { angle: number; cx: number; cy: number; reach: number; colour: string; t: SharedValue<number> }) {
  const len = reach * 0.22;
  const style = useAnimatedStyle(() => {
    const d = reach * t.value;
    // sparks fall a little as they fade
    const fall = reach * 0.35 * t.value * t.value;
    return {
      opacity: t.value <= 0 ? 0 : 1 - t.value,
      transform: [
        { translateX: Math.cos(angle) * d },
        { translateY: Math.sin(angle) * d + fall },
        { rotate: `${(angle * 180) / Math.PI}deg` },
        { scaleX: 0.3 + (1 - t.value) * 0.7 },
      ],
    };
  });
  return <Animated.View style={[{ position: 'absolute', left: cx - len / 2, top: cy - 1.5, width: len, height: 3, borderRadius: 2, backgroundColor: colour }, style]} />;
}

// ── Ball rain: tennis balls drop from above, bounce on the court and roll off ─────────────────────────────────

const DROPS = [0.08, 0.3, 0.55, 0.78, 0.94, 0.2, 0.66, 0.42].map((x, i) => ({ x, delay: i * 90, size: 0.1 + (i % 3) * 0.02, drift: (i % 2 ? 1 : -1) * (0.08 + (i % 3) * 0.04) }));

function BallRain({ size, still }: { size: number; still: boolean }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {DROPS.map((d, i) => (
        <Drop key={i} d={d} size={size} still={still} />
      ))}
    </View>
  );
}

function Drop({ d, size, still }: { d: (typeof DROPS)[number]; size: number; still: boolean }) {
  const t = useClock(1200, d.delay, still, 0.45, Easing.linear);
  const b = d.size * size;
  const floor = size - b;
  const style = useAnimatedStyle(() => {
    // falls from above the box (0 to .4), bounces up to a third of the height (.4 to .7), lands and fades
    const v = t.value;
    let y: number;
    if (v < 0.4) y = -size * 0.6 + (floor + size * 0.6) * (v / 0.4) ** 2;
    else {
      const u = (v - 0.4) / 0.6;
      const hop = Math.sin(Math.min(1, u / 0.6) * Math.PI) * size * 0.32 + (u > 0.6 ? Math.sin(((u - 0.6) / 0.4) * Math.PI) * size * 0.08 : 0);
      y = floor - hop;
    }
    return {
      opacity: v <= 0 ? 0 : v > 0.85 ? (1 - v) / 0.15 : 1,
      transform: [{ translateX: d.drift * size * v }, { translateY: y }, { rotate: `${v * 540}deg` }],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: d.x * size - b / 2, top: 0, width: b, height: b }, style]}>
      <TennisBall size={b} />
    </Animated.View>
  );
}

function TennisBall({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Defs>
        <RadialGradient id="tb" cx="35%" cy="30%" r="75%">
          <Stop offset="0" stopColor={colors.white} stopOpacity={0.6} />
          <Stop offset="0.45" stopColor={colors.white} stopOpacity={0} />
          <Stop offset="1" stopColor={colors.ink} stopOpacity={0.3} />
        </RadialGradient>
      </Defs>
      <Path d="M10 1 a9 9 0 1 0 0.01 0 Z" fill={fx.tennisBall} />
      <Path d="M3 4 C8 8 8 12 3 16 M17 4 C12 8 12 12 17 16" stroke={colors.white} strokeWidth={1.4} fill="none" />
      <Path d="M10 1 a9 9 0 1 0 0.01 0 Z" fill="url(#tb)" />
    </Svg>
  );
}

// ── Trophy: a gold cup rises over Baller's head and shines ────────────────────────────────────────────────────

function Trophy({ size, still }: { size: number; still: boolean }) {
  const t = useClock(1500, 120, still, 0.4, Easing.linear);
  const cup = size * 0.42;
  const cupStyle = useAnimatedStyle(() => {
    const v = t.value;
    const up = Math.min(1, v / 0.25);
    return {
      opacity: v <= 0 ? 0 : v > 0.85 ? (1 - v) / 0.15 : 1,
      transform: [{ translateY: (1 - Easing.out(Easing.back(2))(up)) * size * 0.3 }, { scale: 0.6 + 0.4 * up }, { rotate: `${Math.sin(v * Math.PI * 4) * 4}deg` }],
    };
  });
  const rays = useAnimatedStyle(() => ({
    opacity: t.value <= 0.1 ? 0 : Math.min(0.9, (t.value - 0.1) * 4) * (t.value > 0.85 ? (1 - t.value) / 0.15 : 1),
    transform: [{ rotate: `${t.value * 120}deg` }, { scale: 0.8 + t.value * 0.4 }],
  }));
  const ray = size * 0.9;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[{ position: 'absolute', left: size / 2 - ray / 2, top: -cup * 0.75 - ray / 2 + cup / 2, width: ray, height: ray }, rays]}>
        <Svg width={ray} height={ray} viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id="ry" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={fx.gold} stopOpacity={0.7} />
              <Stop offset="1" stopColor={fx.gold} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          {Array.from({ length: 10 }, (_, i) => (
            <Path key={i} d="M50 50 L46 0 L54 0 Z" fill="url(#ry)" transform={`rotate(${i * 36} 50 50)`} />
          ))}
        </Svg>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: size / 2 - cup / 2, top: -cup * 0.75, width: cup, height: cup }, cupStyle]}>
        <Cup size={cup} />
      </Animated.View>
    </View>
  );
}

function Cup({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="gd" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={fx.goldDark} />
          <Stop offset="0.3" stopColor={fx.goldLight} />
          <Stop offset="0.55" stopColor={fx.gold} />
          <Stop offset="1" stopColor={fx.goldDark} />
        </LinearGradient>
      </Defs>
      {/* handles, bowl, stem, base */}
      <Path d="M26 22 C6 22 8 50 34 52 M74 22 C94 22 92 50 66 52" stroke={fx.goldDark} strokeWidth={6} fill="none" />
      <Path d="M24 14 L76 14 C76 46 66 60 50 62 C34 60 24 46 24 14 Z" fill="url(#gd)" />
      <Path d="M32 18 C33 36 38 48 46 54" stroke={colors.white} strokeOpacity={0.6} strokeWidth={4} strokeLinecap="round" fill="none" />
      <Rect x={44} y={60} width={12} height={14} fill="url(#gd)" />
      <Rect x={32} y={74} width={36} height={8} rx={2} fill="url(#gd)" />
      <Rect x={28} y={82} width={44} height={8} rx={2} fill={fx.goldDark} />
    </Svg>
  );
}

// ── Fire: Baller lands in flames that flicker up round it, embers rising ───────────────────────────────────────

const FLAMES = [-0.46, -0.3, -0.12, 0.12, 0.3, 0.46].map((x, i) => ({ x, h: 0.6 + (i % 3) * 0.14, delay: (i % 3) * 60 }));
const EMBERS = Array.from({ length: 10 }, (_, i) => ({ x: ((i * 37) % 70) / 100 - 0.35, delay: 200 + i * 70 }));

function Fire({ size, still }: { size: number; still: boolean }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {FLAMES.map((f, i) => (
        <Flame key={i} f={f} size={size} still={still} />
      ))}
      {EMBERS.map((e, i) => (
        <Ember key={i} e={e} size={size} still={still} />
      ))}
    </View>
  );
}

function Flame({ f, size, still }: { f: (typeof FLAMES)[number]; size: number; still: boolean }) {
  const t = useClock(1400, f.delay, still, 0.4, Easing.linear);
  const w = size * 0.2;
  const h = size * f.h;
  const style = useAnimatedStyle(() => {
    const v = t.value;
    const grow = Math.min(1, v / 0.15);
    const flicker = 0.85 + Math.sin(v * 40 + f.x * 10) * 0.15;
    return {
      opacity: v <= 0 ? 0 : v > 0.75 ? (1 - v) / 0.25 : 0.95,
      transform: [{ translateY: h * (1 - grow * flicker) * 0.5 }, { scaleY: grow * flicker }, { scaleX: 0.9 + (1 - flicker) }],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: size / 2 + f.x * size - w / 2, top: size - h, width: w, height: h }, style]}>
      <Svg width={w} height={h} viewBox="0 0 20 40">
        <Defs>
          <LinearGradient id="fl" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor={fx.fireCore} />
            <Stop offset="0.45" stopColor={fx.fire} />
            <Stop offset="1" stopColor={fx.fireTip} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d="M10 0 C14 10 20 18 20 28 C20 35 15 40 10 40 C5 40 0 35 0 28 C0 18 6 10 10 0 Z" fill="url(#fl)" />
      </Svg>
    </Animated.View>
  );
}

function Ember({ e, size, still }: { e: (typeof EMBERS)[number]; size: number; still: boolean }) {
  const t = useClock(900, e.delay, still, 0.5, Easing.out(Easing.quad));
  const r = Math.max(2, size * 0.018);
  const style = useAnimatedStyle(() => ({
    opacity: t.value <= 0 ? 0 : 1 - t.value,
    transform: [{ translateY: -t.value * size * 0.8 }, { translateX: Math.sin(t.value * 6 + e.x * 9) * size * 0.04 }],
  }));
  return <Animated.View style={[{ position: 'absolute', left: size / 2 + e.x * size, top: size * 0.85, width: r, height: r, borderRadius: r, backgroundColor: fx.fireCore }, style]} />;
}

// ── Flashes: the photographers go off all round, one after another ─────────────────────────────────────────────

const FLASHES = [
  [0.05, 0.15],
  [0.9, 0.1],
  [0.15, 0.7],
  [0.85, 0.62],
  [0.5, -0.12],
  [0.02, 0.45],
  [0.98, 0.38],
  [0.32, -0.05],
  [0.7, -0.02],
].map(([x, y], i) => ({ x: x!, y: y!, delay: i * 110 }));

function Flashes({ size, still }: { size: number; still: boolean }) {
  const glow = useClock(1400, 0, still, 0.2, Easing.linear);
  const wash = useAnimatedStyle(() => ({ opacity: glow.value <= 0 ? 0 : Math.max(0, Math.sin(glow.value * Math.PI * 9)) * 0.12 * (1 - glow.value) }));
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[{ position: 'absolute', left: -size * 0.2, top: -size * 0.2, width: size * 1.4, height: size * 1.4, borderRadius: size, backgroundColor: colors.white }, wash]} />
      {FLASHES.map((f, i) => (
        <Flash key={i} f={f} size={size} still={still} i={i} />
      ))}
    </View>
  );
}

function Flash({ f, size, still, i }: { f: (typeof FLASHES)[number]; size: number; still: boolean; i: number }) {
  // in the still tile every other one is caught mid-flash
  const t = useClock(380, f.delay, still, i % 2 ? 0.25 : 1, Easing.out(Easing.quad));
  const s = size * 0.26;
  const style = useAnimatedStyle(() => ({
    opacity: t.value <= 0 || t.value >= 1 ? 0 : 1 - t.value,
    transform: [{ scale: 0.3 + t.value * 1.1 }, { rotate: `${t.value * 40}deg` }],
  }));
  return (
    <Animated.View style={[{ position: 'absolute', left: f.x * size - s / 2, top: f.y * size - s / 2, width: s, height: s }, style]}>
      <Svg width={s} height={s} viewBox="0 0 40 40">
        <Defs>
          <RadialGradient id="fh" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colors.white} stopOpacity={1} />
            <Stop offset="0.3" stopColor={colors.white} stopOpacity={0.6} />
            <Stop offset="1" stopColor={colors.white} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Path d="M20 0 L22 18 L40 20 L22 22 L20 40 L18 22 L0 20 L18 18 Z" fill={colors.white} />
        <Rect x={4} y={4} width={32} height={32} rx={16} fill="url(#fh)" />
      </Svg>
    </Animated.View>
  );
}
