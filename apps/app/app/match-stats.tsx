import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { greekCaps, nameGender } from '@netprophet/copy';
import type { MatchStatsPeriod } from '@netprophet/db';
import { KudosCloud } from '../src/components/KudosCloud';
import { MyTraits } from '../src/components/MyTraits';
import { RecentMatches } from '../src/components/RecentMatches';
import { StatBlockCard } from '../src/components/StatBlocks';
import { useCopy } from '../src/i18n';
import { track } from '../src/lib/analytics';
import { useMatchStats, useMePage, useMyKudos, useMyTraits, useWinLoss } from '../src/lib/data';
import {
  FORMATS,
  formatLabel,
  formSquares,
  lockedTitles,
  matchStatsView,
  PERIODS,
  periodFold,
  periodLabel,
  pickFormat,
  type StatsFormat,
  type StatsHero,
} from '../src/lib/matchStats';
import { useCountFromZero, useFadeUpIn, usePopIn, usePress, useStgIn } from '../src/lib/motion';
import { useUnlocks } from '../src/lib/unlocks';
import { colors, fonts, motion, text } from '../src/theme';

/**
 * «Τα στατιστικά σου» (founder, 18 Oct 2026; rebuilt 20 Oct as a Pro feature, in detail, pro player like).
 * Your real matches only. On top, the format toggle with its counts (opening on the one you play most) and the period
 * folded into one quiet «Όλα ↓». Then the player card on ink: the record, the win rate, the form squares and, with
 * Pro, the wins in a row. Then each block in its own form: bars for sets and games, tiles for the pressure moments,
 * tinted bars per surface, pips per round, two halves for tournaments and friendlies, a column chart for the year,
 * people with their records, the best wins on ink and the tournaments list. A block with nothing to show is left out.
 * Without Pro the card shows and the rest is a teaser with the block titles and the screen's one blue.
 * σερί, votes and points are on «Οι προβλέψεις σου».
 */
export default function MatchStatsScreen() {
  const t = useCopy();
  const s = t.matchStats;
  const params = useLocalSearchParams<{ from?: string }>();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<MatchStatsPeriod>('all');
  const [periodOpen, setPeriodOpen] = useState(false);
  const [chosen, setChosen] = useState<StatsFormat | null>(null);
  const { stats, loading, error, refresh } = useMatchStats(period);
  const me = useMePage();
  const kudos = useMyKudos();
  const myTraits = useMyTraits();
  const { has } = useUnlocks();
  const back = usePress();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/me'));

  // open once on the format played most; a later period change never flips the player's choice
  useEffect(() => {
    if (stats && chosen === null) setChosen(pickFormat(stats));
  }, [stats, chosen]);
  const format: StatsFormat = chosen ?? 'singles';
  const view = useMemo(() => (stats ? matchStatsView(stats, format, t) : null), [stats, format, t]);
  const from = stats?.from ?? null;
  const form = useMemo(() => (me.view ? formSquares(me.view.last, format, from) : []), [me.view, format, from]);

  const seen = useRef(false);
  useEffect(() => {
    if (!stats || seen.current) return;
    seen.current = true;
    track('match_stats_viewed', { pro: stats.pro, from: params.from ?? 'direct' });
  }, [stats, params.from]);

  // a key per filter, so the numbers rise and count again when the filter changes
  const run = `${period}-${format}`;
  let i = 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading && stats !== null} onRefresh={refresh} tintColor={colors.ink} />}
      >
        <Pressable accessibilityRole="button" onPress={close} onPressIn={back.onPressIn} onPressOut={back.onPressOut} hitSlop={10} style={styles.backHit}>
          <Animated.Text style={[styles.back, back.style]}>‹ {t.common.back}</Animated.Text>
        </Pressable>
        <View style={styles.head}>
          <Text style={styles.title}>{s.title}</Text>
          <Text style={styles.sub}>{s.sub}</Text>
        </View>
        {stats && chosen ? (
          <View style={styles.controls}>
            <View style={styles.segment} accessibilityRole="tablist">
              {FORMATS.map((f) => (
                <Segment key={f} label={formatLabel(stats, f, t)} on={f === format} onPress={() => setChosen(f)} />
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: periodOpen }}
              onPress={() => setPeriodOpen((o) => !o)}
              hitSlop={8}
              style={styles.foldHit}
            >
              <Text style={styles.fold}>{periodFold(period, periodOpen, t)}</Text>
            </Pressable>
          </View>
        ) : null}
        {periodOpen ? (
          <PeriodChips
            value={period}
            onChange={(p) => {
              setPeriod(p);
              setPeriodOpen(false);
            }}
          />
        ) : null}
        {loading && !stats ? <ActivityIndicator color={colors.ink} style={styles.loading} /> : null}
        {error && !stats ? <Text style={styles.note}>{s.error}</Text> : null}
        {view && chosen ? (
          <View key={run} style={styles.body}>
            <Hero hero={view.hero} form={form} />
            {view.noPlayer ? <Text style={styles.note}>{s.noPlayer}</Text> : view.empty ? <Text style={styles.note}>{s.empty}</Text> : null}
            {view.blocks.map((b) => (
              <StatBlockCard key={b.key} block={b} i={i++} />
            ))}
            {view.locked ? <Teaser format={format} i={i++} /> : null}
            {view.pro && !view.noPlayer ? <WinLossSection i={i++} /> : null}
          </View>
        ) : null}
        {me.view && !me.view.isNew ? <RecentMatches v={me.view} /> : null}
        {me.view && kudos && has('kudos') ? <KudosCloud list={kudos} gender={nameGender(me.view.first)} /> : null}
        {/* the teaser is this screen's one Pro door (one blue), so the traits' own Pro link stays off */}
        {me.view && myTraits ? <MyTraits data={myTraits} first={me.view.first} proOpen={false} /> : null}
      </ScrollView>
    </View>
  );
}

