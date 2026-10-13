import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { alpha, colors, ease, fonts, motion, springEase } from '../theme';

/** prototype: slides in over 500ms, stays, slides out at 1.8s over 400ms */
export const QUEST_BAR_MS = 2200;
const IN_MS = 500;
const OUT_AT = 1800;
const OUT_MS = 400;
const BAR_DELAY = 300;

/**
 * The slim progress bar after a vote (prototype): an ink pill above the tab bar with the quest and «x/y», its bar
 * growing from where it was. Give it a new `key` to show it again.
 */
export function QuestBar({ title, from, to, progress, target }: { title: string; from: number; to: number; progress: number; target: number }) {
  const [h, setH] = useState(64);
  const slide = useSharedValue(0);
  const fill = useSharedValue(from);
  useEffect(() => {
    slide.value = withSequence(
      withTiming(1, { duration: IN_MS, easing: springEase }),
      withDelay(OUT_AT - IN_MS, withTiming(0, { duration: OUT_MS, easing: ease })),
    );
    fill.value = withDelay(BAR_DELAY, withTiming(to, { duration: motion.revealDur, easing: ease }));
  }, [slide, fill, to]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - slide.value) * (h * 1.2 + 10) }] }));
  const bar = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View style={[styles.pill, pill]} onLayout={(e) => setH(e.nativeEvent.layout.height)} accessibilityLiveRegion="polite">
        <View style={styles.top}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.count}>{`${progress}/${target}`}</Text>
        </View>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, bar]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, bottom: 10 },
  pill: {
    paddingTop: 10,
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderRadius: 18,
    backgroundColor: colors.ink,
    gap: 8,
    shadowColor: colors.ink,
    shadowOpacity: 0.3,
    shadowRadius: 11,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 14, color: colors.paper },
  count: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.lime },
  track: { height: 6, borderRadius: 999, backgroundColor: alpha(colors.paper, 0.2), overflow: 'hidden' },
  fill: { height: 6, borderRadius: 999, backgroundColor: colors.lime },
});
