import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useCopy } from '../i18n';
import { colors, fonts, motion, radii, spacing } from '../theme';

/** The single blue primary action on Ψήφισε and Αποτελέσματα. */
export function AddMatchButton() {
  const t = useCopy();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[styles.wrap, style]}>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/add-match')}
        onPressIn={() => {
          scale.value = withSpring(0.94, motion.spring);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, motion.spring);
        }}
        style={styles.btn}
      >
        <Text style={styles.text}>{t.addMatch.cta}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: spacing[4], bottom: spacing[4] },
  btn: {
    backgroundColor: colors.blue,
    borderRadius: radii.pill,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
  },
  text: { color: colors.paper, fontFamily: fonts.bodySemi, fontSize: 16 },
});
