import { useEffect, useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { MeResult } from '@netprophet/db';
import { useCopy } from '../i18n';
import { useLook, useStreakWeek } from '../lib/data';
import { streakSheetView, type WeekCell } from '../lib/dailyStreak';
import { usePopIn } from '../lib/motion';
import { alpha, colors, ease, fonts, motion } from '../theme';

const OUT_MS = motion.exitDur;

/**
 * A tap on σερί in the top bar with the daily σερί on (founder's board, 18 Nov 2026): «12 μέρες στη σειρά», this week
 * Monday to Sunday (lime: played, the soft blue ✓: covered by an Ασφάλεια), whether today counts yet, the Ασφάλειες
 * held and the next prize. «Όλα τα νούμερά σου ›» goes on to the full page. Every number is the server's.
 */
export function StreakSheet({ open, game, onClose }: { open: boolean; game: MeResult['game']; onClose: () => void }) {
  const t = useCopy();
  const s = t.streak.sheet;
  const insets = useSafeAreaInsets();
  const week = useStreakWeek(open);
  const { look } = useLook();
  const owned = useMemo(() => (look ? new Set(look.items.filter((i) => i.owned).map((i) => i.key)) : null), [look]);
  const v = streakSheetView(game, week, owned, t);
  const p = useSharedValue(0);
  useEffect(() => {
    if (open) {
      p.value = 0;
      p.value = withSpring(1, motion.spring);
    }
  }, [open, p]);
  const close = (then?: () => void) => {
    p.value = withTiming(0, { duration: OUT_MS, easing: ease });
    setTimeout(() => {
      onClose();
      then?.();
    }, OUT_MS);
  };
  const back = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value) }));
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - p.value) * 520 }] }));

  return (
    <Modal visible={open} transparent animationType="none" statusBarTranslucent onRequestClose={() => close()}>
      <Animated.View style={[styles.back, back]}>
        <Pressable accessibilityLabel={s.close} style={styles.fill} onPress={() => close()} />
        <Animated.View style={[styles.sheet, { paddingBottom: 26 + insets.bottom }, sheet]}>
          <View style={styles.handle} />
          <Text style={styles.title} accessibilityRole="header">
            {v.title}
          </Text>
          {v.week && open ? (
            <View style={styles.week}>
              {v.week.map((c, i) => (
                <Day key={i} cell={c} index={i} />
              ))}
            </View>
          ) : null}
          <Text style={styles.line}>{v.today}</Text>
          <Text style={styles.line}>{v.freezes}</Text>
          {v.next ? <Text style={styles.prize}>{v.next}</Text> : null}
          {v.frozenKey ? <Text style={styles.key}>{v.frozenKey}</Text> : null}
          <Pressable accessibilityRole="link" onPress={() => close(() => router.push('/me?page=stats'))} style={styles.moreHit}>
            <Text style={styles.more}>{s.more}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => close()} style={styles.close}>
            <Text style={styles.closeText}>{s.close}</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

/** one day of the week: pops in one after the other (stagger), today ringed */
function Day({ cell, index }: { cell: WeekCell; index: number }) {
  const pop = usePopIn(motion.revealDurShort, 200 + index * motion.stagger);
  return (
    <Animated.View
      style={[
        styles.day,
        cell.state === 'played' ? styles.dayOn : cell.state === 'frozen' ? styles.dayFrozen : null,
        cell.today ? styles.dayToday : null,
        pop,
      ]}
    >
      {/* a covered day is a ring with ✓ (founder, 19 Nov: no blue, blue is the screen's one action) */}
      <Text style={[styles.dayText, cell.state === 'played' && styles.dayTextOn, cell.state === 'frozen' && styles.dayTextFrozen]}>
        {cell.state === 'frozen' ? '✓' : cell.letter}
      </Text>
    </Animated.View>
  );
}

const DAY = 34;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  back: { flex: 1, backgroundColor: alpha(colors.ink, 0.55), justifyContent: 'flex-end' },
  sheet: { paddingTop: 24, paddingHorizontal: 22, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.ink, gap: 12, width: '100%', maxWidth: 520, alignSelf: 'center', alignItems: 'center' },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 999, backgroundColor: colors.slate, marginTop: -12 },
  title: { fontFamily: fonts.displayHeavy, fontSize: 40, lineHeight: 42, color: colors.paper, textAlign: 'center' },
  week: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginVertical: 4 },
  day: { width: DAY, height: DAY, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(colors.paper, 0.12) },
  dayOn: { backgroundColor: colors.lime },
  dayFrozen: { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.lime },
  dayToday: { borderWidth: 2, borderColor: colors.paper },
  dayText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.mist },
  dayTextOn: { color: colors.ink },
  dayTextFrozen: { color: colors.lime },
  line: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 21, color: colors.mist, textAlign: 'center' },
  prize: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 21, color: colors.paper, textAlign: 'center' },
  key: { fontFamily: fonts.bodySemi, fontSize: 12, lineHeight: 16, color: colors.muted, textAlign: 'center' },
  moreHit: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  more: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.paper },
  close: { alignSelf: 'stretch', minHeight: 56, borderRadius: 18, borderWidth: 2, borderColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.paper },
});
