import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { greekCaps } from '@netprophet/copy';
import type { QuestRow } from '@netprophet/db';
import { useCopy } from '../i18n';
import { useStgIn } from '../lib/motion';
import { fraction, questTitle, rewardLine } from '../lib/quests';
import { fmt } from '../lib/votes';
import { alpha, colors, ease, fonts, motion } from '../theme';

const BAR_MS = motion.revealDur + 100;
const BAR_DELAY = 300;

/**
 * «Ακολούθησε 10 παίκτες» on every player card until it is done (founder, 2 Nov 2026): how many you follow, what the
 * 10th gives (the frame Παρέα) and what following is for. The bar grows to the new count after each follow.
 */
export function FollowQuestCard({ row }: { row: QuestRow }) {
  const t = useCopy();
  const k = t.players.followQuest;
  const enter = useStgIn(450, 300);
  const fill = useSharedValue(0);
  const to = fraction(row);
  useEffect(() => {
    fill.value = withDelay(BAR_DELAY, withTiming(to, { duration: BAR_MS, easing: ease }));
  }, [to, fill]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  return (
    <Animated.View style={[styles.card, enter]}>
      <View style={styles.row}>
        <Text style={styles.kicker}>{greekCaps(k.kicker)}</Text>
        <Text style={styles.count}>{fmt(k.count, { n: row.progress, total: row.target })}</Text>
      </View>
      <Text style={styles.title}>{questTitle(row.key, t)}</Text>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
      <Text style={styles.reward}>
        {row.reward.kind === 'cosmetic'
          ? fmt(k.rewardFrame, { name: t.quests.cosmetics[row.reward.key] ?? row.reward.key })
          : fmt(k.reward, { reward: rewardLine(row.reward, t) })}
      </Text>
      <Text style={styles.why}>{k.why}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 16, paddingHorizontal: 18, borderRadius: 24, backgroundColor: colors.white, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17, letterSpacing: 0.78, color: colors.inkSoft },
  count: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.ink },
  title: { fontFamily: fonts.displayHeavy, fontSize: 24, lineHeight: 28, color: colors.ink },
  track: { height: 8, borderRadius: 999, backgroundColor: alpha(colors.ink, 0.1), overflow: 'hidden', marginVertical: 4 },
  fill: { height: 8, borderRadius: 999, backgroundColor: colors.ink },
  reward: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.ink },
  why: { fontFamily: fonts.body, fontSize: 14, lineHeight: 19, color: colors.inkSoft },
});
