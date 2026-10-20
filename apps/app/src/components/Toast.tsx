import { StyleSheet, Text, View } from 'react-native';
import Animated, { cubicBezier } from 'react-native-reanimated';
import { bezier, colors, fonts } from '../theme';

/** Prototype toast: 2.2s, in over the first 12%, out after 85%. Give it a new `key` to show it again. */
export const TOAST_MS = 2200;

export function Toast({ text }: { text: string }) {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View style={[styles.toast, SHOW]} accessibilityLiveRegion="polite">
        <Text style={styles.text}>{text}</Text>
      </Animated.View>
    </View>
  );
}

/**
 * In and out as one CSS animation (no shared value to lose between threads, 20 Oct); `both` keeps it hidden before and
 * after, so it never lingers.
 */
const HIDDEN = { opacity: 0, transform: [{ translateY: -14 }, { scale: 0.9 }] };
const SHOWN = { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] };
const SHOW = {
  animationName: { '0%': HIDDEN, '12%': SHOWN, '85%': SHOWN, '100%': HIDDEN },
  animationDuration: TOAST_MS,
  animationFillMode: 'both',
  animationTimingFunction: cubicBezier(...bezier),
} as const;

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
