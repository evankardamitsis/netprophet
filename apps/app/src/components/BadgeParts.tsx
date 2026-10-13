import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { ease } from '../theme';

/** three round dots, filled for each tier reached (prototype), in the tier's colour */
export function BadgeDots({ tier, size, border, color, gap = 3 }: { tier: number; size: number; border: number; color: string; gap?: number }) {
  return (
    <View style={[styles.dots, { gap }]} importantForAccessibility="no-hide-descendants">
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ width: size, height: size, borderRadius: 999, borderWidth: border, borderColor: color, backgroundColor: i < tier ? color : 'transparent' }} />
      ))}
    </View>
  );
}

/** a bar whose fill grows to `value` (0 to 1) on the prototype ease; `from` is where it starts */
export function GrowBar({
  value,
  from = 0,
  height,
  track,
  fill,
  fillBorder,
  fillBorderWidth = 0,
  delay = 0,
  ms = 600,
}: {
  value: number;
  from?: number;
  height: number;
  track: string;
  fill: string;
  fillBorder?: string;
  fillBorderWidth?: number;
  delay?: number;
  ms?: number;
}) {
  const w = useSharedValue(from);
  useEffect(() => {
    w.value = withDelay(delay, withTiming(value, { duration: ms, easing: ease }));
  }, [w, value, delay, ms]);
  const style = useAnimatedStyle(() => ({ width: `${w.value * 100}%`, opacity: w.value > 0.001 ? 1 : 0 }));
  return (
    <View style={{ height, borderRadius: 999, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View style={[{ height, borderRadius: 999, backgroundColor: fill, borderColor: fillBorder, borderWidth: fillBorderWidth }, style]} />
    </View>
  );
}

const styles = StyleSheet.create({ dots: { flexDirection: 'row', alignItems: 'center' } });
