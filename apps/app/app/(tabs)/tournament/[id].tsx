import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import type { GetTournamentResult } from '@netprophet/db';
import { ScheduleCard } from '../../../src/components/ScheduleCard';
import { Logo } from '../../../src/components/Logo';
import { Toast } from '../../../src/components/Toast';
import { useCopy } from '../../../src/i18n';
import { useApi, useTournament } from '../../../src/lib/data';
import { followToast, toggleFollow } from '../../../src/lib/follow';
import { BracketTree } from '../../../src/components/BracketTree';
import { RoundRobin } from '../../../src/components/RoundRobin';
import { track } from '../../../src/lib/analytics';
import { usePress, useStgIn } from '../../../src/lib/motion';
import { SCHEDULE_RATIO, scheduleMessage, shareView } from '../../../src/lib/scheduleShare';
import { shareCard } from '../../../src/lib/shareCard';
import { fmt } from '../../../src/lib/votes';
import {
  bracketRounds,
  dayLong,
  groupViews,
  dayChips,
  defaultDay,
  defaultSegment,
  scheduleRows,
  segmentsOf,
  subLine,
  todayKey,
  type ScheduleRow,
  type Segment,
} from '../../../src/lib/tournaments';
import { colors, fonts, text } from '../../../src/theme';

/**
 * One tournament (prototype V2, «Τα τουρνουά σου» opened): «Πρόγραμμα» (the matches of a day, by time, mine marked)
 * and «Ταμπλό» (the organiser's draws, round by round). Names in the draws are the sheet's own text; a name matched to
 * a roster player opens their profile.
 */
const STG_MS = 600;
const STAGGER = 70;

export default function TournamentScreen() {
  const t = useCopy();
  const c = t.tournaments;
  // ?draw=<tab>: a «Βγήκε η κλήρωση» push opens straight on that draw; ?day=YYYY-MM-DD: «το αυριανό πρόγραμμα» on that day
  const { id, draw, day } = useLocalSearchParams<{ id: string; draw?: string; day?: string }>();
  const { data, loading, error, notFound, refresh } = useTournament(String(id));
  const back = usePress();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/tournaments'));
  const today = todayKey();
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null);
  const say = (text: string) => setToast((p) => ({ text, n: (p?.n ?? 0) + 1 }));

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading && data !== null} onRefresh={refresh} tintColor={colors.ink} />}
      >
        <Pressable accessibilityRole="button" onPress={goBack} onPressIn={back.onPressIn} onPressOut={back.onPressOut} style={styles.backHit}>
          <Animated.Text style={[styles.back, back.style]}>{c.detail.back}</Animated.Text>
        </Pressable>
        {data ? <Body key={data.id} d={data} today={today} openDraw={draw} openDay={day} onToast={say} /> : null}
        {!data && notFound ? <Text style={styles.empty}>{c.detail.notFound}</Text> : null}
        {!data && !loading && error && !notFound ? <Text style={styles.empty}>{c.detail.error}</Text> : null}
      </ScrollView>
      {toast ? <Toast key={toast.n} text={toast.text} /> : null}
    </View>
  );
}

function Reveal({ i, children }: { i: number; children: ReactNode }) {
  const enter = useStgIn(STG_MS, Math.min(i, 8) * STAGGER);
  return <Animated.View style={enter}>{children}</Animated.View>;
}

