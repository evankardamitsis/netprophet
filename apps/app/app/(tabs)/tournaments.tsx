import { useCallback, useRef, type ReactNode } from 'react';
import { Linking, RefreshControl, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { greekCaps } from '@netprophet/copy';
import type { GetTournamentsResult, TournamentItem, UpcomingTournamentsResult } from '@netprophet/db';
import { Logo } from '../../src/components/Logo';
import { useCopy } from '../../src/i18n';
import { useTournaments, useUpcomingTournaments } from '../../src/lib/data';
import { useTabScrollTop } from '../../src/lib/scrollTop';
import { usePress, useStgIn } from '../../src/lib/motion';
import { nextFooter, nextRow, type NextRow } from '../../src/lib/nextTournament';
import { blocksOf, boldLine, chipOf, mineHeadline, mineRows, sectionsOf, subLine, todayKey, type TournamentSection } from '../../src/lib/tournaments';
import { colors, fonts, text } from '../../src/theme';
import { isHttpsUrl, safeOpen } from '../../src/lib/openUrl';

/**
 * The Τουρνουά tab, «Τα τουρνουά σου» (founder, 14 Oct: a tab in the bottom bar that also holds «+ Ματς»). Founder,
 * 19 Oct ("optimize UX and not overwhelm the user"): your own first (Pro: «Το πρόγραμμά σου», then «Τα δικά σου»),
 * then what is on now and the next one near you, then the rest; the order is `blocksOf`. Pro is one quiet line under
 * your own things, never above them. Player search is a small text line under the title (it is Παίκτες' job), and
 * the screen ends with an ink way back to the votes. Nothing here is blue: no action on this screen is the primary one.
 */
const STG_MS = 600;
const STAGGER = 70;

export default function TournamentsScreen() {
  // a tap on the open tab (or two) scrolls back to the top
  const scrollRef = useRef<ScrollView>(null);
  useTabScrollTop(scrollRef);
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
  const program = !!data?.pro && (data.mine?.length ?? 0) > 0;
  const blocks = blocksOf({ sections, program, next: !!upcoming.data && (upcoming.data.items.length > 0 || upcoming.data.more > 0) });
  let n = 0;
  const next = () => n++;

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading && data !== null} onRefresh={refresh} tintColor={colors.ink} />}
      >
        <Reveal i={next()}>
          <View style={styles.headBlock}>
            <View style={styles.head}>
              <Text style={styles.title}>{c.title}</Text>
              <AddMatch />
            </View>
            {/* what this tab is for, as on Αποτελέσματα and the Ladder (founder, 21 Oct) */}
            <Text style={styles.subtitle}>{c.subtitle}</Text>
          </View>
        </Reveal>
        <SearchLink i={next()} />
        {data ? (
          <>
            {sections.length === 0 ? <Text style={styles.empty}>{c.empty}</Text> : null}
            {blocks.map((b) => {
              if (b.kind === 'program') return <ProCard key="program" mine={data.mine ?? []} today={today} i={next()} />;
              if (b.kind === 'pro') return data.pro ? <AlertsOn key="pro" i={next()} /> : <AlertsRow key="pro" i={next()} />;
              if (b.kind === 'next') return upcoming.data ? <NextSection key="next" data={upcoming.data} i={next()} /> : null;
              return <Section key={b.section.key} section={b.section} today={today} next={next} />;
            })}
            <ToVotes i={next()} />
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

/** «+ Ματς»: log a match you played; an ink pill */
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

/** a small text line under the title: opens Παίκτες with the keyboard up (founder, 19 Oct: search is secondary here) */
function SearchLink({ i }: { i: number }) {
  const t = useCopy();
  const press = usePress(0.97);
  return (
    <Reveal i={i}>
      <Pressable accessibilityRole="search" onPress={() => router.push('/players?focus=1')} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={styles.searchHit}>
        <Animated.View style={press.style}>
          <Text style={styles.searchText}>{t.tournaments.search}</Text>
        </Animated.View>
      </Pressable>
    </Reveal>
  );
}

/** one section: its label, then its tournaments */
function Section({ section, today, next }: { section: TournamentSection; today: string; next: () => number }) {
  return (
    <View style={styles.group}>
      <Reveal i={next()}>
        <Text style={styles.groupTitle}>{greekCaps(section.title)}</Text>
      </Reveal>
      {section.items.map((item) => (
        <TournamentRow key={item.id} item={item} today={today} i={next()} />
      ))}
    </View>
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

/** without Pro: one quiet line to Pro, under your own things (founder, 19 Oct: Pro never above them, and no blue) */
function AlertsRow({ i }: { i: number }) {
  const t = useCopy();
  return (
    <Reveal i={i}>
      <QuietLine label={t.tournaments.alerts.row} to="/pro?from=tournaments" />
    </Reveal>
  );
}

/** a quiet ink text line that opens a page, 44pt to tap */
function QuietLine({ label, to }: { label: string; to: '/pro?from=tournaments' | '/pro?from=next_tournament' }) {
  const press = usePress(0.98);
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(to)} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={styles.quietHit}>
      <Animated.View style={press.style}>
        <Text style={styles.quietText}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/** with Pro and nothing scheduled yet: the alerts are on, in the same quiet slot */
function AlertsOn({ i }: { i: number }) {
  const t = useCopy();
  return (
    <Reveal i={i}>
      <View style={styles.quietHit}>
        <Text style={styles.quietText}>{t.tournaments.alerts.on}</Text>
        <Text style={styles.nextOn}>{t.tournaments.alerts.onEmpty}</Text>
      </View>
    </Reveal>
  );
}

/**
 * «Το επόμενο τουρνουά για σένα» (Pro, 17 Oct 2026): tournaments still to come, your area first, entry closing
 * soonest. Free sees the first in full and one quiet line to Pro.
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
          <Logo path={row.logo} name={row.name} size={24} />
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
              style={styles.enterHit}
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

/** free: the rest of the list and the reminder are Pro; the same quiet line as the alerts */
function LockedLine({ text: label }: { text: string }) {
  return <QuietLine label={label} to="/pro?from=next_tournament" />;
}

/** the last line: back to the votes; ink, like Κατάταξη's way back, as nothing on this screen is the primary action */
function ToVotes({ i }: { i: number }) {
  const t = useCopy();
  const press = usePress();
  return (
    <Reveal i={i}>
      <Pressable accessibilityRole="button" onPress={() => router.navigate('/')} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
        <Animated.View style={[styles.votes, press.style]}>
          <Text style={styles.votesText}>{t.tournaments.toVotes}</Text>
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
            <View style={styles.nameRow}>
              <Logo path={item.logo} name={item.name} size={24} />
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
  // a small text line under the title, 44pt to tap; the negative margin keeps the gap to what follows
  searchHit: { alignSelf: 'flex-start', minHeight: 44, marginTop: -10, marginBottom: -6, justifyContent: 'center' },
  searchText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.inkSoft, textDecorationLine: 'underline' },
  title: { ...text.title, flexShrink: 1 },
  headBlock: { gap: 6 },
  subtitle: text.subtitle,
  proCard: { padding: 18, borderRadius: 24, backgroundColor: colors.ink, gap: 10 },
  proHead: { fontFamily: fonts.displayHeavy, fontSize: 34, lineHeight: 36, paddingBottom: 7, marginBottom: -7, color: colors.lime },
  proLabel: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.78, color: colors.mist },
  mineRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  mineWhen: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.paper },
  mineWhat: { flexShrink: 1, fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 20, color: colors.mist, textAlign: 'right' },
  alertsOn: { marginTop: 4, fontFamily: fonts.bodyBold, fontSize: 14, color: colors.mist },
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
  // 44pt to tap around the 36pt pill; the negative margin keeps the layout
  enterHit: { minHeight: 44, marginVertical: -4, justifyContent: 'center' },
  enter: { minHeight: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  enterText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.paper },
  quietHit: { minHeight: 44, paddingHorizontal: 4, justifyContent: 'center', gap: 2 },
  quietText: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.ink },
  votes: { minHeight: 48, marginTop: 8, borderRadius: 999, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  votesText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.paper },
  nextOn: { paddingHorizontal: 4, fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 19, color: colors.inkSoft },
  empty: { paddingTop: 4, paddingHorizontal: 12, fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.inkSoft },
});
