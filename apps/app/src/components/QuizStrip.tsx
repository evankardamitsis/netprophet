import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { greekCaps } from '@netprophet/copy';
import type { GetQuizResult } from '@netprophet/db';
import { useCopy } from '../i18n';
import { stripView } from '../lib/quiz';
import { usePress, useStgIn } from '../lib/motion';
import { colors, fonts } from '../theme';

/**
 * «Παιχνίδι της ημέρας» (prototype V2, the feed's game card): the first item of the feed. Ink, a lime label, the
 * heading, a sub line (progress, or «✓ Έχεις παίξει τις σημερινές ερωτήσεις.» in lime), one segment per card and a white pill; «+30»
 * sits top-right until it is paid. Tapping opens the game. Played them all without Pro: a pill offers six more every day
 * (founder, 18 Oct) and opens Pro.
 */
export function QuizStrip({ quiz, onPress }: { quiz: GetQuizResult; onPress: () => void }) {
  const t = useCopy();
  const v = stripView(quiz, t);
  const press = usePress();
  const more = usePress();
  const enter = useStgIn(400);
  return (
    <Animated.View style={enter}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${t.quiz.label}. ${v.head}`} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
        <Animated.View style={[styles.card, press.style]}>
          <Text style={styles.label}>{greekCaps(t.quiz.label)}</Text>
          <Text style={styles.head}>{v.head}</Text>
          <Text style={[styles.sub, v.allDone && styles.subDone]}>{v.sub}</Text>
          <View style={styles.row}>
            <View style={styles.segs}>
              {v.segs.map((on, i) => (
                <View key={i} style={[styles.seg, on ? styles.segOn : styles.segOff]} />
              ))}
            </View>
            {v.cta ? (
              <View style={styles.cta}>
                <Text style={styles.ctaText}>{v.cta.replace(' ›', ' ›')}</Text>
              </View>
            ) : null}
          </View>
          {v.more ? (
            <Pressable accessibilityRole="button" onPress={() => router.push('/pro?from=quiz')} onPressIn={more.onPressIn} onPressOut={more.onPressOut} hitSlop={6}>
              <Animated.View style={[styles.more, more.style]}>
                <Text style={styles.ctaText}>{v.more}</Text>
              </Animated.View>
            </Pressable>
          ) : null}
          {v.badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t.quiz.bonus}</Text>
            </View>
          ) : null}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, borderRadius: 24, backgroundColor: colors.ink, gap: 8, overflow: 'hidden' },
  label: { fontFamily: fonts.bodyBold, fontSize: 15, letterSpacing: 0.9, color: colors.lime, paddingRight: 56 },
  head: { fontFamily: fonts.displayHeavy, fontSize: 44, lineHeight: 44, paddingBottom: 9, marginBottom: -12.5, color: colors.paper },
  sub: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 20.25, color: colors.mist },
  subDone: { color: colors.lime },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 6 },
  segs: { flex: 1, flexDirection: 'row', gap: 4 },
  seg: { flex: 1, height: 6, borderRadius: 999 },
  segOn: { backgroundColor: colors.lime },
  segOff: { backgroundColor: colors.slate },
  cta: { minHeight: 44, paddingHorizontal: 22, borderRadius: 999, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  more: { alignSelf: 'flex-start', minHeight: 44, marginTop: 4, paddingHorizontal: 18, borderRadius: 999, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  badge: { position: 'absolute', right: 16, top: 16, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.lime },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
});
