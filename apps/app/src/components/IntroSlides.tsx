import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, type DimensionValue } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { POINTS } from '@netprophet/core';
import { useCopy } from '../i18n';
import { useGrowIn, usePopIn, useRiseIn, useStgIn } from '../lib/motion';
import { GO_MS, INTRO, introNumber, type IntroSlide } from '../lib/onboarding';
import { fmt } from '../lib/votes';
import { alpha, colors, fonts } from '../theme';
import { Back, Primary } from './OnboardingControls';

/**
 * The prototype's intro slides E1 to E4 («1 από 4»): a pill, a title, a line, and an ink card that
 * shows the idea with sample data, built up with stg, grow and pop. The last one's «Έτοιμος» opens
 * the «Ας ξεκινήσουμε» splash.
 */
const STG_MS = 450;
const GROW_MS = 900;
const POP_MS = 400;
/** 52px titles: the padding, cancelled by a margin, keeps the tonos on iOS */
const ACCENT_PAD = 10;

export function IntroSlideView({ slide, onNext, onBack }: { slide: IntroSlide; onNext: () => void; onBack: () => void }) {
  const t = useCopy();
  const x = t.onboarding.intro;
  const n = introNumber(slide);
  const copy = { e1: x.vote, e2: x.know, e3: x.points, e4: x.matches }[slide];
  return (
    <View style={styles.slide}>
      <View style={styles.pill}>
        <Text style={styles.pillText}>{fmt(x.of, { n, total: INTRO.length })}</Text>
      </View>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.sub}>{copy.sub}</Text>
      <View style={styles.card}>
        {slide === 'e1' ? <VoteCard /> : null}
        {slide === 'e2' ? <TraitsCard /> : null}
        {slide === 'e3' ? <PointsCard /> : null}
        {slide === 'e4' ? <MatchesCard /> : null}
      </View>
      <Primary label={slide === 'e4' ? x.ready : t.onboarding.next} onPress={onNext} tall />
      <Back label={t.onboarding.back} onPress={onBack} />
    </View>
  );
}

/* ---------- E1: vote ---------- */

function VoteCard() {
  const v = useCopy().onboarding.intro.vote;
  return (
    <>
      <Text style={styles.meta}>{v.when}</Text>
      <View style={styles.pair}>
        <Side first={v.a.first} surname={v.a.surname} pct={58} chosen index={0} />
        <Side first={v.b.first} surname={v.b.surname} pct={42} chosen={false} index={1} />
      </View>
      <Text style={styles.meta}>{v.foot}</Text>
    </>
  );
}

function Side({ first, surname, pct, chosen, index }: { first: string; surname: string; pct: number; chosen: boolean; index: number }) {
  const enter = useStgIn(STG_MS, 200 + index * 100);
  const pop = usePopIn(POP_MS, 1300 + index * 100);
  return (
    <Animated.View style={[styles.side, { borderColor: chosen ? colors.lime : 'transparent' }, enter]}>
      <Fill width={`${pct}%`} delay={700 + index * 100} />
      <Animated.Text style={[styles.pct, pop]}>{`${pct}%`}</Animated.Text>
      <Text style={styles.first} numberOfLines={1}>
        {first}
      </Text>
      <Text style={styles.surname} numberOfLines={1}>
        {surname}
      </Text>
    </Animated.View>
  );
}

/* ---------- E2: traits ---------- */

function TraitsCard() {
  const k = useCopy().onboarding.intro.know;
  const max = Math.max(...k.traits.map((r) => r.n)) + 1;
  return (
    <>
      <Text style={styles.meta}>{k.who}</Text>
      {k.traits.map((r, i) => (
        <Bar key={r.name} name={r.name} value={r.n} width={`${Math.round((r.n / max) * 100)}%`} stg={200 + i * 100} grow={600 + i * 100} />
      ))}
      <Text style={styles.meta}>{k.foot}</Text>
    </>
  );
}

/* ---------- E3: points, streak, Κατάταξη ---------- */

