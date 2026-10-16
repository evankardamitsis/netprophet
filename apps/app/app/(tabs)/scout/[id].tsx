import { useEffect, type ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { FitText } from '../../../src/components/FitText';
import { FormDots } from '../../../src/components/PlayerListRow';
import { useCopy } from '../../../src/i18n';
import { useScout } from '../../../src/lib/data';
import { usePress, useStgIn } from '../../../src/lib/motion';
import type { ScoutView } from '../../../src/lib/scout';
import { colors, fonts, text } from '../../../src/theme';

/**
 * «Ο αντίπαλος πριν το ματς» (Pro, no prototype screen; built from the profile's visual language): the other
 * side of your own next match. Μεταξύ σας, form, deciding sets, tie-breaks, people you know, common opponents.
 * The database refuses anyone else's match and anyone without Pro; without Pro this screen opens the Pro sheet.
 */
const STG_MS = 450;
const STAGGER = 70;
/** big text: the padding, cancelled by a margin, keeps the tonos on iOS */
const ACCENT_PAD = 10;

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
  let n = 0;

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
        <Section i={n++}>
          <View style={styles.head}>
            <View style={styles.proPill}>
              <Text style={styles.proPillText}>{t.pro.title}</Text>
            </View>
            <Text style={styles.title}>{s.title}</Text>
            {scout.when ? <Text style={styles.subtitle}>{scout.when}</Text> : null}
          </View>
        </Section>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {scout.opponents.map((o) => (
          <Opponent key={o.id} o={o} first={n++} />
        ))}
        {scout.opponents.length > 0 ? <Text style={styles.fair}>{s.fair}</Text> : null}
      </ScrollView>
    </View>
  );
}

function Section({ i, children }: { i: number; children: ReactNode }) {
  const enter = useStgIn(STG_MS, 50 + Math.min(i, 6) * STAGGER);
  return <Animated.View style={enter}>{children}</Animated.View>;
}

function Opponent({ o, first }: { o: ScoutView; first: number }) {
  const t = useCopy();
  const s = t.scout;
  return (
    <>
      <Section i={first}>
        <View style={styles.hero}>
          <Text style={styles.first}>{o.first}</Text>
          <FitText text={o.surname} style={styles.surname} />
          {o.sub ? <Text style={styles.heroSub}>{o.sub}</Text> : null}
          <View style={styles.formRow}>
            <FormDots form={o.form} on={colors.lime} off={colors.inkLine} size={14} gap={5} baseDelay={450} />
            <Text style={styles.heroSub}>{o.year}</Text>
          </View>
        </View>
      </Section>
      <Section i={first + 1}>
        <View style={styles.card}>
          <Text style={styles.label}>{s.h2h}</Text>
          {o.h2h.record ? <Text style={styles.big}>{o.h2h.record}</Text> : null}
          <Text style={styles.line}>{o.h2h.line}</Text>
        </View>
      </Section>
      <Section i={first + 2}>
        <View style={styles.tiles}>
          <Tile value={o.deciding} label={s.deciding} />
          <Tile value={o.tiebreaks} label={s.tiebreaks} />
          <Tile value={o.known} label={s.known} wide />
        </View>
      </Section>
      <Section i={first + 3}>
        <View style={styles.card}>
          <Text style={styles.label}>{s.common}</Text>
          {o.common.length === 0 ? (
            <Text style={styles.line}>{s.noCommon}</Text>
          ) : (
            <>
              <View style={styles.commonHead}>
                <Text style={[styles.commonName, styles.muted]} />
                <Text style={styles.commonCol}>{s.you}</Text>
                <Text style={styles.commonCol} numberOfLines={1}>
                  {o.first}
                </Text>
              </View>
              {o.common.map((c) => (
                <View key={c.id} style={styles.commonRow}>
                  <Text style={styles.commonName} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={styles.commonValue}>{c.me}</Text>
                  <Text style={styles.commonValue}>{c.them}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      </Section>
    </>
  );
}

function Tile({ value, label, wide = false }: { value: string; label: string; wide?: boolean }) {
  return (
    <View style={[styles.tile, wide && styles.tileWide]}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
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
  hero: { padding: 18, borderRadius: 28, backgroundColor: colors.ink, gap: 4 },
  first: { fontFamily: fonts.display, fontSize: 24, lineHeight: 26, paddingBottom: 5, marginBottom: -5, color: colors.paper },
  surname: { fontFamily: fonts.displayHeavy, fontSize: 52, lineHeight: 52, paddingBottom: 10, marginBottom: -10, color: colors.paper, paddingTop: ACCENT_PAD, marginTop: -ACCENT_PAD },
  heroSub: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 19, color: colors.mist },
  formRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  card: { padding: 16, borderRadius: 22, backgroundColor: colors.white, gap: 6 },
  label: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 19, color: colors.inkSoft },
  big: { fontFamily: fonts.displayHeavy, fontSize: 48, lineHeight: 48, paddingBottom: 10, marginBottom: -10, color: colors.ink },
  line: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 21, color: colors.ink },
  muted: { color: colors.inkSoft },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '48.5%', padding: 14, borderRadius: 18, backgroundColor: colors.white, gap: 2 },
  tileWide: { width: '100%' },
  tileValue: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 32, paddingBottom: 6, marginBottom: -6, color: colors.ink },
  tileLabel: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 17, color: colors.inkSoft },
  commonHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commonRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, borderTopWidth: 1, borderTopColor: colors.navLine },
  commonName: { flex: 1, minWidth: 0, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  commonCol: { width: 64, textAlign: 'right', fontFamily: fonts.bodyBold, fontSize: 12, color: colors.inkSoft },
  commonValue: { width: 64, textAlign: 'right', fontFamily: fonts.displayHeavy, fontSize: 22, lineHeight: 24, paddingBottom: 4, marginBottom: -4, color: colors.ink },
  fair: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
});
