import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { runJpop, usePopIn, usePress } from '../lib/motion';
import { colors, ease, fonts, motion } from '../theme';

/**
 * One answer of «Οι ερωτήσεις της ημέρας» (prototype gOpts). White, radius 22, a 3px ink border once chosen. After answering a
 * lime fill grows to the split (to the full width on the right answer of «Ποιος είναι;») and the percent, or ✓,
 * pops in bottom-right. Two options are tall with a 48px name; three or more are 72px with a 32px name.
 */
export function QuizOption({
  label,
  tall,
  chosen,
  fill,
  mark,
  disabled,
  onPress,
}: {
  label: string;
  tall: boolean;
  chosen: boolean;
  /** lime fill, 0 to 100; null for none */
  fill: number | null;
  /** «46%» or «✓»; empty for none */
  mark: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const press = usePress();
  const grow = useSharedValue(0);
  const jpop = useSharedValue(1);
  useEffect(() => {
    grow.value = withTiming((fill ?? 0) / 100, { duration: motion.revealDur, easing: ease });
  }, [fill, grow]);
  useEffect(() => {
    if (chosen) runJpop(jpop, 400);
  }, [chosen, jpop]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${grow.value * 100}%` }));
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: jpop.value }] }));
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: chosen, disabled }} disabled={disabled} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={press.style}>
        <Animated.View style={[styles.box, { minHeight: tall ? 120 : 72 }, chosen && styles.boxChosen, pop]}>
          <Animated.View style={[styles.fill, fillStyle]} />
          <Text style={[styles.name, tall ? styles.nameTall : styles.nameShort]}>{label}</Text>
          {mark ? <Mark text={mark} /> : <View />}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

function Mark({ text }: { text: string }) {
  const pop = usePopIn(450, 120);
  return <Animated.Text style={[styles.mark, pop]}>{text}</Animated.Text>;
}

const styles = StyleSheet.create({
  box: {
    overflow: 'hidden',
    paddingVertical: 11,
    paddingHorizontal: 15,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'transparent',
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },
  boxChosen: { borderColor: colors.ink },
  fill: { position: 'absolute', left: -3, top: -3, bottom: -3, backgroundColor: colors.lime },
  name: { flexShrink: 1, fontFamily: fonts.displayHeavy, color: colors.ink },
  nameTall: { fontSize: 48, lineHeight: 44 },
  nameShort: { fontSize: 32, lineHeight: 29.5 },
  mark: { fontFamily: fonts.displayHeavy, fontSize: 34, lineHeight: 34, paddingBottom: 7, marginBottom: -10, color: colors.ink },
});