function PointsCard() {
  const p = useCopy().onboarding.intro.points;
  const top = p.rows[0]?.n ?? 1;
  return (
    <>
      <View style={styles.pointsRow}>
        <View style={styles.pointsCol}>
          <Text style={styles.meta}>{p.correct}</Text>
          <BigPoints value={POINTS.CORRECT_VOTE} delay={300} />
        </View>
        <View style={[styles.pointsCol, styles.end]}>
          <Text style={styles.meta}>{p.upset}</Text>
          <BigPoints value={POINTS.UPSET_CALL} delay={450} />
        </View>
      </View>
      <View style={styles.rule} />
      <View style={styles.streakRow}>
        <Text style={[styles.meta, styles.shrink]}>{p.streak}</Text>
        <View style={styles.dots}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Dot key={i} delay={500 + i * 120} />
          ))}
        </View>
      </View>
      <View style={styles.rule} />
      {p.rows.map((r, i) => (
        <Bar key={r.name} name={r.name} value={r.n} width={`${Math.round((r.n / top) * 100)}%`} stg={700 + i * 100} grow={1100 + i * 100} />
      ))}
      <Text style={styles.meta}>{p.foot}</Text>
    </>
  );
}

function BigPoints({ value, delay }: { value: number; delay: number }) {
  const pop = usePopIn(POP_MS + 50, delay);
  return <Animated.Text style={[styles.big, pop]}>{`+${value}`}</Animated.Text>;
}

function Dot({ delay }: { delay: number }) {
  const pop = usePopIn(POP_MS, delay);
  return <Animated.View style={[styles.dot, pop]} />;
}

/* ---------- E4: your matches, your level ---------- */

function MatchesCard() {
  const m = useCopy().onboarding.intro.matches;
  const enter = useStgIn(STG_MS, 200);
  return (
    <>
      <Animated.View style={[styles.match, enter]}>
        <Text style={styles.meta}>{m.when}</Text>
        <Text style={styles.matchLine}>{m.line}</Text>
        <Text style={styles.score}>{m.score}</Text>
      </Animated.View>
      <Text style={styles.meta}>{m.help}</Text>
      <View style={styles.rule} />
      <Text style={styles.levelLine}>{m.level}</Text>
      <View style={styles.levelBars}>
        {[0, 1, 2].map((i) => (
          <LevelBar key={i} delay={700 + i * 200} />
        ))}
      </View>
      <Text style={styles.meta}>{m.levelHelp}</Text>
    </>
  );
}

function LevelBar({ delay }: { delay: number }) {
  const pop = usePopIn(POP_MS, delay);
  return <Animated.View style={[styles.levelBar, pop]} />;
}

/* ---------- shared pieces ---------- */

/** a lime wash that grows from the left to `width` of its row */
function Fill({ width, delay, round }: { width: DimensionValue; delay: number; round?: boolean }) {
  const grow = useGrowIn(GROW_MS, delay);
  return (
    <View pointerEvents="none" style={[styles.fillBox, { width }]}>
      <Animated.View style={[styles.fill, round && styles.fillRound, grow]} />
    </View>
  );
}

function Bar({ name, value, width, stg, grow }: { name: string; value: number; width: DimensionValue; stg: number; grow: number }) {
  const enter = useStgIn(STG_MS, stg);
  return (
    <Animated.View style={[styles.bar, enter]}>
      <Fill width={width} delay={grow} round />
      <Text style={styles.barName} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.barValue}>{value}</Text>
    </Animated.View>
  );
}

/* ---------- «Ας ξεκινήσουμε» ---------- */

