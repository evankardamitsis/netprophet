import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Celebration as CelebrationItem } from '@netprophet/db';
import { useCopy } from '../i18n';
import { router } from 'expo-router';
import { celebrationTitleSize, groupView, isLeague } from '../lib/celebrate';
import { useMyBaller } from '../lib/data';
import { colors, ease, fonts, motion } from '../theme';
import { Baller, type BallerHandle } from './Baller';

/**
 * A full-screen celebration (prototype V2 celOn), waiting for «Συνέχεια»: ink with a lime glow, 30 pieces of
 * confetti bursting from the middle, «ΣΕΡΙ», the lime pill counting up to the σερί, the title, the reward line and,
 * at 3.5s, the blue «Συνέχεια». Quests use the same moment without the pill (all queued quests as one); a badge shows its name and three tier dots that fill one by one. Your Baller stars in it
 * (founder, 17 Oct): it drops in, waves and jumps with your win effect.
 */
const DIM_MS = 600;
const COUNT_MS = 1100;
const BURST_MS = 1000;
const CONFETTI = [colors.lime, colors.paper, colors.lime, colors.leaf];
/** your Baller on the stage, and when it jumps */
const BALLER = 150;
const JUMPS_AT = [1100, 2300];

export function Celebration({ items, onDone }: { items: CelebrationItem[]; onDone: () => void }) {
  const t = useCopy();
  const v = groupView(items, t);
  // the month closed: «Η σεζόν σου ›» opens that month's recap (a quiet link; «Συνέχεια» stays the one blue)
  const league = items[0] && isLeague(items[0]) ? items[0].payload.month : null;
  const titleSize = celebrationTitleSize(v.title);
  const { width, height } = useWindowDimensions();
  const dim = useSharedValue(0);
  const count = useCountTo(v.streak ?? 0, COUNT_MS);
  useEffect(() => {
    dim.value = withTiming(1, { duration: DIM_MS, easing: Easing.linear });
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  }, [dim]);
  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.value }));
  const label = useMeIn(500, 500);
  const pill = useSlam(600, 800);
  const title = useSlam(600, 1000);
  const reward = useMeIn(600, 2900);
  const cta = useMeIn(500, 3500);
  const me = useMyBaller();
  const baller = useRef<BallerHandle>(null);
  useEffect(() => {
    const ids = JUMPS_AT.map((at) => setTimeout(() => baller.current?.play('jump'), at));
    return () => ids.forEach(clearTimeout);
  }, []);

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onDone}>
      <Animated.View style={[styles.screen, dimStyle]} accessibilityViewIsModal accessibilityLabel={t.celebrate.aria}>
        <Svg style={StyleSheet.absoluteFill} width={width} height={height}>
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="27%" rx="85%" ry="34%">
              <Stop offset="0" stopColor={colors.lime} stopOpacity={0.26} />
              <Stop offset="0.7" stopColor={colors.lime} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width={width} height={height} fill={colors.ink} />
          <Rect x="0" y="0" width={width} height={height} fill="url(#glow)" />
        </Svg>
        <Burst x={width / 2} y={height * 0.46} />
        <View style={styles.middle}>
          {me.look ? <Baller ref={baller} look={me.look} size={BALLER} kit={me.kit} gear={me.gear} frame={me.frame} effect={me.effect} enter="drop" /> : null}
          <Animated.Text style={[styles.label, label]}>{v.label}</Animated.Text>
          {v.streak !== null ? (
            <Animated.View style={[styles.pill, pill]}>
              <View style={styles.pillNumBox}>
                <Text style={styles.pillNum}>{count}</Text>
              </View>
              {(v.unit ?? t.celebrate.unit) ? <Text style={styles.pillUnit}>{v.unit ?? t.celebrate.unit}</Text> : null}
            </Animated.View>
          ) : null}
          <Animated.Text style={[styles.title, title, titleSize < 54 && { fontSize: titleSize, lineHeight: titleSize + 2 }]}>{v.title}</Animated.Text>
          {v.tier !== null ? (
            <View style={styles.dots} accessibilityLabel={v.reward}>
              {[0, 1, 2].map((i) => (
                <TierDot key={i} on={i < v.tier!} delay={1100 + 450 * i} />
              ))}
            </View>
          ) : null}
        </View>
        <View style={styles.bottom}>
          <Animated.Text style={[styles.reward, reward]}>{v.reward}</Animated.Text>
          <Animated.View style={cta}>
            <Pressable accessibilityRole="button" onPress={onDone} style={styles.cta}>
              <Text style={styles.ctaText}>{t.common.continue}</Text>
            </Pressable>
          </Animated.View>
          {league ? (
            <Animated.View style={cta}>
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => {
                  onDone();
                  router.push({ pathname: '/season', params: { month: league, from: 'month_end' } });
                }}
              >
                <Text style={styles.season}>{t.season.monthEnd}</Text>
              </Pressable>
            </Animated.View>
          ) : null}
        </View>
      </Animated.View>
    </Modal>
  );
}

/** a badge tier dot (prototype dotFill): the lime ring is there, the fill springs in from nothing */
function TierDot({ on, delay }: { on: boolean; delay: number }) {
  const fill = useSharedValue(0);
  useEffect(() => {
    if (on) fill.value = withDelay(delay, withSpring(1, motion.spring));
  }, [fill, on, delay]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: fill.value }] }));
  return (
    <View style={styles.dot}>
      <Animated.View style={[styles.dotFill, style]} />
    </View>
  );
}

