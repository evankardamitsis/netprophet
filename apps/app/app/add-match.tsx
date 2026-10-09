import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { greekCaps } from '@netprophet/copy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCopy } from '../src/i18n';
import { colors, fonts, radii, spacing } from '../src/theme';

// Modal for the «+ Ματς» flow. The real flow lands in a later milestone.
export default function AddMatchModal() {
  const t = useCopy();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: spacing[5], paddingBottom: insets.bottom + spacing[4] }]}>
      <Text style={styles.title}>{t.addMatch.title}</Text>
      <Text style={styles.soon}>{t.addMatch.soon}</Text>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.btn}>
        <Text style={styles.btnText}>{greekCaps(t.common.back)}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink, paddingHorizontal: spacing[4], justifyContent: 'space-between' },
  title: { color: colors.paper, fontFamily: fonts.displayHeavy, fontSize: 44 },
  soon: { color: colors.muted, fontFamily: fonts.body, fontSize: 16, flex: 1, marginTop: spacing[3] },
  btn: { backgroundColor: colors.blue, borderRadius: radii.pill, paddingVertical: spacing[3], alignItems: 'center' },
  btnText: { color: colors.paper, fontFamily: fonts.bodySemi, fontSize: 14, letterSpacing: 1 },
});
