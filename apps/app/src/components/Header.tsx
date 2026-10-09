import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { greekCaps } from '@netprophet/copy';
import { useCopy } from '../i18n';
import type { MeSummary } from '../lib/data';
import { alpha, colors, fonts, spacing } from '../theme';

/** `me` comes from the tabs layout, so all tabs share one get_me call. Null while loading. */
export function Header({ me }: { me: MeSummary | null }) {
  const t = useCopy();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + spacing[2] }]}>
      <Text style={styles.logo}>NetProphet</Text>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.streakNum}>{me?.streak ?? ' '}</Text>
          <Text style={styles.label}>{greekCaps(t.streak.label)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.pointsNum}>{me?.points ?? ' '}</Text>
          <Text style={styles.label}>{greekCaps(t.header.points)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.ink,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: { color: colors.paper, fontFamily: fonts.displayHeavy, fontSize: 24, letterSpacing: 0.3 },
  stats: { flexDirection: 'row', alignItems: 'baseline', gap: spacing[5] },
  stat: { flexDirection: 'row', alignItems: 'baseline', gap: spacing[1] },
  streakNum: { color: colors.lime, fontFamily: fonts.displayHeavy, fontSize: 28 },
  pointsNum: { color: colors.paper, fontFamily: fonts.displayHeavy, fontSize: 28 },
  label: {
    color: alpha(colors.paper, 0.6),
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    letterSpacing: 1,
  },
});