/** the pill's number: 0 to n over 1.1s, ease-out cubic (prototype .cn data-fresh) */
function useCountTo(n: number, ms: number): number {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = Date.now();
    const step = () => {
      const q = Math.min(1, (Date.now() - t0) / ms);
      setShown(Math.round(n * (1 - Math.pow(1 - q, 3))));
      if (q < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [n, ms]);
  return shown;
}

/** meIn: up from 16px and in */
function useMeIn(ms: number, delay: number) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: ms, easing: ease }));
  }, [p, ms, delay]);
  return useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 16 }] }));
}

/** slam: from 2.4× down past 1 (0.94 at 70%) and settle */
function useSlam(ms: number, delay: number) {
  const s = useSharedValue(2.4);
  const o = useSharedValue(0);
  useEffect(() => {
    s.value = withDelay(delay, withSequence(withTiming(0.94, { duration: ms * 0.7, easing: ease }), withTiming(1, { duration: ms * 0.3, easing: ease })));
    o.value = withDelay(delay, withTiming(1, { duration: ms * 0.7, easing: ease }));
  }, [s, o, ms, delay]);
  return useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value }] }));
}

/** a stable pseudo-random in [0, 1) per piece */
const rnd = (i: number, k: number) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** prototype celParts: 14 near pieces, 16 far ones, circles, triangles and squares */
function Burst({ x, y }: { x: number; y: number }) {
  const parts = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => {
        const r1 = rnd(i, 11);
        const r2 = rnd(i, 12);
        const far = i >= 14;
        return {
          shape: (['c', 't', 'r'] as const)[i % 3]!,
          angle: i * 12 + r1 * 10,
          dist: far ? 150 + r2 * 120 : 110 + r2 * 90,
          spin: r1 * 360,
          w: 9 + Math.round(r2 * 9),
          h: 9 + Math.round(r1 * 9),
          delay: (far ? 1.1 + (i % 3) * 0.45 + r2 * 0.1 : 0.5 + r2 * 0.15) * 1000,
          color: CONFETTI[i % 4]!,
        };
      }),
    [],
  );
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {parts.map((p, i) => (
        <Piece key={i} x={x} y={y} {...p} />
      ))}
    </View>
  );
}

function Piece({ x, y, shape, angle, dist, spin, w, h, delay, color }: { x: number; y: number; shape: 'c' | 't' | 'r'; angle: number; dist: number; spin: number; w: number; h: number; delay: number; color: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: BURST_MS, easing: Easing.bezier(0.2, 0.8, 0.3, 1) }));
  }, [p, delay]);
  const style = useAnimatedStyle(() => fly(p, angle, dist, spin));
  const body =
    shape === 't'
      ? { width: 0, height: 0, borderLeftWidth: w / 2, borderRightWidth: w / 2, borderBottomWidth: h, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color }
      : { width: w, height: h, borderRadius: shape === 'c' ? 999 : 2, backgroundColor: color };
  return <Animated.View style={[{ position: 'absolute', left: x - w / 2, top: y - h / 2 }, body, style]} />;
}

function fly(p: SharedValue<number>, angle: number, dist: number, spin: number) {
  'worklet';
  const q = p.value;
  // opacity 0 → 1 by 14%, then down to 0 at the end
  const opacity = q === 0 ? 0 : q < 0.14 ? q / 0.14 : 1 - (q - 0.14) / 0.86;
  const rad = (angle * Math.PI) / 180;
  return {
    opacity,
    transform: [
      { translateX: Math.sin(rad) * dist * q },
      { translateY: -Math.cos(rad) * dist * q },
      { rotate: `${angle + spin * q}deg` },
      { scale: 0.3 + 0.7 * q },
    ],
  };
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, overflow: 'hidden' },
  middle: { alignItems: 'center', gap: 10 },
  label: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.78, color: colors.lime },
  // number and «σερί» centred in the pill (founder, 12 Oct)
  pill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 34, borderRadius: 999, backgroundColor: colors.lime },
  // the display face draws digits high in their line box; this brings the 5 to the pill's middle
  pillNum: { fontFamily: fonts.displayHeavy, fontSize: 110, lineHeight: 110, paddingBottom: 22, marginBottom: -22, color: colors.ink, includeFontPadding: false, transform: [{ translateY: 9 }] },
  pillNumBox: { height: 96, justifyContent: 'center', overflow: 'visible' },
  pillUnit: { fontFamily: fonts.bodyBold, fontSize: 28, lineHeight: 34, color: colors.ink, includeFontPadding: false },
  title: { fontFamily: fonts.displayHeavy, fontSize: 54, lineHeight: 54, paddingBottom: 11, marginBottom: -11, color: colors.paper, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 10, marginTop: 14 },
  dot: { width: 22, height: 22, borderRadius: 999, borderWidth: 3, borderColor: colors.lime },
  // covers the ring too, so no seam shows where fill and ring meet
  dotFill: { position: 'absolute', top: -3, left: -3, right: -3, bottom: -3, borderRadius: 999, backgroundColor: colors.lime },
  bottom: { alignItems: 'center', gap: 12, marginTop: 44 },
  reward: { minHeight: 24, fontFamily: fonts.bodyBold, fontSize: 17, color: colors.lime, textAlign: 'center' },
  cta: { marginTop: 18, minHeight: 52, paddingHorizontal: 44, borderRadius: 999, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.paper },
  season: { minHeight: 32, paddingTop: 6, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.mist },
});
