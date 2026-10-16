import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { router } from 'expo-router';
import { greekCaps } from '@netprophet/copy';
import type { Ladder, LadderRow, LadderScope } from '@netprophet/db';
import { Segmented } from '../../src/components/OnboardingControls';
import { useCopy } from '../../src/i18n';
import { useLadder } from '../../src/lib/data';
import { boardItems, motivation, nextLine, pickScope, pointRules, rowName, scopeLabel, scopeTabs } from '../../src/lib/ladder';
import { usePopIn, usePress, useSlamIn, useStgIn } from '../../src/lib/motion';
import { useUnlocks } from '../../src/lib/unlocks';
import { fmt } from '../../src/lib/votes';
import { alpha, colors, ease, fonts, text } from '../../src/theme';

/**
 * Κατάταξη (prototype V2, isRank): this month's points among the people you know or all of Attica.
 * The ink card has your position, points and what the next place costs (the σερί is in the header); the white card
 * says what is in the air or who to pass, with the screen's one blue; then the board. «Κατηγορία» is your league group: the top 5 move up,
 * 16 and below change league, and the top 3 get a frame and a badge. No month-end countdown (founder).
 */
const IN_MS = 400;
const STG_MS = 450;
const ROW_MS = 400;
/** big titles: the padding, cancelled by a margin, keeps the tonos on iOS */
const ACCENT_PAD = 10;

export default function LadderScreen() {
  const t = useCopy();
  const l = t.ladder;
  // «Όλη η Αττική» opens with the stats area; «Κατηγορία» is there once you are in a group (every response says so)
  const areaOpen = useUnlocks().has('ladder_area');
  const [picked, setScope] = useState<LadderScope | null>(null);
  const [hasLeague, setHasLeague] = useState(true);
  const scope = pickScope(picked, hasLeague, areaOpen);
  const { ladder, loading, error, refresh } = useLadder(scope);
  const titleIn = useInA(IN_MS);
  useEffect(() => {
    if (ladder) setHasLeague(ladder.has_league);
  }, [ladder]);
  const tabs = scopeTabs(hasLeague, areaOpen);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading && ladder !== null} onRefresh={refresh} tintColor={colors.ink} />}
      >
        <Animated.View style={[styles.head, titleIn]}>
          <Text style={styles.title}>{l.title}</Text>
          <Text style={styles.subtitle}>{l.subtitle}</Text>
        </Animated.View>
        {ladder && tabs.length > 1 ? (
          <Segmented options={tabs.map((id) => ({ id, label: l.scopes[id] }))} value={scope} onChange={setScope} />
        ) : null}
        {ladder && ladder.scope === scope ? (
          <View key={scope} style={styles.cards}>
            <MeCard ladder={ladder} />
            <Motivate ladder={ladder} />
            <Board ladder={ladder} />
            <HowPoints />
          </View>
        ) : null}
        {!loading && error && !ladder ? <Text style={styles.empty}>{l.error}</Text> : null}
      </ScrollView>
    </View>
  );
}

/** the ink card: scope pill, position (slam), points (pop), σερί, the next place */
function MeCard({ ladder }: { ladder: Ladder }) {
  const t = useCopy();
  const l = t.ladder;
  const enter = useStgIn(STG_MS, 50);
  const slam = useSlamIn(500, 230);
  const pop = usePopIn(450, 400);
  const next = nextLine(ladder, t);
  const position = ladder.me?.position ?? ladder.total;
  return (
    <Animated.View style={[styles.me, enter]}>
      <View style={styles.scopePill}>
        <Text style={styles.scopePillText}>{scopeLabel(ladder, t)}</Text>
      </View>
      <View style={styles.meTop}>
        <Animated.Text style={[styles.position, slam]}>{fmt(l.position, { n: position })}</Animated.Text>
        <View style={styles.pointsBox}>
          <Animated.Text style={[styles.points, pop]}>{ladder.me?.points ?? 0}</Animated.Text>
          <Text style={styles.pointsLabel}>{l.points}</Text>
        </View>
      </View>
      <View style={styles.rule} />
      <View style={styles.meRow}>
        <Text style={styles.meLabel}>{next.label}</Text>
        <Text style={styles.meValue}>{next.value}</Text>
      </View>
    </Animated.View>
  );
}

/**
 * what is in the air, or who to pass, and back to the votes: white with the screen's one blue (founder, 16 Oct:
 * lime is only for what happened or was earned)
 */
