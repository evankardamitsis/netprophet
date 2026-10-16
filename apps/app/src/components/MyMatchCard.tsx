import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { greekCaps } from '@netprophet/copy';
import { router } from 'expo-router';
import { useCopy } from '../i18n';
import type { MyMatchView } from '../lib/myMatch';
import { usePress, useStgIn } from '../lib/motion';
import { colors, fonts, text } from '../theme';

/**
 * «Το ματς σου» at the top of Σήμερα (founder, 14 Oct: "who is my opponent", and Pro high up): when you play today or
 * tomorrow, three short lines (when, against whom, the category; founder, 16 Oct: easy to read), then «Ο αντίπαλος πριν το ματς ›», the screen's one blue. With Pro it opens
 * the scouting page; without, the Pro sheet, marked with a small «Pro».
 */
export function MyMatchCard({ match, pro }: { match: MyMatchView; pro: boolean }) {
  const t = useCopy();
  const press = usePress(0.97);
  const enter = useStgIn(500, 0);
  const open = () => (pro ? router.push(`/scout/${match.matchId}`) : router.push('/pro?from=scout'));
  return (
    <Animated.View style={[styles.card, enter]}>
      <Text style={styles.label}>{greekCaps(t.feed.myMatch)}</Text>
      <View style={styles.lines}>
        <Text style={styles.when}>{match.when}</Text>
        <Text style={styles.who}>{match.who}</Text>
        {match.category ? <Text style={styles.category}>{match.category}</Text> : null}
      </View>
      <Pressable accessibilityRole="button" onPress={open} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
        <Animated.View style={[styles.cta, press.style]}>
          <Text style={styles.ctaText}>{t.scout.open}</Text>
          {pro ? null : (
            <View style={styles.pro}>
              <Text style={styles.proText}>{t.pro.title}</Text>
            </View>
          )}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, borderRadius: 24, backgroundColor: colors.ink, gap: 10 },
  label: { ...text.label, color: colors.mist },
  lines: { gap: 4 },
  when: { ...text.heading, color: colors.paper },
  who: { fontFamily: fonts.bodySemi, fontSize: 17, lineHeight: 23, color: colors.paper },
  category: { ...text.meta, color: colors.mist },
  cta: { minHeight: 48, marginTop: 4, paddingHorizontal: 16, borderRadius: 999, backgroundColor: colors.blue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ctaText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.white },
  pro: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.white },
  proText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.blue },
});
