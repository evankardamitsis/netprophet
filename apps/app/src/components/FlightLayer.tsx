import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useHud, type Flight } from '../lib/hud';
import { colors, fonts, motion } from '../theme';

/**
 * Badges flying from a result card to the header (prototype flX / flY, 700ms):
 * across on cubic-bezier(.45,0,.2,1); up and down on (.2,.8,.3,1): fade in, rise 16px and grow to 1.15 by 18%,
 * stay visible to 80%, then shrink to .7 and fade into the target.
 */
const X_EASE = Easing.bezier(0.45, 0, 0.2, 1);
const Y_EASE = Easing.bezier(0.2, 0.8, 0.3, 1);

export function FlightLayer() {
  const { flights } = useHud();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {flights.map((f) => (
        <FlightBadge key={f.id} flight={f} />
      ))}
    </View>
  );
}

function FlightBadge({ flight }: { flight: Flight }) {
  const t = useSharedValue(0);
  const x = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(flight.delay, withTiming(1, { duration: motion.revealDur, easing: Y_EASE }));
    x.value = withDelay(flight.delay, withTiming(1, { duration: motion.revealDur, easing: X_EASE }));
  }, [t, x, flight.delay]);
  const style = useAnimatedStyle(() => {
    const p = t.value;
    let opacity: number;
    let y: number;
    let scale: number;
    if (p < 0.18) {
      const q = p / 0.18;
      opacity = q;
      y = -16 * q;
      scale = 0.6 + 0.55 * q;
    } else if (p < 0.8) {
      const q = (p - 0.18) / 0.82;
      opacity = 1;
      y = -16 + (flight.dy + 16) * q;
      scale = 1.15 - 0.45 * q;
    } else {
      const q = (p - 0.18) / 0.82;
      opacity = 1 - (p - 0.8) / 0.2;
      y = -16 + (flight.dy + 16) * q;
      scale = 1.15 - 0.45 * q;
    }
    return {
      opacity,
      transform: [{ translateX: flight.dx * x.value }, { translateY: y }, { scale }],
    };
  });
  return (
    <Animated.View style={[styles.wrap, { left: flight.x, top: flight.y }, style]}>
      <Animated.Text style={styles.badge}>{flight.text}</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute' },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: colors.ink,
    color: colors.lime,
    borderWidth: 2,
    borderColor: colors.lime,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
});