/** one half of the format toggle: the chosen one in ink (never blue: the one blue is the Pro button) */
function Segment({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const press = usePress(0.96);
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={styles.segHit}>
      <Animated.View style={[styles.seg, on && styles.segOn, press.style]}>
        <Text style={[styles.segText, on && styles.segTextOn]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/** the three periods, shown only after a tap on «Όλα ↓» */
function PeriodChips({ value, onChange }: { value: MatchStatsPeriod; onChange: (p: MatchStatsPeriod) => void }) {
  const t = useCopy();
  const enter = useFadeUpIn(motion.revealDur / 2, 0, 8);
  return (
    <Animated.View style={[styles.chips, enter]} accessibilityRole="tablist">
      {PERIODS.map((p) => (
        <Chip key={p} label={periodLabel(p, t)} on={p === value} onPress={() => onChange(p)} />
      ))}
    </Animated.View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const press = usePress(0.95);
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={styles.chipHit}>
      <Animated.View style={[styles.chip, on && styles.chipOn, press.style]}>
        <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/** a number that counts up from 0 as it lands */
function Count({ value, delay, style }: { value: string; delay: number; style: object | object[] }) {
  const shown = useCountFromZero(value, motion.revealDur, delay);
  return <Text style={style}>{shown}</Text>;
}

/** the player card on ink: record, rate, form, runs */
function Hero({ hero, form }: { hero: StatsHero; form: boolean[] }) {
  const t = useCopy();
  const s = t.matchStats;
  const enter = useStgIn(motion.revealDur, motion.stagger);
  const d = motion.stagger * 2;
  return (
    <Animated.View style={[styles.hero, enter]}>
      <View style={styles.heroTop}>
        <Text style={styles.heroKicker}>{greekCaps(hero.format)}</Text>
        <Text style={styles.heroKicker}>{hero.played}</Text>
      </View>
      <View style={styles.heroMain}>
        <View style={styles.record}>
          <Count value={String(hero.won)} delay={d} style={[styles.recordNum, { color: hero.won > 0 ? colors.lime : colors.paper }]} />
          <Text style={[styles.recordNum, styles.recordDash]}>-</Text>
          <Count value={String(hero.lost)} delay={d} style={styles.recordNum} />
        </View>
        <View style={styles.rate}>
          <Count value={hero.pct} delay={d + motion.stagger} style={[styles.rateNum, { color: hero.pctEarned ? colors.lime : colors.paper }]} />
          <Text style={styles.heroLabel}>{s.hero.pct}</Text>
        </View>
      </View>
      {form.length > 0 ? (
        <View style={styles.heroLine}>
          <Text style={styles.heroLabel}>{greekCaps(s.hero.form)}</Text>
          <View style={styles.form}>
            {form.map((win, k) => (
              <FormSquare key={k} win={win} delay={d + motion.stagger * (k + 2)} />
            ))}
          </View>
        </View>
      ) : null}
      {hero.runs ? (
        <View style={styles.runs}>
          <View style={styles.run}>
            <Count value={String(hero.runs.current)} delay={d + motion.stagger * 3} style={[styles.runNum, { color: hero.runs.current > 0 ? colors.lime : colors.paper }]} />
            <Text style={styles.heroLabel}>{s.hero.runNow}</Text>
          </View>
          <View style={styles.run}>
            <Count value={String(hero.runs.best)} delay={d + motion.stagger * 4} style={styles.runNum} />
            <Text style={styles.heroLabel}>{s.hero.runBest}</Text>
          </View>
        </View>
      ) : null}
    </Animated.View>
  );
}

/** «Ν» on lime (earned), «Η» quiet on the raised ink */
function FormSquare({ win, delay }: { win: boolean; delay: number }) {
  const t = useCopy();
  const pop = usePopIn(motion.revealDur / 2, delay);
  return (
    <Animated.View style={[styles.square, win ? styles.squareWin : styles.squareLoss, pop]}>
      <Text style={[styles.squareText, { color: win ? colors.ink : colors.mist }]}>{win ? t.me.matches.win : t.me.matches.loss}</Text>
    </Animated.View>
  );
}

/** «Πού κερδίζεις, πού χάνεις» (Pro): the splits above and below your rate, over all your matches */
function WinLossSection({ i }: { i: number }) {
  const t = useCopy();
  const { rows } = useWinLoss(true);
  const enter = useStgIn(motion.revealDur, motion.stagger * (i + 3));
  if (!rows || rows.length === 0) return null;
  return (
    <Animated.View style={[styles.card, enter]}>
      <Text style={styles.kicker}>{greekCaps(t.winLoss.title)}</Text>
      {rows.map((r) => (
        <View key={r.key} style={styles.rowTop}>
          <Text style={[styles.rowLabel, styles.rowText]}>{r.label}</Text>
          <Text style={[styles.rowValue, !r.up && styles.rowDown]}>{r.value}</Text>
        </View>
      ))}
    </Animated.View>
  );
}

/** without Pro: the blocks waiting behind the Pro pill, faded, and the screen's one blue */
function Teaser({ format, i }: { format: StatsFormat; i: number }) {
  const t = useCopy();
  const s = t.matchStats;
  const press = usePress();
  const enter = useStgIn(motion.revealDur, motion.stagger * (i + 3));
  const titles = lockedTitles(format, t);
  return (
    <Animated.View style={[styles.card, enter]}>
      <View style={styles.proPill}>
        <Text style={styles.proPillText}>{t.pro.title}</Text>
      </View>
      <Text style={styles.lockTitle}>{s.locked.title}</Text>
      <Text style={styles.rowNote}>{s.locked.line}</Text>
      <View style={styles.ghosts} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {titles.map((title, k) => (
          <View key={title} style={[styles.ghost, { opacity: 0.6 - k * 0.04 }]}>
            <Text style={styles.ghostTitle}>{greekCaps(title)}</Text>
            <View style={[styles.ghostBar, { width: `${40 + ((k * 23) % 50)}%` }]} />
          </View>
        ))}
      </View>
      <Pressable accessibilityRole="button" onPress={() => router.push('/pro?from=match_stats')} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
        <Animated.View style={[styles.cta, press.style]}>
          <Text style={styles.ctaText}>{s.locked.cta}</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  scroll: { paddingHorizontal: 20, gap: 14 },
  // 44pt to tap; the negative margin keeps the layout of the 32pt line it was
  backHit: { alignSelf: 'flex-start', minHeight: 44, marginVertical: -6, justifyContent: 'center' },
  back: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.inkSoft },
  head: { gap: 8 },
  title: { ...text.title },
  sub: { ...text.subtitle },
  controls: { gap: 2 },
  segment: { flexDirection: 'row', padding: 4, borderRadius: 999, backgroundColor: colors.white, gap: 4 },
  segHit: { flex: 1, minHeight: 44, justifyContent: 'center' },
  seg: { minHeight: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  segOn: { backgroundColor: colors.ink },
  segText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  segTextOn: { color: colors.paper },
  foldHit: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  fold: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', marginTop: -8 },
  // 44pt to tap around the 40pt chip; the negative margin keeps the rows where they were
  chipHit: { minHeight: 44, marginVertical: -2, justifyContent: 'center' },
  chip: { minHeight: 40, paddingHorizontal: 16, borderRadius: 999, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: colors.ink },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  chipTextOn: { color: colors.paper },
  loading: { marginTop: 32 },
  body: { gap: 14 },
  note: { ...text.meta, fontFamily: fonts.bodyBold, color: colors.inkSoft, textAlign: 'center' },

  hero: { padding: 20, borderRadius: 26, backgroundColor: colors.ink, gap: 14 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  heroKicker: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.78, color: colors.mist },
  heroMain: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  record: { flexDirection: 'row', alignItems: 'flex-end', flexShrink: 1 },
  // big numbers: line heights above the font size so iOS keeps the digits whole
  recordNum: { fontFamily: fonts.displayHeavy, fontSize: 84, lineHeight: 92, color: colors.paper },
  recordDash: { color: colors.mist, paddingHorizontal: 6 },
  rate: { alignItems: 'flex-end', paddingBottom: 10 },
  rateNum: { fontFamily: fonts.displayHeavy, fontSize: 44, lineHeight: 50 },
  heroLabel: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17, color: colors.mist },
  heroLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.inkLine },
  form: { flexDirection: 'row', gap: 6 },
  square: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  squareWin: { backgroundColor: colors.lime },
  squareLoss: { backgroundColor: colors.inkRaised },
  squareText: { fontFamily: fonts.displayHeavy, fontSize: 18, lineHeight: 22 },
  runs: { flexDirection: 'row', gap: 10 },
  run: { flex: 1, padding: 12, borderRadius: 16, backgroundColor: colors.inkDeep, gap: 2 },
  runNum: { fontFamily: fonts.displayHeavy, fontSize: 34, lineHeight: 40, color: colors.paper },

  card: { padding: 18, borderRadius: 24, backgroundColor: colors.white, gap: 14 },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.78, color: colors.inkSoft },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  rowLabel: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.ink },
  rowNote: { fontFamily: fonts.bodySemi, fontSize: 12, lineHeight: 16, color: colors.inkSoft },
  rowValue: { fontFamily: fonts.displayHeavy, fontSize: 24, lineHeight: 30, color: colors.ink },
  rowDown: { color: colors.inkSoft },

  proPill: { alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.ink },
  proPillText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.lime },
  lockTitle: { fontFamily: fonts.displayHeavy, fontSize: 28, lineHeight: 34, color: colors.ink },
  ghosts: { gap: 10, paddingVertical: 4 },
  ghost: { gap: 6 },
  ghostTitle: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.72, color: colors.muted },
  ghostBar: { height: 8, borderRadius: 999, backgroundColor: colors.mist },
  cta: { minHeight: 52, borderRadius: 999, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.white },
});
