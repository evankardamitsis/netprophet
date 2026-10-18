import { useCallback, type ReactNode } from 'react';
import { Linking, RefreshControl, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { greekCaps } from '@netprophet/copy';
import type { GetTournamentsResult, TournamentItem, UpcomingTournamentsResult } from '@netprophet/db';
import { Logo } from '../../src/components/Logo';
import { useCopy } from '../../src/i18n';
import { useTournaments, useUpcomingTournaments } from '../../src/lib/data';
import { usePress, useStgIn } from '../../src/lib/motion';
import { nextFooter, nextRow, type NextRow } from '../../src/lib/nextTournament';
import { boldLine, chipOf, mineHeadline, mineRows, sectionsOf, subLine, todayKey } from '../../src/lib/tournaments';
import { colors, fonts, text } from '../../src/theme';
import { isHttpsUrl, safeOpen } from '../../src/lib/openUrl';

/**
 * The Τουρνουά tab, «Τα τουρνουά σου» (founder, 14 Oct: a tab in the bottom bar that also holds «+ Ματς»): your
 * tournaments that are on, coming or just finished. With Pro, the ink card «Το πρόγραμμά σου» lists your next
 * matches; without it, one outlined line opens Pro (the screen's one blue element). «+ Ματς» sits by the title as an
 * ink pill, and player search opens from here (Παίκτες is no longer a tab).
 */
const STG_MS = 600;
const STAGGER = 70;

export default function TournamentsScreen() {
  const t = useCopy();
  const c = t.tournaments;
  const { data, loading, error, refresh: refreshList } = useTournaments();
  const upcoming = useUpcomingTournaments();
  const refreshUpcoming = upcoming.refresh;
  const refresh = useCallback(async () => {
    await Promise.all([refreshList(), refreshUpcoming()]);
  }, [refreshList, refreshUpcoming]);
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
        <Reveal i={next()}>
          <View style={styles.head}>
            <Text style={styles.title}>{c.title}</Text>
            <AddMatch />
          </View>
        </Reveal>
        {data ? (
          <>
            <SearchEntry i={next()} />
            {data.pro ? (
              data.mine && data.mine.length > 0 ? (
                <ProCard mine={data.mine} today={today} i={next()} />
              ) : (
                <AlertsOn i={next()} />
              )
            ) : (
              <AlertsCard i={next()} />
            )}
            {upcoming.data ? <NextSection data={upcoming.data} i={next()} /> : null}
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

/** «+ Ματς»: log a match you played; an ink pill, so Pro stays the screen's one blue */
function AddMatch() {
  const t = useCopy();
  const press = usePress();
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push('/add-match')} onPressIn={press.onPressIn} onPressOut={press.onPressOut} hitSlop={6}>
      <Animated.View style={[styles.add, press.style]}>
        <Text style={styles.addText}>{t.addMatch.cta}</Text>
      </Animated.View>
    </Pressable>
  );
}

/** looks like the search field; opens Παίκτες with the keyboard up */
function SearchEntry({ i }: { i: number }) {
  const t = useCopy();
  const press = usePress(0.98);
  return (
    <Reveal i={i}>
      <Pressable accessibilityRole="search" onPress={() => router.push('/players?focus=1')} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
        <Animated.View style={[styles.search, press.style]}>
          <Text style={styles.searchText}>{t.tournaments.search}</Text>
        </Animated.View>
      </Pressable>
    </Reveal>
  );
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
        <Text style={styles.alertsOn}>{t.tournaments.alerts.on}</Text>
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

/**
 * without Pro: what Pro sends you, on top of the screen (founder, 14 Oct: "push Pro features high very high up,
 * especially my tournaments and matches notifications reminders"); the blue button is the screen's one blue
 */
function AlertsCard({ i }: { i: number }) {
  const t = useCopy();
  const a = t.tournaments.alerts;
  const press = usePress();
  return (
    <Reveal i={i}>
      <View style={styles.proCard}>
        <Text style={styles.alertsTitle}>{a.title}</Text>
        <Text style={styles.alertLine}>{a.short}</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/pro?from=tournaments')} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
          <Animated.View style={[styles.alertsCta, press.style]}>
            <Text style={styles.alertsCtaText}>{a.cta}</Text>
          </Animated.View>
        </Pressable>
      </View>
    </Reveal>
  );
}

/** with Pro and nothing scheduled yet: the alerts are on */
function AlertsOn({ i }: { i: number }) {
  const t = useCopy();
  return (
    <Reveal i={i}>
      <View style={styles.proCard}>
        <Text style={styles.alertsOnBig}>{t.tournaments.alerts.on}</Text>
        <Text style={styles.alertLine}>{t.tournaments.alerts.onEmpty}</Text>
      </View>
    </Reveal>
  );
}

/**
 * «Το επόμενο τουρνουά για σένα» (Pro, 17 Oct 2026): tournaments still to come, your area first, entry closing
 * soonest. Free sees the first in full and an ink line to Pro (the alerts card above keeps the one blue).
 */
function NextSection({ data, i }: { data: UpcomingTournamentsResult; i: number }) {
  const t = useCopy();
  if (data.items.length === 0 && data.more === 0) return null;
  const footer = nextFooter(data, t);
  return (
    <View style={styles.group}>
      <Reveal i={i}>
        <Text style={styles.groupTitle}>{greekCaps(t.tournaments.next.title)}</Text>
      </Reveal>
      {data.items.map((item, k) => (
        <NextCard key={item.id} row={nextRow(item, t)} i={i + 1 + k} />
      ))}
      <Reveal i={i + 1 + data.items.length}>
        {footer.locked ? <LockedLine text={footer.text} /> : <Text style={styles.nextOn}>{footer.text}</Text>}
      </Reveal>
    </View>
  );
}

function NextCard({ row, i }: { row: NextRow; i: number }) {
  const t = useCopy();
  const press = usePress();
  const enter = useStgIn(STG_MS, Math.min(i, 8) * STAGGER);
  const link = isHttpsUrl(row.link) ? row.link : null;
  return (
    <Animated.View style={[styles.card, enter]}>
      <View style={styles.cardTop}>
        <View style={styles.nameRow}>
          <Logo path={row.logo} name={row.name} size={26} />
          <Text style={styles.name}>{row.name}</Text>
        </View>
        {row.played ? (
          <View style={styles.chip}>
            <Text style={styles.chipText}>{t.tournaments.next.played}</Text>
          </View>
        ) : null}
      </View>
      {row.where ? <Text style={styles.sub}>{row.where}</Text> : null}
      {row.categories ? <Text style={styles.sub}>{row.categories}</Text> : null}
      {row.deadline || link ? (
        <View style={styles.nextBottom}>
          {row.deadline ? <Text style={styles.bold}>{row.deadline}</Text> : <View />}
          {link ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => safeOpen(link, (u) => Linking.openURL(u))}
              onPressIn={press.onPressIn}
              onPressOut={press.onPressOut}
              hitSlop={6}
            >
              <Animated.View style={[styles.enter, press.style]}>
                <Text style={styles.enterText}>{t.tournaments.next.enter}</Text>
              </Animated.View>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Animated.View>
  );
}

/** free: the rest of the list and the reminder are Pro; an outlined ink line, so the alerts card keeps the one blue */
function LockedLine({ text: label }: { text: string }) {
  const press = usePress(0.98);
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push('/pro?from=next_tournament')} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[styles.locked, press.style]}>
        <Text style={styles.lockedText}>{label}</Text>
      </Animated.View>
    </Pressable>
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
            <View style={styles.nameRow}>
              <Logo path={item.logo} name={item.name} size={26} />
              <Text style={styles.name}>{item.name}</Text>
            </View>
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
  head: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, paddingTop: 8 },
  add: { minHeight: 44, paddingHorizontal: 16, borderRadius: 999, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  addText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.paper },
  search: { minHeight: 52, paddingHorizontal: 16, borderRadius: 16, borderWidth: 2, borderColor: colors.fog, backgroundColor: colors.white, justifyContent: 'center' },
  searchText: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.inkSoft },
  title: { ...text.title, flexShrink: 1 },
  proCard: { padding: 18, borderRadius: 24, backgroundColor: colors.ink, gap: 10 },
  proHead: { fontFamily: fonts.displayHeavy, fontSize: 34, lineHeight: 36, paddingBottom: 7, marginBottom: -7, color: colors.lime },
  proLabel: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.78, color: colors.mist },
  mineRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  mineWhen: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.paper },
  mineWhat: { flexShrink: 1, fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 20, color: colors.mist, textAlign: 'right' },
  alertsTitle: { ...text.heading, fontSize: 22, lineHeight: 24, color: colors.paper },
  alertLine: { flexShrink: 1, fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 21, color: colors.mist },
  alertsCta: { minHeight: 48, marginTop: 2, borderRadius: 999, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  alertsCtaText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.white },
  alertsOn: { marginTop: 4, fontFamily: fonts.bodyBold, fontSize: 14, color: colors.mist },
  alertsOnBig: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.paper },
  group: { gap: 10 },
  groupTitle: { ...text.label, marginTop: 4 },
  card: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 24, backgroundColor: colors.white, gap: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  // the logo sits by the name; the name wraps beside it
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  name: { ...text.heading, flexShrink: 1 },
  chip: { minHeight: 24, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.sand, alignItems: 'center', justifyContent: 'center' },
  chipHot: { backgroundColor: colors.lime },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.ink },
  sub: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 19, color: colors.inkSoft },
  bold: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 19, color: colors.ink },
  nextBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 2 },
  enter: { minHeight: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  enterText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.paper },
  locked: { minHeight: 48, paddingHorizontal: 16, borderRadius: 16, borderWidth: 2, borderColor: colors.ink, justifyContent: 'center' },
  lockedText: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.ink },
  nextOn: { paddingHorizontal: 4, fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 19, color: colors.inkSoft },
  empty: { paddingTop: 4, paddingHorizontal: 12, fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.inkSoft },
});