function Body({ d, today, openDraw, openDay, onToast }: { d: GetTournamentResult; today: string; openDraw?: string; openDay?: string; onToast: (text: string) => void }) {
  const t = useCopy();
  const segments = segmentsOf(d);
  const [picked, setPicked] = useState<Segment | null>(
    openDraw && d.draws.some((x) => x.tab === openDraw) ? 'bracket' : openDay && d.days.some((x) => x.date === openDay) ? 'schedule' : null,
  );
  const seg = picked && segments.includes(picked) ? picked : defaultSegment(d, today);
  const sub = subLine(d, t);
  return (
    <>
      <Reveal i={0}>
        <View style={styles.titleRow}>
          <Logo path={d.logo} name={d.name} size={36} />
          <Text style={styles.title}>{d.name}</Text>
          <FollowPill d={d} onToast={onToast} />
        </View>
      </Reveal>
      {sub ? (
        <Reveal i={1}>
          <Text style={styles.sub}>{sub}</Text>
        </Reveal>
      ) : null}
      {segments.length > 1 ? (
        <Reveal i={2}>
          <View style={styles.seg}>
            {segments.map((s) => (
              <Pressable key={s} accessibilityRole="tab" accessibilityState={{ selected: seg === s }} onPress={() => setPicked(s)} style={[styles.segBtn, seg === s && styles.segOn]}>
                <Text style={[styles.segText, seg === s && styles.segTextOn]}>{s === 'schedule' ? t.tournaments.detail.schedule : t.tournaments.detail.bracket}</Text>
              </Pressable>
            ))}
          </View>
        </Reveal>
      ) : null}
      {segments.length === 0 ? <Text style={styles.empty}>{t.tournaments.detail.noDraws}</Text> : null}
      {segments.length > 0 && seg === 'schedule' ? <Schedule d={d} today={today} openDay={openDay} /> : null}
      {segments.length > 0 && seg === 'bracket' ? <Bracket d={d} openDraw={openDraw} /> : null}
    </>
  );
}

/**
 * «Ακολούθησε» / «✓ Ακολουθείς» at the right end of the header (founder, 21 Oct: free for everyone): text, not an
 * icon; white to follow, ink once you do, never blue (the screen's actions are all ink). It flips at once and goes
 * back if the server says no; the toast says what changed.
 */
function FollowPill({ d, onToast }: { d: GetTournamentResult; onToast: (text: string) => void }) {
  const t = useCopy();
  const c = t.tournaments.detail;
  const api = useApi();
  const press = usePress();
  const [on, setOn] = useState(d.followed === true);
  const [busy, setBusy] = useState(false);
  useEffect(() => setOn(d.followed === true), [d.followed]);
  const tap = async () => {
    if (busy) return;
    setBusy(true);
    const out = await toggleFollow({ on, set: setOn, call: api ? (next) => api.followTournament(d.id, next) : null });
    setBusy(false);
    onToast(followToast(out, t));
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on, busy }}
      accessibilityLabel={on ? c.following : c.follow}
      onPress={() => void tap()}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={styles.followHit}
    >
      <Animated.View style={[styles.follow, on && styles.followOn, press.style]}>
        <Text style={[styles.followText, on && styles.followTextOn]}>{on ? c.following : c.follow}</Text>
      </Animated.View>
    </Pressable>
  );
}

