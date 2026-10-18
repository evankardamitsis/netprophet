import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { greekCaps, nameGender } from '@netprophet/copy';
import type { MatchStatsPeriod } from '@netprophet/db';
import { GrowBar } from '../src/components/BadgeParts';
import { KudosCloud } from '../src/components/KudosCloud';
import { MyTraits } from '../src/components/MyTraits';
import { RecentMatches } from '../src/components/RecentMatches';
import { useCopy } from '../src/i18n';
import { track } from '../src/lib/analytics';
import { useMatchStats, useMePage, useMyKudos, useMyTraits, useWinLoss } from '../src/lib/data';
import { matchStatsView, PERIODS, periodLabel, type HeadStat, type StatRow, type StatSection, type StatsFormat } from '../src/lib/matchStats';
import { useCountFromZero, usePress, useStgIn } from '../src/lib/motion';
import { useUnlocks } from '../src/lib/unlocks';
import { alpha, colors, fonts, motion, text } from '../src/theme';

/**
 * «Τα στατιστικά σου» (founder, 18 Oct 2026: match statistics, not vote statistics, as detailed as the data allows).
 * Your real matches only: the big four on ink (played, wins in lime, losses, win rate), then for Pro the sections in
 * the order a player asks: form, month by month, sets and games, the tight moments, where you play, tournaments,
 * rounds, opponents, partners (doubles), best wins, walkovers and retirements. Then «Πού κερδίζεις, πού χάνεις», your
 * last matches and what opponents say about you. Singles and doubles apart, and three periods. Without Pro the big four
 * show and the rest is a locked card with the screen's one blue. σερί, votes and points are on «Οι προβλέψεις σου».
 */
const FORMATS: readonly StatsFormat[] = ['singles', 'doubles'];

export default function MatchStatsScreen() {
  const t = useCopy();
  const s = t.matchStats;
  const params = useLocalSearchParams<{ from?: string }>();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<MatchStatsPeriod>('all');
  const [format, setFormat] = useState<StatsFormat>('singles');
  const { stats, loading, error, refresh } = useMatchStats(period);
  const me = useMePage();
  const kudos = useMyKudos();
  const myTraits = useMyTraits();
  const { has } = useUnlocks();
  const view = useMemo(() => (stats ? matchStatsView(stats, format, t) : null), [stats, format, t]);
  const back = usePress();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/me'));

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
        <View style={styles.filters}>
          <Chips options={FORMATS.map((f) => ({ key: f, label: s.formats[f] }))} value={format} onChange={(f) => setFormat(f as StatsFormat)} />
          <Chips options={PERIODS.map((p) => ({ key: p, label: periodLabel(p, t) }))} value={period} onChange={(p) => setPeriod(p as MatchStatsPeriod)} />
        </View>
        {loading && !stats ? <ActivityIndicator color={colors.ink} style={styles.loading} /> : null}
        {error && !stats ? <Text style={styles.note}>{s.error}</Text> : null}
        {view ? (
          <View key={run} style={styles.body}>
            <View style={styles.hero}>
              {view.head.map((h) => (
                <HeadTile key={h.key} stat={h} i={i++} />
              ))}
            </View>
            {view.noPlayer ? <Text style={styles.note}>{s.noPlayer}</Text> : view.empty ? <Text style={styles.note}>{s.empty}</Text> : null}
            {view.sections.map((sec) => (
              <Section key={sec.key} section={sec} i={i++} />
            ))}
            {view.locked ? <Locked i={i++} /> : null}
            {view.pro && !view.noPlayer ? <WinLossSection i={i++} /> : null}
          </View>
        ) : null}
        {me.view && !me.view.isNew ? <RecentMatches v={me.view} /> : null}
        {me.view && kudos && has('kudos') ? <KudosCloud list={kudos} gender={nameGender(me.view.first)} /> : null}
        {/* the locked card is this screen's one Pro door (one blue), so the traits' own Pro link stays off */}
        {me.view && myTraits ? <MyTraits data={myTraits} first={me.view.first} proOpen={false} /> : null}
      </ScrollView>
    </View>
  );
}

