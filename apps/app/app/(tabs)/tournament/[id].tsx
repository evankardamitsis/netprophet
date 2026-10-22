import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { MyMatchRow } from '../../../src/components/HomeCards';
import { VoteRow } from '../../../src/components/VoteRow';
import { YoursDot } from '../../../src/components/YoursDot';
import { useFollowedIds } from '../../../src/lib/myPeople';
import { HoldName, HoldSegs, useHoldHint } from '../../../src/lib/playerHold';
import { mineToday, nowNext, openingDay, todayGroups, yoursSet, yoursToday, type CourtNowNext, type YoursRow } from '../../../src/lib/tournamentToday';
import type { CardMatch } from '../../../src/lib/feed';
import { useTabScrollTop } from '../../../src/lib/scrollTop';
import { router, useLocalSearchParams } from 'expo-router';
import type { GetTournamentResult } from '@netprophet/db';
import { ScheduleCard } from '../../../src/components/ScheduleCard';
import { Logo } from '../../../src/components/Logo';
import { Toast } from '../../../src/components/Toast';
import { useCopy } from '../../../src/i18n';
import { useApi, useFeed, useTournament, type VoteErrorKind } from '../../../src/lib/data';
import { ProLine } from '../../../src/components/ProEntries';
import { followToast, toggleFollow } from '../../../src/lib/follow';
import { BracketTree } from '../../../src/components/BracketTree';
import { RoundRobin } from '../../../src/components/RoundRobin';
import { track } from '../../../src/lib/analytics';
import { useEntrance, usePress, useStgIn } from '../../../src/lib/motion';
import { SCHEDULE_RATIO, scheduleMessage, shareView, shortName } from '../../../src/lib/scheduleShare';
import { shareCard } from '../../../src/lib/shareCard';
import { fmt } from '../../../src/lib/votes';
import {
  bracketRounds,
  dayLong,
  groupViews,
  dayChips,
  defaultSegment,
  scheduleRows,
  segmentsOf,
  subLine,
  todayKey,
  type ScheduleRow,
  type Segment,
} from '../../../src/lib/tournaments';
import { colors, fonts, motion, text } from '../../../src/theme';

/**
 * One tournament (prototype V2, «Τα τουρνουά σου» opened; mockup D): «Σήμερα» (when it plays today: your match, your
 * people, what plays now and next, and the day's matches to vote on), «Πρόγραμμα» (the matches of a day, by time, mine
 * marked) and «Ταμπλό» (the organiser's draws, round by round). Names in the draws are the sheet's own text; a name matched to
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
  const scroller = useRef<ScrollView>(null);
  // a tap on the tab you are on (or two) scrolls back to the top
  useTabScrollTop(scroller);
  // Σήμερα reads the feed for your votes: a pull reads it again too
  const todayRefresh = useRef<(() => void) | null>(null);
  const bindRefresh = useCallback((fn: (() => void) | null) => {
    todayRefresh.current = fn;
  }, []);
  const onPull = useCallback(() => {
    void refresh();
    todayRefresh.current?.();
  }, [refresh]);
  const hint = useHoldHint(data !== null && (data.days.length > 0 || data.draws.length > 0));

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scroller}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading && data !== null} onRefresh={onPull} tintColor={colors.ink} />}
      >
        <Pressable accessibilityRole="button" onPress={goBack} onPressIn={back.onPressIn} onPressOut={back.onPressOut} style={styles.backHit}>
          <Animated.Text style={[styles.back, back.style]}>{c.detail.back}</Animated.Text>
        </Pressable>
        {data ? (
          <Body key={data.id} d={data} today={today} openDraw={draw} openDay={day} onToast={say} bindRefresh={bindRefresh} scrollTo={(y) => scroller.current?.scrollTo({ y, animated: true })} />
        ) : null}
        {!data && notFound ? <Text style={styles.empty}>{c.detail.notFound}</Text> : null}
        {!data && !loading && error && !notFound ? <Text style={styles.empty}>{c.detail.error}</Text> : null}
      </ScrollView>
      {toast ? <Toast key={toast.n} text={toast.text} /> : null}
      {hint && !toast ? <Toast hint ms={HINT_MS} text={c.focus.hint} /> : null}
    </View>
  );
}

/** the hint is a sentence to read: it stays longer than a toast */
const HINT_MS = 4200;
/** how far above a match the page stops when it scrolls to it */
const SCROLL_PAD = 96;