/** a pill in a row of choices: ink when picked */
function Pill({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const press = usePress();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={styles.pillHit}>
      <Animated.View style={[styles.pill, on && styles.pillOn, press.style]}>
        <Text style={[styles.pillText, on && styles.pillTextOn]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/* ================= Πρόγραμμα ================= */

function Schedule({ d, today, openDay }: { d: GetTournamentResult; today: string; openDay?: string }) {
  const t = useCopy();
  const chips = dayChips(d.days, today, t);
  const [pickedDay, setPickedDay] = useState<string | null>(openDay ?? null);
  const day = pickedDay && d.days.some((x) => x.date === pickedDay) ? pickedDay : defaultDay(d.days, today) ?? d.days[0]?.date ?? null;
  const rows = scheduleRows(d.days.find((x) => x.date === day)?.matches ?? [], d.me, t);
  const sh = t.tournaments.detail.share;
  const card = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const press = usePress();
  const view = shareView(rows, t.tournaments.detail.masked);
  // «Μοιράσου»: the day as a picture through the share sheet (the words and the link on the web)
  const share = async () => {
    if (!day || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const via = await shareCard(card, scheduleMessage(t, d.name, day), fmt(sh.title, { day: dayLong(day, t) }), SCHEDULE_RATIO);
      track('schedule_shared', { via, matches: rows.length });
    } catch {
      setFailed(true);
    }
    setBusy(false);
  };
  return (
    <View style={styles.block}>
      <View style={styles.dayBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll} contentContainerStyle={styles.pillRow}>
          {chips.map((ch) => (
            <Pill key={ch.key} label={ch.label} on={ch.key === day} onPress={() => setPickedDay(ch.key)} />
          ))}
        </ScrollView>
        {rows.length > 0 ? (
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void share()} onPressIn={press.onPressIn} onPressOut={press.onPressOut} hitSlop={8} style={styles.shareHit}>
            <Animated.Text style={[styles.share, busy && styles.shareBusy, press.style]}>{busy ? sh.making : sh.action}</Animated.Text>
          </Pressable>
        ) : null}
      </View>
      {failed ? <Text style={styles.shareFailed}>{sh.failed}</Text> : null}
      {Platform.OS !== 'web' && day && rows.length > 0 ? (
        <View pointerEvents="none" style={styles.offscreen}>
          <ScheduleCard ref={card} width={360} name={d.name} day={dayLong(day, t)} venue={d.venue} view={view} moreLabel={view.more > 0 ? fmt(sh.more, { n: view.more }) : null} />
        </View>
      ) : null}
      <View key={day ?? 'none'} style={styles.list}>
        {rows.map((r, i) => (
          <MatchRow key={r.id} row={r} i={i} />
        ))}
        {rows.length === 0 ? <Text style={styles.empty}>{t.tournaments.detail.noMatchesDay}</Text> : null}
      </View>
    </View>
  );
}

function MatchRow({ row, i }: { row: ScheduleRow; i: number }) {
  const detail = useCopy().tournaments.detail;
  const dash = detail.masked;
  const postponedChip = detail.postponed;
  const enter = useStgIn(STG_MS - 100, Math.min(i, 8) * STAGGER);
  const fg = row.mine ? colors.paper : colors.ink;
  const soft = row.mine ? colors.mist : colors.inkSoft;
  return (
    <Animated.View style={[styles.matchCard, row.mine && styles.matchMine, enter]}>
      <View style={styles.timeCol}>
        <Text style={[row.postponed ? styles.timeOff : styles.time, { color: row.postponed ? soft : fg }]}>{row.time}</Text>
        {row.movedFrom ? <Text style={[styles.movedFrom, { color: soft }]}>{row.movedFrom}</Text> : null}
      </View>
      <View style={styles.matchBody}>
        {row.meta || row.postponed ? (
          <View style={styles.metaRow}>
            {row.meta ? <Text style={[styles.meta, { color: soft }]}>{row.meta}</Text> : null}
            {row.postponed ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>{postponedChip}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        {row.place ? (
          <View style={styles.placeRow}>
            {row.club ? <Logo path={row.club.logo} name={row.club.name} size={16} onInk={row.mine} /> : null}
            <Text style={[styles.place, { color: soft }]}>{row.place}</Text>
          </View>
        ) : null}
        {row.sides.map((s, k) => (
          <Text key={k} style={[s.winner ? styles.nameWin : styles.name, { color: fg }]} numberOfLines={1}>
            {s.people.length === 0 ? dash : null}
            {s.people.map((p, j) => (
              <Text key={p.id} onPress={() => router.push(`/player/${p.id}`)} suppressHighlighting>
                {j > 0 ? ' & ' : ''}
                {p.surname} {p.first.slice(0, 1)}.
              </Text>
            ))}
          </Text>
        ))}
        {row.score ? <Text style={[styles.score, { color: soft }]}>{row.score}</Text> : null}
      </View>
    </Animated.View>
  );
}
/* ================= Ταμπλό ================= */

function Bracket({ d, openDraw }: { d: GetTournamentResult; openDraw?: string }) {
  const t = useCopy();
  const [pickedTab, setPickedTab] = useState<string | null>(openDraw ?? null);
  const draw = d.draws.find((x) => x.tab === pickedTab) ?? d.draws[0]!;
  const robin = draw.format === 'round_robin';
  const rounds = robin ? [] : bracketRounds(draw, d.masked, t);
  const groups = robin ? groupViews(draw, d.masked, d.me, t) : [];
  return (
    <View style={styles.block}>
      {d.draws.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
          {d.draws.map((x) => (
            <Pill key={x.tab} label={x.tab} on={x.tab === draw.tab} onPress={() => setPickedTab(x.tab)} />
          ))}
        </ScrollView>
      ) : null}
      {robin ? (
        groups.length === 0 ? <Text style={styles.empty}>{t.tournaments.detail.noDraws}</Text> : <RoundRobin key={draw.tab} groups={groups} />
      ) : rounds.length === 0 ? (
        <Text style={styles.empty}>{t.tournaments.detail.noDraws}</Text>
      ) : (
        <BracketTree key={draw.tab} rounds={rounds} me={d.me} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  scroll: { paddingTop: 8, paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  backHit: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' },
  back: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { ...text.title, flexShrink: 1 },
  // the follow pill keeps to the right end; 44pt to tap around the 36pt pill
  followHit: { marginLeft: 'auto', flexShrink: 0, minHeight: 44, justifyContent: 'center' },
  follow: { minHeight: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  followOn: { backgroundColor: colors.ink },
  followText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  followTextOn: { color: colors.paper },
  sub: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.inkSoft },
  seg: { flexDirection: 'row', gap: 6, padding: 5, borderRadius: 18, backgroundColor: colors.white },
  segBtn: { flex: 1, minHeight: 48, paddingHorizontal: 4, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: colors.ink },
  segText: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 17, textAlign: 'center', color: colors.ink },
  segTextOn: { color: colors.paper },
  block: { gap: 12 },
  pillRow: { gap: 8, paddingRight: 20 },
  dayBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayScroll: { flex: 1 },
  // quiet: a word, not a button (the screen's blue stays free)
  shareHit: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end' },
  share: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 18, color: colors.inkSoft },
  shareBusy: { opacity: 0.5 },
  shareFailed: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17, color: colors.inkSoft, textAlign: 'right' },
  // drawn off the screen so it can be captured at its own size
  offscreen: { position: 'absolute', left: -2000, top: 0 },
  // 44pt to tap around the 40pt pill; the negative margin keeps the rows where they were
  pillHit: { minHeight: 44, marginVertical: -2, justifyContent: 'center' },
  pill: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  pillOn: { backgroundColor: colors.ink },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  pillTextOn: { color: colors.paper },
  list: { gap: 10 },
  empty: { paddingTop: 4, paddingHorizontal: 12, fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.inkSoft },
  matchCard: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 24, backgroundColor: colors.white, flexDirection: 'row', gap: 14 },
  matchMine: { backgroundColor: colors.ink },
  timeCol: { width: 62 },
  time: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 32, paddingBottom: 6, marginBottom: -6 },
  timeOff: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 32 },
  movedFrom: { fontFamily: fonts.bodySemi, fontSize: 11, lineHeight: 14 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8 },
  chip: { paddingVertical: 1, paddingHorizontal: 8, borderRadius: 999, backgroundColor: colors.sand },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 15, color: colors.inkSoft },
  matchBody: { flex: 1, minWidth: 0, gap: 2 },
  meta: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 16 },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  place: { flexShrink: 1, fontFamily: fonts.body, fontSize: 12, lineHeight: 16 },
  name: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, paddingBottom: 5, marginBottom: -5, color: colors.ink },
  nameWin: { fontFamily: fonts.displayHeavy, fontSize: 26, lineHeight: 30, paddingBottom: 5, marginBottom: -5, color: colors.ink },
  score: { marginTop: 2, fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 17 },
});