function Motivate({ ladder }: { ladder: Ladder }) {
  const t = useCopy();
  const m = motivation(ladder, t);
  const enter = useStgIn(STG_MS, 200);
  const press = usePress();
  return (
    <Animated.View style={[styles.mot, enter]}>
      <Text style={styles.motHead}>{m.head}</Text>
      <Text style={styles.motSub}>{m.sub}</Text>
      <Pressable accessibilityRole="button" onPress={() => router.navigate('/')} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
        <Animated.View style={[styles.motButton, press.style]}>
          <Text style={styles.motButtonText}>{m.button}</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/** the board: top rows, then your own row (after a ⋯) when it is further down */
function Board({ ladder }: { ladder: Ladder }) {
  const t = useCopy();
  const rows = ladder.rows;
  const league = ladder.scope === 'league' ? ladder.league : null;
  let n = 0;
  return (
    <View style={styles.board}>
      {boardItems(ladder, t).map((item) => {
        if (item.kind === 'band') return <Text key={item.label} style={styles.band}>{greekCaps(item.label)}</Text>;
        const r = item.row;
        const i = n++;
        const zone = !league ? null : r.position <= league.promote_top && league.tier !== 'gold' ? 'up' : r.position >= league.relegate_from && league.tier !== 'bronze' ? 'down' : null;
        return <BoardRow key={r.user_id} row={r} index={i} zone={zone} gap={i > 0 && r.position - rows[i - 1]!.position > 1} />;
      })}
      {league ? <Text style={styles.leagueFoot}>{t.ladder.league.foot}</Text> : null}
      <Text style={styles.renews}>{t.ladder.renews}</Text>
    </View>
  );
}

function BoardRow({ row, index, gap, zone }: { row: LadderRow; index: number; gap: boolean; zone: 'up' | 'down' | null }) {
  const t = useCopy();
  const enter = useStgIn(ROW_MS, 500 + Math.min(index, 8) * 70);
  return (
    <>
      {gap ? <Text style={styles.gap}>⋯</Text> : null}
      <Animated.View style={[styles.row, zone === 'up' && styles.rowUp, zone === 'down' && styles.rowDown, row.is_me && styles.rowMe, enter]}>
        <View style={styles.rowLeft}>
          <Text style={styles.rowPos}>{row.position}</Text>
          <Text style={[styles.rowName, row.is_me && styles.rowNameMe]} numberOfLines={1}>
            {rowName(row, t)}
          </Text>
        </View>
        <Text style={styles.rowPts}>{row.points}</Text>
      </Animated.View>
    </>
  );
}

/** «Πώς βγαίνουν οι πόντοι», closed until tapped */
function HowPoints() {
  const t = useCopy();
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.info}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((o) => !o)} style={styles.infoHead}>
        <Text style={styles.infoTitle}>{greekCaps(t.ladder.how)}</Text>
        <Text style={styles.infoMark}>{open ? '−' : '+'}</Text>
      </Pressable>
      {open ? <InfoRows /> : null}
    </View>
  );
}

function InfoRows() {
  const t = useCopy();
  const style = useInA(300);
  return (
    <Animated.View style={[styles.infoRows, style]}>
      {pointRules(t).map((r) => (
        <View key={r.label} style={styles.infoRow}>
          <Text style={styles.infoLabel}>{r.label}</Text>
          <Text style={styles.infoValue}>{r.value}</Text>
        </View>
      ))}
    </Animated.View>
  );
}

/** inA: fade in from 12px below on the prototype ease. */
function useInA(duration: number) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration, easing: ease });
  }, [p, duration]);
  return useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 12 }] }));
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  scroll: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  head: { gap: 6 },
  title: { ...text.title },
  subtitle: text.subtitle,
  empty: { paddingTop: 4, paddingHorizontal: 12, fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.inkSoft },
  cards: { gap: 12 },
  me: { padding: 22, borderRadius: 28, backgroundColor: colors.ink, gap: 10 },
  scopePill: { alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 11, borderRadius: 999, backgroundColor: colors.lime },
  scopePillText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink },
  meTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  position: { fontFamily: fonts.displayHeavy, fontSize: 64, lineHeight: 64, paddingBottom: 13, marginBottom: -13, color: colors.paper, paddingTop: ACCENT_PAD, marginTop: -ACCENT_PAD },
  pointsBox: { alignItems: 'flex-end', gap: 2 },
  points: { fontFamily: fonts.displayHeavy, fontSize: 44, lineHeight: 44, paddingBottom: 9, marginBottom: -9, color: colors.lime },
  pointsLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.mist },
  rule: { height: 1, backgroundColor: colors.inkLine },
  meRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  meLabel: { flexShrink: 1, fontFamily: fonts.body, fontSize: 15, color: colors.mist },
  meValue: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.paper },
  mot: { paddingVertical: 16, paddingHorizontal: 18, borderRadius: 24, backgroundColor: colors.white, gap: 8 },
  motHead: text.heading,
  motSub: { ...text.body, color: colors.inkSoft },
  motButton: { minHeight: 48, marginTop: 4, borderRadius: 999, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  motButtonText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.white, textAlign: 'center' },
  board: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 24, backgroundColor: colors.white },
  gap: { paddingVertical: 2, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 15, color: colors.inkSoft },
  row: {
    minHeight: 50,
    marginVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  band: { paddingTop: 10, paddingBottom: 4, paddingHorizontal: 8, fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.48, color: colors.inkSoft },
  rowUp: { backgroundColor: alpha(colors.lime, 0.2) },
  rowDown: { backgroundColor: colors.paper },
  rowMe: { backgroundColor: colors.lime },
  rowLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  rowPos: { minWidth: 30, fontFamily: fonts.displayHeavy, fontSize: 24, lineHeight: 26, paddingBottom: 5, marginBottom: -5, color: colors.ink },
  rowName: { flexShrink: 1, fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.ink },
  rowNameMe: { fontFamily: fonts.bodyBold },
  rowPts: { fontFamily: fonts.displayHeavy, fontSize: 26, lineHeight: 28, paddingBottom: 5, marginBottom: -5, color: colors.ink },
  leagueFoot: { paddingTop: 10, paddingHorizontal: 8, fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft },
  renews: { paddingVertical: 10, paddingHorizontal: 8, fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft },
  info: { paddingVertical: 4, paddingHorizontal: 18, borderRadius: 24, backgroundColor: colors.white },
  infoHead: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoTitle: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.78, color: colors.blue },
  infoMark: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.blue },
  infoRows: { gap: 8, paddingBottom: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  infoLabel: { flexShrink: 1, fontFamily: fonts.body, fontSize: 15, color: colors.ink },
  infoValue: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
});
