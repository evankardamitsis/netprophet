import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { CardBackground } from './CardBackground';
import { colors, ease } from '../theme';

/**
 * The Εγώ hero card with two faces (prototype: «Δες τα στατιστικά ›» turns it over). Both faces wear the same
 * background (the frame is a ring around the player since 15 Oct). The turn is a 600ms rotateY on the prototype ease; the card grows or shrinks to the height
 * of the face that is showing. Only the face that is up takes touches.
 */
export const FLIP_MS = 600;
const RADIUS = 28;

export function FlipCard({ bg, flipped, front, back }: { bg: string | null; flipped: boolean; front: ReactNode; back: ReactNode }) {
  const p = useSharedValue(0);
  const [hf, setHf] = useState(0);
  const [hb, setHb] = useState(0);
  useEffect(() => {
    p.value = withTiming(flipped ? 1 : 0, { duration: FLIP_MS, easing: ease });
  }, [flipped, p]);
  const frontStyle = useAnimatedStyle(() => ({ transform: [{ perspective: 1200 }, { rotateY: `${p.value * 180}deg` }] }));
  const backStyle = useAnimatedStyle(() => ({ transform: [{ perspective: 1200 }, { rotateY: `${180 + p.value * 180}deg` }] }));
  const box = useAnimatedStyle(() => (hf > 0 && hb > 0 ? { height: interpolate(p.value, [0, 1], [hf, hb]) } : hf > 0 ? { height: hf } : {}));
  return (
    <Animated.View style={box}>
      <Animated.View
        style={[styles.face, frontStyle]}
        pointerEvents={flipped ? 'none' : 'auto'}
        accessibilityElementsHidden={flipped}
        importantForAccessibility={flipped ? 'no-hide-descendants' : 'auto'}
        onLayout={(e) => setHf(e.nativeEvent.layout.height)}
      >
        <CardBackground bg={bg} scrim />
        {front}
      </Animated.View>
      <Animated.View
        style={[styles.face, backStyle]}
        pointerEvents={flipped ? 'auto' : 'none'}
        accessibilityElementsHidden={!flipped}
        importantForAccessibility={flipped ? 'auto' : 'no-hide-descendants'}
        onLayout={(e) => setHb(e.nativeEvent.layout.height)}
      >
        <CardBackground bg={bg} scrim />
        {back}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 18,
    gap: 22,
    borderRadius: RADIUS,
    backgroundColor: colors.ink,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
  },
});
