import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { router } from 'expo-router';
import { greekCaps } from '@netprophet/copy';
import type { Ladder, LadderRow, LadderScope } from '@netprophet/db';
import { Segmented } from '../../src/components/OnboardingControls';
import { useCopy } from '../../src/i18n';
import { useLadder } from '../../src/lib/data';
import { motivation, nextLine, pointRules, rowName } from '../../src/lib/ladder';
import { usePopIn, usePress, useSlamIn, useStgIn } from '../../src/lib/motion';
import { fmt } from '../../src/lib/votes';
import { colors, ease, fonts } from '../../src/theme';

/**
 * Κατάταξη (prototype V2, isRank): this month's points among the people you know or all of Attica.
 * The ink card has your position, points, σερί and what the next place costs; the lime card says
 * what is in the air or who to pass; then the board. Leagues («Κατηγορία»), their bands and the
 * month close come with M3. No blue button here: the lime card's button is ink, as in the prototype.
 */
const IN_MS = 400;
const STG_MS = 450;
const ROW_MS = 400;
/** big titles: the padding, cancelled by a margin, keeps the tonos on iOS */
const ACCENT_PAD = 10;

export default function LadderScreen() {
  const t = useCopy();
  const l = t.ladder;
  const [scope, setScope] = useState<LadderScope>('friends');
  const { ladder, loading, error, refresh } = useLadder(scope);
  const titleIn = useInA(IN_MS);

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
        <Segmented
          options={[
            { id: 'friends', label: l.scopes.friends },
            { id: 'all', label: l.scopes.all },
          ]}
          value={scope}
          onChange={setScope}
        />
        {ladder && ladder.scope === scope ? (
          <View key={scope} style={styles.cards}>
            <MeCard ladder={ladder} />
            <Motivate ladder={ladder} />
            <Board rows={ladder.rows} />
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
        <Text style={styles.scopePillText}>{l.scopeName[ladder.scope]}</Text>
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
        <Text style={styles.meLabel}>{l.streak}</Text>
        <View style={styles.streakPill}>
          <Text style={styles.streakText}>{`${ladder.streak} ${l.streakPill}`}</Text>
        </View>
      </View>
      <View style={styles.meRow}>
        <Text style={styles.meLabel}>{next.label}</Text>
        <Text style={styles.meValue}>{next.value}</Text>
      </View>
    </Animated.View>
  );
}

/** the lime card: what is in the air, or who to pass, and back to the votes */
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
function Board({ rows }: { rows: LadderRow[] }) {
  const t = useCopy();
  return (
    <View style={styles.board}>
      {rows.map((r, i) => (
        <BoardRow key={r.user_id} row={r} index={i} gap={i > 0 && r.position - rows[i - 1]!.position > 1} />
      ))}
      <Text style={styles.renews}>{t.ladder.renews}</Text>
    </View>
  );
}

function BoardRow({ row, index, gap }: { row: LadderRow; index: number; gap: boolean }) {
  const t = useCopy();
  const enter = useStgIn(ROW_MS, 500 + Math.min(index, 8) * 70);
  return (
    <>
      {gap ? <Text style={styles.gap}>⋯</Text> : null}
      <Animated.View style={[styles.row, row.is_me && styles.rowMe, enter]}>
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
  title: {
    fontFamily: fonts.displayHeavy,
    fontSize: 60,
    lineHeight: 57,
    color: colors.ink,
    paddingTop: ACCENT_PAD,
    marginTop: -ACCENT_PAD,
  },
  subtitle: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20.25, color: colors.inkSoft },
  empty: { paddingTop: 4, paddingHorizontal: 12, fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.inkSoft },
  cards: { gap: 12 },
  me: { padding: 22, borderRadius: 28, backgroundColor: colors.ink, gap: 10 },
  scopePill: { alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 11, borderRadius: 999, backgroundColor: colors.lime },
  scopePillText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink },
  meTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  position: { fontFamily: fonts.displayHeavy, fontSize: 84, lineHeight: 84, color: colors.paper, paddingTop: ACCENT_PAD, marginTop: -ACCENT_PAD },
  pointsBox: { alignItems: 'flex-end', gap: 2 },
  points: { fontFamily: fonts.displayHeavy, fontSize: 44, lineHeight: 44, color: colors.lime },
  pointsLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.mist },
  rule: { height: 1, backgroundColor: colors.inkLine },
  meRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  meLabel: { flexShrink: 1, fontFamily: fonts.body, fontSize: 15, color: colors.mist },
  meValue: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.paper },
  streakPill: { minHeight: 28, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.lime, justifyContent: 'center' },
  streakText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  mot: { paddingVertical: 16, paddingHorizontal: 18, borderRadius: 24, backgroundColor: colors.lime, gap: 10 },
  motHead: { fontFamily: fonts.displayHeavy, fontSize: 34, lineHeight: 34, color: colors.ink, paddingTop: ACCENT_PAD, marginTop: -ACCENT_PAD },
  motSub: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 19, color: colors.ink },
  motButton: { minHeight: 48, borderRadius: 14, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  motButtonText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.paper, textAlign: 'center' },
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
  rowMe: { backgroundColor: colors.lime },
  rowLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  rowPos: { minWidth: 30, fontFamily: fonts.displayHeavy, fontSize: 24, lineHeight: 26, color: colors.ink },
  rowName: { flexShrink: 1, fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.ink },
  rowNameMe: { fontFamily: fonts.bodyBold },
  rowPts: { fontFamily: fonts.displayHeavy, fontSize: 26, lineHeight: 28, color: colors.ink },
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
