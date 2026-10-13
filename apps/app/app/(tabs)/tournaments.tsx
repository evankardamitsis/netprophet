import type { ReactNode } from 'react';
import { RefreshControl, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { greekCaps } from '@netprophet/copy';
import type { GetTournamentsResult, TournamentItem } from '@netprophet/db';
import { useCopy } from '../../src/i18n';
import { useTournaments } from '../../src/lib/data';
import { usePress, useStgIn } from '../../src/lib/motion';
import { boldLine, chipOf, mineHeadline, mineRows, sectionsOf, subLine, todayKey } from '../../src/lib/tournaments';
import { colors, fonts } from '../../src/theme';

/**
 * «Τα τουρνουά σου» (prototype V2, isTour): the tournaments that are on, coming or just finished. With Pro, the ink
 * card «Το πρόγραμμά σου» lists my next matches; without it, one outlined line opens Pro (the screen's one blue
 * element). Opens from Εγώ (back: «‹ Εγώ») or from the feed link (back: «‹ Πίσω»).
 */
const STG_MS = 600;
const STAGGER = 70;
/** the 60px title's tonos would be clipped by its tight line height on iOS */
const ACCENT_PAD = 10;

export default function TournamentsScreen() {
  const t = useCopy();
  const c = t.tournaments;
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { data, loading, error, refresh } = useTournaments();
  const back = usePress();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/me'));
  const today = todayKey();
  const sections = data ? sectionsOf(data.items, t) : [];
  let n = 0;
  const next = () => n++;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading && data !== null} onRefresh={refresh} tintColor={colors.ink} />}
      >
        <Pressable accessibilityRole="button" onPress={goBack} onPressIn={back.onPressIn} onPressOut={back.onPressOut} style={styles.backHit}>
          <Animated.Text style={[styles.back, back.style]}>{from === 'feed' ? c.backFeed : c.backMe}</Animated.Text>
        </Pressable>
        <Reveal i={next()}>
          <Text style={styles.title}>{c.title}</Text>
        </Reveal>
        {data ? (
          <>
            {data.pro ? (
              data.mine && data.mine.length > 0 ? (
                <ProCard mine={data.mine} today={today} i={next()} />
              ) : null
            ) : (
              <ProButton i={next()} />
            )}
            {sections.map((s) => (
              <View key={s.key} style={styles.group}>
                <Reveal i={next()}>
                  <Text style={styles.groupTitle}>{greekCaps(s.title)}</Text>
                </Reveal>
                {s.items.map((item) => (
                  <TournamentRow key={item.id} item={item} today={today} i={next()} />
                ))}
              </View>
            ))}
            {sections.length === 0 ? <Text style={styles.empty}>{c.empty}</Text> : null}
          </>
        ) : null}
        {!loading && error && !data ? <Text style={styles.empty}>{c.error}</Text> : null}
      </ScrollView>
    </View>
  );
}

function Reveal({ i, children }: { i: number; children: ReactNode }) {
  const enter = useStgIn(STG_MS, Math.min(i, 8) * STAGGER);
  return <Animated.View style={enter}>{children}</Animated.View>;
}

/** the ink card: «Παίζεις Σάββατο 10:00», then each of my next matches as when / what */
function ProCard({ mine, today, i }: { mine: NonNullable<GetTournamentsResult['mine']>; today: string; i: number }) {
  const t = useCopy();
  const rows = mineRows(mine, t);
  const headline = mineHeadline(mine, today, t);
  return (
    <Reveal i={i}>
      <View style={styles.proCard}>
        {headline ? <Text style={styles.proHead}>{headline}</Text> : null}
        <Text style={styles.proLabel}>{greekCaps(t.tournaments.program)}</Text>
        {rows.map((r, k) => (
          <MineLine key={r.key} when={r.when} what={r.what} i={k} />
        ))}
      </View>
    </Reveal>
  );
}

function MineLine({ when, what, i }: { when: string; what: string; i: number }) {
  const enter = useStgIn(STG_MS - 100, 200 + Math.min(i, 6) * STAGGER);
  return (
    <Animated.View style={[styles.mineRow, enter]}>
      <Text style={styles.mineWhen}>{when}</Text>
      <Text style={styles.mineWhat}>{what}</Text>
    </Animated.View>
  );
}

/** without Pro: one outlined line; «Pro ›» is the blue */
function ProButton({ i }: { i: number }) {
  const t = useCopy();
  const press = usePress();
  return (
    <Reveal i={i}>
      <Pressable accessibilityRole="button" onPress={() => router.push('/pro?from=tournaments')} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
        <Animated.View style={[styles.proButton, press.style]}>
          <Text style={styles.proButtonText}>{t.tournaments.proButton}</Text>
          <Text style={styles.proMark}>{t.tournaments.proMark}</Text>
        </Animated.View>
      </Pressable>
    </Reveal>
  );
}

function TournamentRow({ item, today, i }: { item: TournamentItem; today: string; i: number }) {
  const t = useCopy();
  const press = usePress(0.97);
  const enter = useStgIn(STG_MS, Math.min(i, 8) * STAGGER);
  const chip = chipOf(item, today, t);
  const sub = subLine(item, t);
  const bold = boldLine(item, t);
  return (
    <Animated.View style={enter}>
      <Pressable accessibilityRole="button" onPress={() => router.push(`/tournament/${item.id}`)} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
        <Animated.View style={[styles.card, press.style]}>
          <View style={styles.cardTop}>
            <Text style={styles.name}>{item.name}</Text>
            <View style={[styles.chip, chip.hot && styles.chipHot]}>
              <Text style={styles.chipText}>{chip.text}</Text>
            </View>
          </View>
          {sub ? <Text style={styles.sub}>{sub}</Text> : null}
          {bold ? <Text style={styles.bold}>{bold}</Text> : null}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  scroll: { paddingTop: 8, paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  backHit: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' },
  back: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  title: { fontFamily: fonts.displayHeavy, fontSize: 60, lineHeight: 60, paddingBottom: 12, marginBottom: -15, color: colors.ink, paddingTop: ACCENT_PAD, marginTop: -ACCENT_PAD },
  proCard: { padding: 18, borderRadius: 24, backgroundColor: colors.ink, gap: 10 },
  proHead: { fontFamily: fonts.displayHeavy, fontSize: 34, lineHeight: 36, paddingBottom: 7, marginBottom: -7, color: colors.lime },
  proLabel: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.78, color: colors.mist },
  mineRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  mineWhen: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.paper },
  mineWhat: { flexShrink: 1, fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 20, color: colors.mist, textAlign: 'right' },
  proButton: { minHeight: 56, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, borderWidth: 2, borderColor: colors.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  proButtonText: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.ink },
  proMark: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.blue },
  group: { gap: 10 },
  groupTitle: { marginTop: 4, fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17, letterSpacing: 0.52, color: colors.inkSoft },
  card: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 24, backgroundColor: colors.white, gap: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  name: { flexShrink: 1, fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 32, paddingBottom: 6, marginBottom: -6, color: colors.ink },
  chip: { minHeight: 24, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.sand, alignItems: 'center', justifyContent: 'center' },
  chipHot: { backgroundColor: colors.lime },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.ink },
  sub: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 19, color: colors.inkSoft },
  bold: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 19, color: colors.ink },
  empty: { paddingTop: 4, paddingHorizontal: 12, fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.inkSoft },
});
