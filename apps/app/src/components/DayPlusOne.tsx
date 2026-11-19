import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useCopy } from '../i18n';
import { daysInRow, plusOneMoment } from '../lib/dailyStreak';
import { currentMe, subscribeMe } from '../lib/meStore';
import { colors, ease, fonts, motion } from '../theme';

/**
 * The first play of the day with the daily σερί on (board 18 Nov 2026): a small ink card under the top bar, «+1»,
 * «13 μέρες στη σειρά», «Τα λέμε αύριο.», for about a second, never full screen. It watches the one shared get_me:
 * when today goes from not played to played (a vote, or the quiz finished), the server's new σερί is the number.
 * A milestone day plays its full-screen moment instead (lib/dailyStreak plusOneMoment).
 */
export function DayPlusOne() {
  const [shown, setShown] = useState<{ n: number; key: number } | null>(null);
  useEffect(() => {
    let prev = currentMe();
    return subscribeMe(() => {
      const next = currentMe();
      const m = next && prev && next.user_id === prev.user_id ? plusOneMoment(prev.game, next.game) : null;
      prev = next;
      if (m) setShown({ n: m.streak, key: Date.now() });
    });
  }, []);
  useEffect(() => {
    if (!shown) return undefined;
    const id = setTimeout(() => setShown(null), motion.dayPlusOne + motion.exitDur + motion.revealDurShort);
    return () => clearTimeout(id);
  }, [shown]);
  return shown ? <Card key={shown.key} n={shown.n} /> : null;
}

function Card({ n }: { n: number }) {
  const t = useCopy();
  const insets = useSafeAreaInsets();
  const p = useSharedValue(0);
  const fade = useSharedValue(1);
  useEffect(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    p.value = withSpring(1, motion.spring);
    fade.value = withDelay(motion.dayPlusOne, withTiming(0, { duration: motion.exitDur, easing: ease }));
  }, [p, fade]);
  // «+1» lands a beat after the card, with a little overshoot
  const num = useSharedValue(0.4);
  useEffect(() => {
    num.value = withDelay(motion.stagger * 2, withSequence(withTiming(1.25, { duration: motion.revealDurShort * 0.45, easing: ease }), withSpring(1, motion.spring)));
  }, [num]);
  const card = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.value) * fade.value,
    transform: [{ translateY: (1 - p.value) * -24 }, { scale: 0.9 + 0.1 * p.value }],
  }));
  const big = useAnimatedStyle(() => ({ transform: [{ scale: num.value }] }));
  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 64 }]}>
      <Animated.View style={[styles.card, card]} accessibilityLiveRegion="polite" accessibilityLabel={`+1. ${daysInRow(n, t)}. ${t.streak.plusOne.line}`}>
        <Animated.Text style={[styles.big, big]}>+1</Animated.Text>
        <Text style={styles.title}>{daysInRow(n, t)}</Text>
        <Text style={styles.line}>{t.streak.plusOne.line}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  card: {
    minWidth: 200,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 18,
    backgroundColor: colors.ink,
    alignItems: 'center',
    gap: 2,
    shadowColor: colors.ink,
    shadowOpacity: 0.3,
    shadowRadius: 11,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  big: { fontFamily: fonts.displayHeavy, fontSize: 54, lineHeight: 56, color: colors.lime },
  title: { fontFamily: fonts.displayHeavy, fontSize: 24, lineHeight: 26, color: colors.paper },
  line: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 19, color: colors.mist },
});
