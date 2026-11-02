import { ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { greekCaps } from '@netprophet/copy';
import type { MonthMedal } from '@netprophet/db';
import { useCopy } from '../i18n';
import { medalAria, medalTone, monthLabel, shelfOf } from '../lib/medals';
import { usePopIn } from '../lib/motion';
import { colors, fonts, motion } from '../theme';

/**
 * The trophy shelf (founder, 2 Nov 2026): every month medal an account won, newest first, so others see them too.
 * A lime ribbon (earned) over a gold, silver or bronze face with the place on it, and the month under it. Nothing
 * at all without medals.
 */
export function TrophyShelf({ medals, style }: { medals: MonthMedal[] | null; style?: StyleProp<ViewStyle> }) {
  const t = useCopy();
  const list = shelfOf(medals);
  if (list.length === 0) return null;
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.kicker}>{greekCaps(t.ladder.medals.title)}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {list.map((m, i) => (
          <Medal key={m.month} m={m} i={i} />
        ))}
      </ScrollView>
    </View>
  );
}

function Medal({ m, i }: { m: MonthMedal; i: number }) {
  const t = useCopy();
  const pop = usePopIn(motion.revealDur, 120 + i * motion.stagger);
  const tone = medalTone(m.place);
  const label = monthLabel(m.month, t);
  return (
    <Animated.View style={[styles.medal, pop]} accessible accessibilityLabel={medalAria(m, t)}>
      <View style={styles.ribbon}>
        <View style={[styles.tail, styles.tailLeft]} />
        <View style={[styles.tail, styles.tailRight]} />
      </View>
      <View style={[styles.disc, { backgroundColor: tone.face, borderColor: tone.rim }]}>
        <Text style={styles.place}>{m.place}</Text>
      </View>
      <Text style={styles.month} numberOfLines={1}>
        {label.month}
      </Text>
      <Text style={styles.year}>{label.year}</Text>
    </Animated.View>
  );
}

const DISC = 46;

const styles = StyleSheet.create({
  card: { paddingVertical: 16, paddingLeft: 18, paddingRight: 0, borderRadius: 24, backgroundColor: colors.white, gap: 12, overflow: 'hidden' },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.78, color: colors.inkSoft },
  row: { gap: 14, paddingRight: 18 },
  medal: { width: 78, alignItems: 'center' },
  ribbon: { width: 26, height: 16, flexDirection: 'row', justifyContent: 'center', marginBottom: -4, zIndex: 0 },
  tail: { width: 11, height: 18, backgroundColor: colors.lime, borderColor: colors.ink, borderWidth: 1.5 },
  tailLeft: { transform: [{ rotate: '-14deg' }], marginRight: -2 },
  tailRight: { transform: [{ rotate: '14deg' }], marginLeft: -2 },
  disc: { width: DISC, height: DISC, borderRadius: 999, borderWidth: 3, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  place: { fontFamily: fonts.displayHeavy, fontSize: 26, lineHeight: 30, color: colors.ink, includeFontPadding: false },
  month: { marginTop: 8, fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17, color: colors.ink },
  year: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16, color: colors.inkSoft },
});
