import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { colors, ease, fonts } from '../theme';

/** Prototype toast: 2.2s, in over the first 12%, out after 85%. Give it a new `key` to show it again. */
export const TOAST_MS = 2200;

export function Toast({ text }: { text: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withSequence(
      withTiming(1, { duration: TOAST_MS * 0.12, easing: ease }),
      withTiming(1, { duration: TOAST_MS * 0.73 }),
      withTiming(0, { duration: TOAST_MS * 0.15, easing: ease }),
    );
  }, [p]);
  const style = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: (1 - p.value) * -14 }, { scale: 0.9 + p.value * 0.1 }],
  }));
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View style={[styles.toast, style]} accessibilityLiveRegion="polite">
        <Text style={styles.text}>{text}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 10, left: 0, right: 0, alignItems: 'center' },
  toast: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: colors.ink,
    shadowColor: colors.ink,
    shadowOpacity: 0.3,
    shadowRadius: 11,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  text: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.lime },
});