/** the ink splash after «Έτοιμος»: a beating lime dot, the line, and a bar that fills over GO_MS */
export function GoSplash({ onDone }: { onDone: () => void }) {
  const g = useCopy().onboarding.intro.go;
  const insets = useSafeAreaInsets();
  const fade = useSharedValue(0);
  const beat = useSharedValue(1);
  const rise = useRiseIn(700, 200);
  const bar = useSharedValue(0);

  useEffect(() => {
    fade.value = withTiming(1, { duration: 400, easing: Easing.ease });
    beat.value = withRepeat(
      withSequence(withTiming(1.5, { duration: 500, easing: Easing.inOut(Easing.ease) }), withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) })),
      -1,
    );
    bar.value = withDelay(200, withTiming(1, { duration: GO_MS - 400, easing: Easing.linear }));
    const id = setTimeout(onDone, GO_MS);
    return () => clearTimeout(id);
  }, [fade, beat, bar, onDone]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const beatStyle = useAnimatedStyle(() => ({ transform: [{ scale: beat.value }] }));
  const barStyle = useAnimatedStyle(() => ({ width: `${bar.value * 100}%` }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.go, fadeStyle]}>
      <StatusBar style="light" />
      <Pressable accessibilityRole="button" accessibilityLabel={`${g.a} ${g.b}`} onPress={onDone} style={[styles.goHit, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Animated.View style={[styles.goDot, beatStyle]} />
        <Animated.Text style={[styles.goText, rise]}>
          {`${g.a} `}
          <Text style={{ color: colors.lime }}>{g.b}</Text>
        </Animated.Text>
        <View style={styles.goTrack}>
          <Animated.View style={[styles.goFill, barStyle]} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  slide: { flexGrow: 1, gap: 12 },
  pill: { alignSelf: 'flex-start', minHeight: 26, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.ink, justifyContent: 'center' },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.lime },
  title: {
    fontFamily: fonts.displayHeavy,
    fontSize: 52,
    lineHeight: 48,
    color: colors.ink,
    paddingTop: ACCENT_PAD,
    marginTop: -ACCENT_PAD,
  },
  sub: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20.25, color: colors.inkSoft },
  card: { flexGrow: 1, minHeight: 260, padding: 18, borderRadius: 26, backgroundColor: colors.ink, justifyContent: 'center', gap: 10 },
  meta: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 18, color: colors.mist },
  shrink: { flexShrink: 1 },
  pair: { flexDirection: 'row', gap: 8 },
  side: { flex: 1, overflow: 'hidden', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 16, borderWidth: 2, backgroundColor: colors.inkRaised, gap: 2 },
  pct: { fontFamily: fonts.displayHeavy, fontSize: 22, lineHeight: 24, color: colors.lime, alignSelf: 'flex-start' },
  first: { fontFamily: fonts.displayHeavy, fontSize: 28, lineHeight: 30, color: colors.paper },
  surname: { fontFamily: fonts.display, fontSize: 19, lineHeight: 21, color: colors.paper },
  fillBox: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  fill: { height: '100%', backgroundColor: alpha(colors.lime, 0.28) },
  fillRound: { borderRadius: 12 },
  bar: { minHeight: 44, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.inkRaised, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  barName: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.paper },
  barValue: { fontFamily: fonts.displayHeavy, fontSize: 24, lineHeight: 26, color: colors.lime },
  pointsRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 },
  pointsCol: { gap: 2 },
  end: { alignItems: 'flex-end' },
  big: { fontFamily: fonts.displayHeavy, fontSize: 64, lineHeight: 64, color: colors.lime },
  rule: { height: 1, backgroundColor: colors.inkLine },
  streakRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 16, height: 16, borderRadius: 999, backgroundColor: colors.lime },
  match: { padding: 14, borderRadius: 16, backgroundColor: colors.inkRaised, gap: 4 },
  matchLine: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 31, color: colors.paper },
  score: { fontFamily: fonts.displayHeavy, fontSize: 34, lineHeight: 34, color: colors.lime },
  levelLine: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 31, color: colors.paper },
  levelBars: { flexDirection: 'row', gap: 6 },
  levelBar: { flex: 1, height: 10, borderRadius: 999, backgroundColor: colors.lime },
  go: { zIndex: 10, backgroundColor: colors.ink },
  goHit: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: 20 },
  goDot: { width: 14, height: 14, borderRadius: 999, backgroundColor: colors.lime },
  goText: { fontFamily: fonts.displayHeavy, fontSize: 76, lineHeight: 68, color: colors.paper, textAlign: 'center', paddingTop: ACCENT_PAD, marginTop: -ACCENT_PAD },
  goTrack: { width: 120, height: 6, borderRadius: 999, backgroundColor: colors.inkRaised, overflow: 'hidden' },
  goFill: { height: '100%', borderRadius: 999, backgroundColor: colors.lime },
});