/** a row of choices: the chosen one in ink (never blue: the one blue is the Pro button) */
function Chips({ options, value, onChange }: { options: { key: string; label: string }[]; value: string; onChange: (key: string) => void }) {
  return (
    <View style={styles.chips} accessibilityRole="tablist">
      {options.map((o) => (
        <Chip key={o.key} label={o.label} on={o.key === value} onPress={() => onChange(o.key)} />
      ))}
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const press = usePress(0.95);
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[styles.chip, on && styles.chipOn, press.style]}>
        <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/** one of the big four: it rises in and counts up from 0, staggered (tokens: reveal 700ms, stagger 70ms) */
function HeadTile({ stat, i }: { stat: HeadStat; i: number }) {
  const delay = motion.stagger * (i + 1);
  const enter = useStgIn(motion.revealDur, delay);
  const shown = useCountFromZero(stat.value, motion.revealDur, delay);
  return (
    <Animated.View style={[styles.tile, enter]}>
      <Text style={[styles.tileValue, { color: stat.earned ? colors.lime : colors.paper }]}>{shown}</Text>
      <Text style={styles.tileLabel} numberOfLines={1}>
        {stat.label}
      </Text>
    </Animated.View>
  );
}

function Section({ section, i }: { section: StatSection; i: number }) {
  const enter = useStgIn(motion.revealDur, motion.stagger * (i + 1));
  return (
    <Animated.View style={[styles.card, enter]}>
      <Text style={styles.kicker}>{greekCaps(section.title)}</Text>
      {section.rows.map((r, k) => (
        <Row key={r.key} row={r} delay={motion.stagger * (i + 1 + k)} />
      ))}
    </Animated.View>
  );
}

/** label and value; a lime bar for the share won when there is one */
function Row({ row, delay }: { row: StatRow; delay: number }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>{row.label}</Text>
          {row.note ? <Text style={styles.rowNote}>{row.note}</Text> : null}
        </View>
        <Text style={styles.rowValue}>{row.value}</Text>
      </View>
      {row.share !== null ? (
        <GrowBar value={row.share} height={10} track={alpha(colors.ink, 0.08)} fill={colors.lime} fillBorder={colors.ink} fillBorderWidth={1.5} delay={delay + motion.revealDur / 2} ms={motion.revealDur} />
      ) : null}
    </View>
  );
}

/** «Πού κερδίζεις, πού χάνεις» (Pro): the splits above and below your rate, over all your matches */
function WinLossSection({ i }: { i: number }) {
  const t = useCopy();
  const { rows } = useWinLoss(true);
  const enter = useStgIn(motion.revealDur, motion.stagger * (i + 1));
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

/** without Pro: what the rest holds, and the screen's one blue */
function Locked({ i }: { i: number }) {
  const t = useCopy();
  const s = t.matchStats;
  const press = usePress();
  const enter = useStgIn(motion.revealDur, motion.stagger * (i + 1));
  return (
    <Animated.View style={[styles.locked, enter]}>
      <Text style={styles.lockTitle}>{s.locked.title}</Text>
      <Text style={styles.lockLine}>{s.locked.line}</Text>
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
  backHit: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' },
  back: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.inkSoft },
  head: { gap: 8 },
  title: { ...text.title },
  sub: { ...text.subtitle },
  filters: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 40, paddingHorizontal: 16, borderRadius: 999, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: colors.ink },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  chipTextOn: { color: colors.paper },
  loading: { marginTop: 32 },
  body: { gap: 14 },
  hero: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 10, borderRadius: 24, backgroundColor: colors.ink },
  tile: { flexGrow: 1, flexBasis: '45%', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.inkRaised, gap: 2 },
  // big numbers: line heights above the font size so iOS keeps the digits whole
  tileValue: { fontFamily: fonts.displayHeavy, fontSize: 44, lineHeight: 50 },
  tileLabel: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17, color: colors.mist },
  note: { ...text.meta, fontFamily: fonts.bodyBold, color: colors.inkSoft, textAlign: 'center' },
  card: { padding: 16, borderRadius: 22, backgroundColor: colors.white, gap: 12 },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.78, color: colors.inkSoft },
  row: { gap: 6 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowText: { flex: 1, minWidth: 0, gap: 1 },
  rowLabel: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.ink },
  rowNote: { fontFamily: fonts.bodySemi, fontSize: 12, lineHeight: 16, color: colors.inkSoft },
  rowValue: { fontFamily: fonts.displayHeavy, fontSize: 24, lineHeight: 30, color: colors.ink },
  rowDown: { color: colors.inkSoft },
  locked: { padding: 18, borderRadius: 22, backgroundColor: colors.ink, gap: 8 },
  lockTitle: { fontFamily: fonts.displayHeavy, fontSize: 24, lineHeight: 30, color: colors.paper },
  lockLine: { ...text.meta, color: colors.mist },
  cta: { minHeight: 52, marginTop: 6, borderRadius: 999, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.white },
});
