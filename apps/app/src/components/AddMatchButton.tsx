import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { useCopy } from '../i18n';
import { usePopIn, usePress } from '../lib/motion';
import { colors, fonts } from '../theme';

/** The single blue primary action on Ψήφισε and Αποτελέσματα (prototype: pinned «+ Ματς» above the tabs). */
export function AddMatchButton() {
  const t = useCopy();
  const press = usePress();
  const pop = usePopIn(450, 300);
  return (
    <Animated.View style={[styles.wrap, pop]}>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/add-match')}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
      >
        <Animated.View style={[styles.btn, press.style]}>
          <Animated.Text style={styles.text}>{t.addMatch.cta}</Animated.Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // prototype: right 12, bottom 110 of a frame whose tab bar (with its prototype-only debug row) is 101px,
  // so it floats 9px above the tab bar
  wrap: { position: 'absolute', right: 12, bottom: 9 },
  btn: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  text: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 15 },
});
