import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { fitText } from '../lib/fitText';
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
  // the box width is measured so the name is sized for the room it really has (the percent mark's column is kept free)
  const [boxW, setBoxW] = useState(0);
  const fit = fitText(label, (boxW > 0 ? boxW : 330) - BOX_CHROME - MARK_W, tall ? 48 : 32);
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
        <Animated.View onLayout={(e) => setBoxW(e.nativeEvent.layout.width)} style={[styles.box, { minHeight: tall ? 120 : 72 }, chosen && styles.boxChosen, pop]}>
          <Animated.View style={[styles.fill, fillStyle]} />
          <Text allowFontScaling={false} style={[styles.name, { fontSize: fit.fontSize, lineHeight: fit.lineHeight }]}>
            {label}
          </Text>
          <View style={styles.markCol}>{mark ? <Mark text={mark} /> : null}</View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

function Mark({ text }: { text: string }) {
  const pop = usePopIn(450, 120);
  return <Animated.Text style={[styles.mark, pop]}>{text}</Animated.Text>;
}

/** border 3 + padding 15 on each side, and the gap before the mark */
const BOX_CHROME = 36 + 10;
/** room kept for «46%» / «✓» so the name never changes size when the answer arrives */
const MARK_W = 62;

const styles = StyleSheet.create({
  box: {
    overflow: 'hidden',
    paddingVertical: 12,
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
  name: { flex: 1, minWidth: 0, fontFamily: fonts.displayHeavy, color: colors.ink },
  markCol: { minWidth: MARK_W, alignItems: 'flex-end' },
  mark: { fontFamily: fonts.displayHeavy, fontSize: 34, lineHeight: 34, paddingBottom: 7, marginBottom: -10, color: colors.ink },
});
