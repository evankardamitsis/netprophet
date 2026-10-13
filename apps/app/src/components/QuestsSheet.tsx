import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { greekCaps } from '@netprophet/copy';
import type { GetQuestsResult, QuestRow } from '@netprophet/db';
import { useCopy } from '../i18n';
import { chipText, doneLine, fraction, questTitle } from '../lib/quests';
import { fmt } from '../lib/votes';
import { alpha, colors, ease, fonts, motion } from '../theme';

const OUT_MS = 400;
/** the bars fill a beat longer than a plain reveal (prototype ~800ms), after 150ms */
const BAR_MS = motion.revealDur + 100;
const BAR_DELAY = 150;

/**
 * «Αποστολές» (prototype V2 quests sheet): today's open quests with a bar and a reward chip, the finished ones
 * folded into «✓ N έγιναν», and «Της εβδομάδας» closed until tapped. The friend quest waits for invites.
 */
export function QuestsSheet({ open, quests, onClose }: { open: boolean; quests: GetQuestsResult | null; onClose: () => void }) {
  const t = useCopy();
  const q = t.quests;
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [week, setWeek] = useState(false);
  const p = useSharedValue(0);
  useEffect(() => {
    if (open) {
      setWeek(false);
      p.value = 0;
      p.value = withSpring(1, motion.spring);
    }
  }, [open, p]);
  const close = () => {
    p.value = withTiming(0, { duration: OUT_MS, easing: ease });
    setTimeout(onClose, OUT_MS);
  };
  const back = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value) }));
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - p.value) * 520 }] }));
  const arrow = useSharedValue(0);
  useEffect(() => {
    arrow.value = withSpring(week ? 1 : 0, motion.spring);
  }, [week, arrow]);
  const arrowStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${arrow.value * 90}deg` }] }));

  const daily = quests?.daily ?? [];
  const weekly = quests?.weekly ?? [];
  const weeklyDone = weekly.filter((x) => x.done).length;

  return (
    <Modal visible={open} transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View style={[styles.back, back]}>
        <Pressable accessibilityLabel={q.close} style={styles.fill} onPress={close} />
        <Animated.View style={[styles.sheet, { paddingBottom: 26 + insets.bottom }, sheet]}>
          <View style={styles.handle} />
          <Text style={styles.title}>{q.title}</Text>
          <ScrollView style={{ maxHeight: height * 0.66 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Group header={q.today} reset={q.todayReset} rows={daily} open={open} />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: week }}
              onPress={() => setWeek((w) => !w)}
              style={styles.toggle}
            >
              <Text style={styles.toggleText}>{fmt(q.weekToggle, { n: weeklyDone, total: weekly.length })}</Text>
              <Animated.Text style={[styles.toggleMark, arrowStyle]}>›</Animated.Text>
            </Pressable>
            {week ? <Group header={q.week} reset={q.weekReset} rows={weekly} open={open} /> : null}
          </ScrollView>
          <Pressable accessibilityRole="button" onPress={close} style={styles.close}>
            <Text style={styles.closeText}>{q.close}</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

/** a header, the quests still to do, then «✓ N έγιναν» */
function Group({ header, reset, rows, open }: { header: string; reset: string; rows: QuestRow[]; open: boolean }) {
  const t = useCopy();
  const todo = rows.filter((r) => !r.done);
  const done = rows.length - todo.length;
  return (
    <View style={styles.group}>
      <Text style={styles.header}>
        <Text style={styles.headerLime}>{greekCaps(header)}</Text>
        <Text style={styles.headerReset}>{` ${reset}`}</Text>
      </Text>
      {todo.map((r) => (
        <Row key={r.key} row={r} open={open} />
      ))}
      {done > 0 ? <Text style={styles.done}>{doneLine(done, t)}</Text> : null}
    </View>
  );
}

function Row({ row, open }: { row: QuestRow; open: boolean }) {
  const t = useCopy();
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = 0;
    if (open) fill.value = withDelay(BAR_DELAY, withTiming(fraction(row), { duration: BAR_MS, easing: ease }));
  }, [open, row, fill]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <Text style={styles.rowTitle}>{questTitle(row.key, t)}</Text>
        <View style={styles.chip}>
          <Text style={styles.chipText}>{chipText(row, t)}</Text>
        </View>
      </View>
      <View style={styles.barRow}>
        <View style={styles.track}>
          <Animated.View style={[styles.fillBar, fillStyle]} />
        </View>
        <Text style={styles.count}>{`${row.progress}/${row.target}`}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  back: { flex: 1, backgroundColor: alpha(colors.ink, 0.55), justifyContent: 'flex-end' },
  sheet: { paddingTop: 24, paddingHorizontal: 22, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.ink, gap: 14, width: '100%', maxWidth: 520, alignSelf: 'center' },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 999, backgroundColor: colors.slate, marginTop: -12 },
  title: { fontFamily: fonts.displayHeavy, fontSize: 48, lineHeight: 43, color: colors.paper },
  scroll: { gap: 14 },
  group: { gap: 12 },
  header: { fontSize: 13 },
  headerLime: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.78, color: colors.lime },
  headerReset: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.mist },
  row: { gap: 8 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  rowTitle: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.paper },
  chip: { minHeight: 28, paddingHorizontal: 10, borderRadius: 999, borderWidth: 2, borderColor: colors.slate, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.paper },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { flex: 1, height: 6, borderRadius: 999, backgroundColor: colors.slate, overflow: 'hidden' },
  fillBar: { height: 6, borderRadius: 999, backgroundColor: colors.lime },
  count: { minWidth: 32, textAlign: 'right', fontFamily: fonts.bodyBold, fontSize: 13, color: colors.paper },
  done: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.mist },
  toggle: { minHeight: 48, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.inkDeep, borderWidth: 2, borderColor: colors.inkRaised, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.paper },
  toggleMark: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.paper },
  close: { minHeight: 56, borderRadius: 18, borderWidth: 2, borderColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.paper },
});
