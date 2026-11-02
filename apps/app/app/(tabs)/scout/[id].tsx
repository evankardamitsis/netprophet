import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { ScoutReport } from '../../../src/components/ScoutReport';
import { useCopy } from '../../../src/i18n';
import { useScout } from '../../../src/lib/data';
import { usePress, useStgIn } from '../../../src/lib/motion';
import { colors, fonts, motion, text } from '../../../src/theme';

/**
 * «Ο αντίπαλος πριν το ματς» (Pro): the other side of your own next match. Founder, 22 Oct 2026: as much as we know,
 * never less than the free player card. One idea per card: who they are and their last ten, μεταξύ σας with every
 * meeting, the pressure numbers, singles and doubles in the blocks of «Τα στατιστικά σου», this tournament so far,
 * common opponents, how they play, and every match.
 * The database refuses anyone else's match and anyone without Pro; without Pro this screen opens the Pro sheet.
 */

export default function ScoutScreen() {
  const t = useCopy();
  const s = t.scout;
  const { id } = useLocalSearchParams<{ id: string }>();
  const scout = useScout(String(id));
  const back = usePress();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/me'));

  useEffect(() => {
    if (scout.error === 'pro_required') router.replace('/pro?from=scout');
  }, [scout.error]);

  const message = scout.error === 'not_your_match' ? s.notYours : scout.error === 'match_over' ? s.over : scout.error === 'failed' ? s.error : null;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={scout.loading && scout.opponents.length > 0} onRefresh={scout.refresh} tintColor={colors.ink} />}
      >
        <Pressable accessibilityRole="button" onPress={goBack} onPressIn={back.onPressIn} onPressOut={back.onPressOut} style={styles.backHit}>
          <Animated.Text style={[styles.back, back.style]}>‹ {t.common.back}</Animated.Text>
        </Pressable>
        <Section i={0}>
          <View style={styles.head}>
            <View style={styles.proPill}>
              <Text style={styles.proPillText}>{t.pro.title}</Text>
            </View>
            <Text style={styles.title}>{s.title}</Text>
            {scout.when ? <Text style={styles.subtitle}>{scout.when}</Text> : null}
            {scout.event ? <Text style={styles.subtitle}>{scout.event}</Text> : null}
          </View>
        </Section>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {scout.opponents.map((o) => (
          <ScoutReport key={o.id} o={o} inTournament={scout.event !== null} />
        ))}
      </ScrollView>
    </View>
  );
}

function Section({ i, children }: { i: number; children: ReactNode }) {
  const enter = useStgIn(motion.revealDur, 50 + Math.min(i, 8) * motion.stagger);
  return <Animated.View style={enter}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  scroll: { paddingTop: 8, paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  backHit: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' },
  back: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  head: { gap: 6 },
  proPill: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.ink },
  proPillText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.lime },
  title: { ...text.title },
  subtitle: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.inkSoft },
  message: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 21, color: colors.inkSoft },
});