/** the clock, read again each minute: what plays «now» moves on its own */
function useMinute(on: boolean): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!on) return undefined;
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [on]);
  return now;
}

function Reveal({ i, children }: { i: number; children: ReactNode }) {
  const enter = useStgIn(STG_MS, Math.min(i, 8) * STAGGER);
  return <Animated.View style={enter}>{children}</Animated.View>;
}

/** a match to scroll to and flash; `n` replays the flash when the same match is asked again */
interface Focus {
  id: string;
  n: number;
}

function Body({
  d,
  today,
  openDraw,
  openDay,
  onToast,
  bindRefresh,
  scrollTo,
}: {
  d: GetTournamentResult;
  today: string;
  openDraw?: string;
  openDay?: string;
  onToast: (text: string) => void;
  bindRefresh: (fn: (() => void) | null) => void;
  scrollTo: (y: number) => void;
}) {
  const t = useCopy();
  const segments = segmentsOf(d, today);
  const askedDay = openDay && d.days.some((x) => x.date === openDay) ? openDay : null;
  const [picked, setPicked] = useState<Segment | null>(openDraw && d.draws.some((x) => x.tab === openDraw) ? 'bracket' : askedDay ? 'schedule' : null);
  const seg = picked && segments.includes(picked) ? picked : defaultSegment(d, today);
  const sub = subLine(d, t);
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const day = pickedDay && d.days.some((x) => x.date === pickedDay) ? pickedDay : openingDay(d.days, today, askedDay);
  const follows = useFollowedIds();
  const [following, setFollowing] = useState(d.followed === true);
  const yours = useMemo(() => yoursSet(d.me, follows), [d.me, follows]);
  const todayMatches = useMemo(() => d.days.find((x) => x.date === today)?.matches ?? [], [d.days, today]);
  const [focus, setFocus] = useState<Focus | null>(null);
  const goTo = (matchId: string, onDay: string) => {
    setPicked('schedule');
    setPickedDay(onDay);
    setFocus((f) => ({ id: matchId, n: (f?.n ?? 0) + 1 }));
  };
  return (
    <>
      <Reveal i={0}>
        <View style={styles.titleRow}>
          <Logo path={d.logo} name={d.name} size={36} />
          <Text style={styles.title}>{d.name}</Text>
          <FollowPill d={d} onToast={onToast} onOn={setFollowing} />
        </View>
      </Reveal>
      {sub ? (
        <Reveal i={1}>
          <Text style={styles.sub}>{sub}</Text>
        </Reveal>
      ) : null}
      {/* followed (just now, or already): alerts are Pro. One quiet line, resting a day once tapped, never for Pro */}
      {following ? <ProLine moment="follow" label={t.pro.entries.follow} /> : null}
      {segments.length > 1 ? (
        <Reveal i={2}>
          <View style={styles.seg}>
            {segments.map((s) => (
              <Pressable key={s} accessibilityRole="tab" accessibilityState={{ selected: seg === s }} onPress={() => setPicked(s)} style={[styles.segBtn, seg === s && styles.segOn]}>
                <Text style={[styles.segText, seg === s && styles.segTextOn]}>{s === 'today' ? t.tournaments.detail.today : s === 'schedule' ? t.tournaments.detail.schedule : t.tournaments.detail.bracket}</Text>
              </Pressable>
            ))}
          </View>
        </Reveal>
      ) : null}
      {segments.length === 0 ? <Text style={styles.empty}>{t.tournaments.detail.noDraws}</Text> : null}
      {segments.length > 0 && seg === 'today' ? (
        <TodayTab
          d={d}
          matches={todayMatches}
          yours={yours}
          onToast={onToast}
          bindRefresh={bindRefresh}
          onFocus={(matchId) => goTo(matchId, today)}
        />
      ) : null}
      {segments.length > 0 && seg === 'schedule' ? (
        <Schedule
          d={d}
          today={today}
          day={day}
          onDay={setPickedDay}
          yours={yours}
          focus={focus}
          onFocus={(matchId) => day && goTo(matchId, day)}
          scrollTo={scrollTo}
        />
      ) : null}
      {segments.length > 0 && seg === 'bracket' ? <Bracket d={d} openDraw={openDraw} yours={yours} /> : null}
    </>
  );
}

/**
 * «Ακολούθησε» / «✓ Ακολουθείς» at the right end of the header (founder, 21 Oct: free for everyone): text, not an
 * icon; white to follow, ink once you do, never blue (the screen's actions are all ink). It flips at once and goes
 * back if the server says no; the toast says what changed.
 */
function FollowPill({ d, onToast, onOn }: { d: GetTournamentResult; onToast: (text: string) => void; onOn: (on: boolean) => void }) {
  const t = useCopy();
  const c = t.tournaments.detail;
  const api = useApi();
  const press = usePress();
  const [on, setOn] = useState(d.followed === true);
  const [busy, setBusy] = useState(false);
  useEffect(() => setOn(d.followed === true), [d.followed]);
  useEffect(() => onOn(on), [on, onOn]);
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

/** «Οι δικοί σου σήμερα»: one slim line of chips, only when any of them play today; a tap goes to the match */
function YoursToday({ tournamentId, rows, onPick }: { tournamentId: string; rows: YoursRow[]; onPick: (matchId: string) => void }) {
  const f = useCopy().tournaments.focus;
  return (
    <View style={styles.yours}>
      <Text style={styles.label}>{f.yoursToday}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
        {rows.map((r) => (
          <YoursChip key={r.matchId} row={r} tournamentId={tournamentId} onPress={() => onPick(r.matchId)} />
        ))}
      </ScrollView>
    </View>
  );
}

function YoursChip({ row, tournamentId, onPress }: { row: YoursRow; tournamentId: string; onPress: () => void }) {
  const press = usePress();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[styles.yoursChip, press.style]}>
        <Text style={styles.yoursTime}>{row.time}</Text>
        <YoursDot />
        <Text style={styles.yoursName} numberOfLines={1}>
          <HoldName tournamentId={tournamentId} playerId={row.playerId} ctx={{ match: row.matchId }} onTap={onPress}>
            {row.name}
          </HoldName>
        </Text>
        <Text style={styles.yoursAgainst} numberOfLines={1}>
          {row.against}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/* ================= Σήμερα ================= */

/**
 * Σήμερα in a tournament (mockup D): «Ο αγώνας σου» when you play, «Οι δικοί σου σήμερα», «Τώρα / Μετά», then the day's
 * matches as vote rows, by category and time. The vote is the home's: a tap on a name votes (useFeed), and what the
 * feed knows of a match (your vote, the split) is laid over the tournament's own row.
 */
function TodayTab({
  d,
  matches,
  yours,
  onToast,
  bindRefresh,
  onFocus,
}: {
  d: GetTournamentResult;
  matches: GetTournamentResult['days'][number]['matches'];
  yours: Set<string>;
  onToast: (text: string) => void;
  bindRefresh: (fn: (() => void) | null) => void;
  onFocus: (matchId: string) => void;
}) {
  const t = useCopy();
  const onVoteError = useCallback((kind: VoteErrorKind) => onToast(t.feed[kind]), [onToast, t]);
  const feed = useFeed(onVoteError);
  const feedRefresh = feed.refresh;
  useEffect(() => {
    bindRefresh(() => void feedRefresh());
    return () => bindRefresh(null);
  }, [bindRefresh, feedRefresh]);
  const now = useMinute(true);
  const mine = useMemo(() => mineToday(matches, d.me, t), [matches, d.me, t]);
  const chips = useMemo(() => yoursToday(matches, yours, t, mine?.matchId), [matches, yours, t, mine]);
  const courts = nowNext(matches, now, t);
  const fed = useMemo(() => new Map(feed.cards.flatMap((c): [string, CardMatch][] => (c.kind === 'match' ? [[c.id, c]] : []))), [feed.cards]);
  const points = useMemo(() => new Map(feed.results.filter((r) => r.ok).map((r) => [r.matchId, r.points] as [string, number])), [feed.results]);
  const groups = useMemo(() => todayGroups(matches, d.id, fed, points, now, t), [matches, d.id, fed, points, now, t]);
  let n = 0;
  return (
    <View style={styles.block}>
      {mine ? (
        <Reveal i={n++}>
          <View style={styles.mineBox}>
            <MyMatchRow match={mine} onPress={() => router.push({ pathname: '/tournament-player', params: { tournament: d.id, player: mine.playerId, match: mine.matchId } })} />
          </View>
        </Reveal>
      ) : null}
      {chips.length > 0 ? (
        <Reveal i={n++}>
          <YoursToday
            tournamentId={d.id}
            rows={chips}
            onPick={(matchId) => {
              const r = chips.find((x) => x.matchId === matchId);
              // their match opens their run from it, not the day's schedule
              if (r) router.push({ pathname: '/tournament-player', params: { tournament: d.id, player: r.playerId, match: matchId } });
              else onFocus(matchId);
            }}
          />
        </Reveal>
      ) : null}
      {courts.length > 0 ? <NowNext courts={courts} tournamentId={d.id} onPick={onFocus} /> : null}
      {groups.map((g) => (
        <View key={g.key} style={styles.voteGroup}>
          {g.key ? <Text style={styles.groupHead}>{g.key}</Text> : null}
          {g.rows.map((r, i) => (
            <VoteRow key={r.match.id} match={r.match} where={r.match.meta} onVote={feed.vote} result={r.result} note={r.note} index={i} />
          ))}
        </View>
      ))}
    </View>
  );
}

/** a pill in a row of choices: ink when picked */
function Pill({ label, on, onPress, onLayout }: { label: string; on: boolean; onPress: () => void; onLayout?: (e: LayoutChangeEvent) => void }) {
  const press = usePress();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onLayout={onLayout} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={styles.pillHit}>
      <Animated.View style={[styles.pill, on && styles.pillOn, press.style]}>
        <Text style={[styles.pillText, on && styles.pillTextOn]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/* ================= Πρόγραμμα ================= */

function Schedule({
  d,
  today,
  day,
  onDay,
  yours,
  focus,
  onFocus,
  scrollTo,
}: {
  d: GetTournamentResult;
  today: string;
  day: string | null;
  onDay: (day: string) => void;
  yours: Set<string>;
  focus: Focus | null;
  onFocus: (matchId: string) => void;
  scrollTo: (y: number) => void;
}) {
  const t = useCopy();
  const chips = dayChips(d.days, today, t);
  const matches = useMemo(() => d.days.find((x) => x.date === day)?.matches ?? [], [d.days, day]);
  const rows = scheduleRows(matches, d.me, t);
  const isToday = day === today;
  const now = useMinute(isToday);
  const courts = isToday ? nowNext(matches, now, t) : [];
  // where each match sits in the page: the block's y, the list's y in it, the row's y in the list
  const at = useRef({ block: 0, list: 0, rows: new Map<string, number>() });
  const pending = useRef<string | null>(null);
  const tryScroll = () => {
    const id = pending.current;
    const y = id ? at.current.rows.get(id) : undefined;
    if (id && y !== undefined) {
      pending.current = null;
      scrollTo(Math.max(0, at.current.block + at.current.list + y - SCROLL_PAD));
    }
  };
  useEffect(() => {
    if (!focus) return;
    pending.current = focus.id;
    tryScroll();
    // tryScroll reads refs only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);
  // the day strip keeps the picked day in view, centred: it scrolls once the chips and the strip are measured, and when the pick changes
  const strip = useRef<ScrollView>(null);
  const stripAt = useRef({ width: 0, chips: new Map<string, { x: number; width: number }>(), done: null as string | null });
  const centreDay = (key: string | null) => {
    const s = stripAt.current;
    const box = key ? s.chips.get(key) : undefined;
    if (!key || !box || s.width === 0) return;
    // the first placement is drawn in place, later picks glide
    strip.current?.scrollTo({ x: Math.max(0, box.x + box.width / 2 - s.width / 2), animated: s.done !== null });
    s.done = key;
  };
  useEffect(() => {
    if (stripAt.current.done !== day) centreDay(day);
    // centreDay reads refs only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);
  const sh = t.tournaments.detail.share;
  const card = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const press = usePress();
  const view = shareView(rows, t.tournaments.detail.masked, d.name);
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
    <View style={styles.block} onLayout={(e) => (at.current.block = e.nativeEvent.layout.y)}>
      <View style={styles.dayBar}>
        <ScrollView
          ref={strip}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dayScroll}
          contentContainerStyle={styles.pillRow}
          onLayout={(e) => {
            stripAt.current.width = e.nativeEvent.layout.width;
            if (stripAt.current.done === null) centreDay(day);
          }}
        >
          {chips.map((ch) => (
            <Pill
              key={ch.key}
              label={ch.label}
              on={ch.key === day}
              onPress={() => onDay(ch.key)}
              onLayout={(e) => {
                const { x, width } = e.nativeEvent.layout;
                stripAt.current.chips.set(ch.key, { x, width });
                // the picked chip is measured last on the first pass: scroll as soon as it is
                if (ch.key === day && stripAt.current.done === null) centreDay(day);
              }}
            />
          ))}
        </ScrollView>
      </View>
      {Platform.OS !== 'web' && day && rows.length > 0 ? (
        <View pointerEvents="none" style={styles.offscreen}>
          <ScheduleCard ref={card} width={360} name={d.name} day={dayLong(day, t)} venue={d.venue} view={view} moreLabel={view.more > 0 ? fmt(sh.more, { n: view.more }) : null} listTitle={sh.cardTitle} />
        </View>
      ) : null}
      {courts.length > 0 ? <NowNext courts={courts} tournamentId={d.id} onPick={onFocus} /> : null}
      <View key={day ?? 'none'} style={styles.list} onLayout={(e) => (at.current.list = e.nativeEvent.layout.y)}>
        {rows.map((r, i) => (
          <MatchRow
            key={r.id}
            row={r}
            i={i}
            tournamentId={d.id}
            yours={yours}
            flash={focus?.id === r.id ? focus.n : 0}
            onY={(y) => {
              at.current.rows.set(r.id, y);
              if (pending.current === r.id) tryScroll();
            }}
          />
        ))}
        {rows.length === 0 ? <Text style={styles.empty}>{t.tournaments.detail.noMatchesDay}</Text> : null}
        {rows.length > 0 ? (
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void share()} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={styles.shareHit}>
            <Animated.Text style={[styles.share, busy && styles.shareBusy, press.style]}>{busy ? sh.making : sh.action}</Animated.Text>
          </Pressable>
        ) : null}
        {failed ? <Text style={styles.shareFailed}>{sh.failed}</Text> : null}
      </View>
    </View>
  );
}

/** «Τώρα / Μετά» by court, above today's schedule: slim, one small card per court, sideways */
function NowNext({ courts, tournamentId, onPick }: { courts: CourtNowNext[]; tournamentId: string; onPick: (matchId: string) => void }) {
  const f = useCopy().tournaments.focus;
  const one = courts.length === 1;
  return (
    <ScrollView horizontal={!one} showsHorizontalScrollIndicator={false} contentContainerStyle={one ? undefined : styles.pillRow}>
      {courts.map((c, i) => (
        <Reveal key={c.key} i={i}>
          <View style={[styles.court, one && styles.courtOne]}>
            {c.court ? (
              <Text style={styles.courtName} numberOfLines={1}>
                {c.court}
              </Text>
            ) : null}
            {c.now ? (
              <Pressable accessibilityRole="button" onPress={() => onPick(c.now!.matchId)} style={styles.courtLine}>
                <Text style={styles.courtNow}>{f.now}</Text>
                <Text style={styles.courtPair} numberOfLines={1}>
                  <HoldSegs tournamentId={tournamentId} segs={c.now.segs} ctx={{ match: c.now.matchId }} onTap={() => onPick(c.now!.matchId)} />
                </Text>
              </Pressable>
            ) : null}
            {c.next ? (
              <Pressable accessibilityRole="button" onPress={() => onPick(c.next!.matchId)} style={styles.courtLine}>
                <Text style={styles.courtNext}>{f.next}</Text>
                <Text style={styles.courtPairSoft} numberOfLines={1}>
                  {c.next.time} · <HoldSegs tournamentId={tournamentId} segs={c.next.segs} ctx={{ match: c.next.matchId }} onTap={() => onPick(c.next!.matchId)} />
                </Text>
              </Pressable>
            ) : null}
          </View>
        </Reveal>
      ))}
    </ScrollView>
  );
}

const FLASH = {
  '0%': { opacity: 0 },
  '25%': { opacity: 1 },
  '70%': { opacity: 1 },
  '100%': { opacity: 0 },
} as const;

/** a ring that shows for a moment around the match the page scrolled to */
function Flash({ onInk }: { onInk: boolean }) {
  const style = useEntrance(FLASH, motion.revealDur + 200, 0);
  return <Animated.View pointerEvents="none" style={[styles.flash, onInk && styles.flashOnInk, style]} />;
}

function MatchRow({
  row,
  i,
  tournamentId,
  yours,
  flash,
  onY,
}: {
  row: ScheduleRow;
  i: number;
  tournamentId: string;
  yours: Set<string>;
  /** above 0: flash now (a new number flashes again) */
  flash: number;
  onY: (y: number) => void;
}) {
  const detail = useCopy().tournaments.detail;
  const dash = detail.masked;
  const postponedChip = detail.postponed;
  const enter = useStgIn(STG_MS - 100, Math.min(i, 8) * STAGGER);
  const fg = row.mine ? colors.paper : colors.ink;
  const soft = row.mine ? colors.mist : colors.inkSoft;
  return (
    <Animated.View style={[styles.matchCard, row.mine && styles.matchMine, enter]} onLayout={(e) => onY(e.nativeEvent.layout.y)}>
      {flash > 0 ? <Flash key={flash} onInk={row.mine} /> : null}
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
        {row.sides.map((s, k) => {
          // «δικοί σου»: a dot by the line, and the heavy weight while the match has no winner yet
          const ours = s.people.some((p) => yours.has(p.id));
          return (
            <View key={k} style={styles.sideRow}>
              {ours ? <YoursDot onInk={row.mine} /> : null}
              <Text style={[styles.sideName, s.winner || (ours && !row.score) ? styles.nameWin : styles.name, { color: fg }]} numberOfLines={1}>
                {s.people.length === 0 ? dash : null}
                {s.people.map((p, j) => (
                  <HoldName key={p.id} tournamentId={tournamentId} playerId={p.id} ctx={{ match: row.id }} onTap={() => router.push(`/player/${p.id}`)}>
                    {j > 0 ? ' & ' : ''}
                    {shortName(p)}
                  </HoldName>
                ))}
              </Text>
            </View>
          );
        })}
        {row.score ? <Text style={[styles.score, { color: soft }]}>{row.score}</Text> : null}
      </View>
    </Animated.View>
  );
}
/* ================= Ταμπλό ================= */

function Bracket({ d, openDraw, yours }: { d: GetTournamentResult; openDraw?: string; yours: Set<string> }) {
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
        groups.length === 0 ? <Text style={styles.empty}>{t.tournaments.detail.noDraws}</Text> : <RoundRobin key={draw.tab} groups={groups} yours={yours} tournamentId={d.id} />
      ) : rounds.length === 0 ? (
        <Text style={styles.empty}>{t.tournaments.detail.noDraws}</Text>
      ) : (
        <BracketTree key={draw.tab} rounds={rounds} me={d.me} yours={yours} tournamentId={d.id} tab={draw.tab} />
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
  shareHit: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  share: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 18, color: colors.inkSoft },
  shareBusy: { opacity: 0.5 },
  shareFailed: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17, color: colors.inkSoft, textAlign: 'center' },
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
  sideRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sideName: { flexShrink: 1 },
  label: { ...text.label },
  // Σήμερα: your match on sand, the day's votes by category
  mineBox: { padding: 12, borderRadius: 18, backgroundColor: colors.sand },
  voteGroup: { gap: 8 },
  groupHead: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 19, color: colors.inkSoft, paddingHorizontal: 4 },
  // «Οι δικοί σου σήμερα»
  yours: { gap: 6, paddingVertical: 10, paddingLeft: 14, borderRadius: 18, backgroundColor: colors.sand },
  yoursChip: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.white, maxWidth: 300 },
  yoursTime: { fontFamily: fonts.displayHeavy, fontSize: 16, lineHeight: 20, color: colors.ink, fontVariant: ['tabular-nums'] },
  yoursName: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  yoursAgainst: { flexShrink: 1, fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft },
  // «Τώρα / Μετά»
  court: { width: 236, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.sand, gap: 4 },
  courtOne: { width: '100%' },
  courtName: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 16, color: colors.inkSoft },
  courtLine: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 24 },
  courtNow: { flexShrink: 0, paddingHorizontal: 8, paddingVertical: 1, borderRadius: 999, overflow: 'hidden', backgroundColor: colors.ink, color: colors.paper, fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 16 },
  courtNext: { flexShrink: 0, paddingHorizontal: 8, paddingVertical: 1, borderRadius: 999, overflow: 'hidden', borderWidth: 1, borderColor: colors.mist, color: colors.inkSoft, fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 14 },
  courtPair: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 19, color: colors.ink },
  courtPairSoft: { flexShrink: 1, fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  flash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 24, borderWidth: 2.5, borderColor: colors.ink, opacity: 0 },
  flashOnInk: { borderColor: colors.paper },
});
