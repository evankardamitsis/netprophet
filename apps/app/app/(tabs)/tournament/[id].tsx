import { useState, type ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import type { GetTournamentResult } from '@netprophet/db';
import { useCopy } from '../../../src/i18n';
import { useTournament } from '../../../src/lib/data';
import { fmt } from '../../../src/lib/votes';
import { usePress, useStgIn } from '../../../src/lib/motion';
import {
  bracketRounds,
  dayChips,
  defaultDay,
  defaultSegment,
  scheduleRows,
  segmentsOf,
  subLine,
  todayKey,
  type BracketMatch,
  type ScheduleRow,
  type Segment,
  type SideView,
} from '../../../src/lib/tournaments';
import { colors, fonts } from '../../../src/theme';

/**
 * One tournament (prototype V2, «Τα τουρνουά σου» opened): «Πρόγραμμα» (the matches of a day, by time, mine marked)
 * and «Ταμπλό» (the organiser's draws, round by round). Names in the draws are the sheet's own text; a name matched to
 * a roster player opens their profile.
 */
const STG_MS = 600;
const STAGGER = 70;
const ACCENT_PAD = 10;

export default function TournamentScreen() {
  const t = useCopy();
  const c = t.tournaments;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, notFound, refresh } = useTournament(String(id));
  const back = usePress();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/tournaments'));
  const today = todayKey();

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
        {data ? <Body key={data.id} d={data} today={today} /> : null}
        {!data && notFound ? <Text style={styles.empty}>{c.detail.notFound}</Text> : null}
        {!data && !loading && error && !notFound ? <Text style={styles.empty}>{c.detail.error}</Text> : null}
      </ScrollView>
    </View>
  );
}

function Reveal({ i, children }: { i: number; children: ReactNode }) {
  const enter = useStgIn(STG_MS, Math.min(i, 8) * STAGGER);
  return <Animated.View style={enter}>{children}</Animated.View>;
}

function Body({ d, today }: { d: GetTournamentResult; today: string }) {
  const t = useCopy();
  const segments = segmentsOf(d);
  const [picked, setPicked] = useState<Segment | null>(null);
  const seg = picked && segments.includes(picked) ? picked : defaultSegment(d, today);
  const sub = subLine(d, t);
  return (
    <>
      <Reveal i={0}>
        <Text style={styles.title}>{d.name}</Text>
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
      {segments.length > 0 && seg === 'schedule' ? <Schedule d={d} today={today} /> : null}
      {segments.length > 0 && seg === 'bracket' ? <Bracket d={d} /> : null}
    </>
  );
}

/** a pill in a row of choices: ink when picked */
function Pill({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const press = usePress();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[styles.pill, on && styles.pillOn, press.style]}>
        <Text style={[styles.pillText, on && styles.pillTextOn]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/* ================= Πρόγραμμα ================= */

function Schedule({ d, today }: { d: GetTournamentResult; today: string }) {
  const t = useCopy();
  const chips = dayChips(d.days, today, t);
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const day = pickedDay && d.days.some((x) => x.date === pickedDay) ? pickedDay : defaultDay(d.days, today) ?? d.days[0]?.date ?? null;
  const rows = scheduleRows(d.days.find((x) => x.date === day)?.matches ?? [], d.me, t);
  return (
    <View style={styles.block}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
        {chips.map((ch) => (
          <Pill key={ch.key} label={ch.label} on={ch.key === day} onPress={() => setPickedDay(ch.key)} />
        ))}
      </ScrollView>
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
  const dash = useCopy().tournaments.detail.masked;
  const enter = useStgIn(STG_MS - 100, Math.min(i, 8) * STAGGER);
  const fg = row.mine ? colors.paper : colors.ink;
  const soft = row.mine ? colors.mist : colors.inkSoft;
  return (
    <Animated.View style={[styles.matchCard, row.mine && styles.matchMine, enter]}>
      <Text style={[styles.time, { color: fg }]}>{row.time}</Text>
      <View style={styles.matchBody}>
        {row.meta ? <Text style={[styles.meta, { color: soft }]}>{row.meta}</Text> : null}
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

function Bracket({ d }: { d: GetTournamentResult }) {
  const t = useCopy();
  const [pickedTab, setPickedTab] = useState<string | null>(null);
  const draw = d.draws.find((x) => x.tab === pickedTab) ?? d.draws[0]!;
  const rounds = draw.format === 'round_robin' ? [] : bracketRounds(draw, d.masked, t);
  // the first round with something still to play, else the last
  const firstOpen = rounds.findIndex((r) => r.matches.some((m) => !m.winner && !m.advances));
  const [pickedRound, setPickedRound] = useState<{ tab: string; index: number } | null>(null);
  const roundIndex = pickedRound && pickedRound.tab === draw.tab && pickedRound.index < rounds.length ? pickedRound.index : firstOpen >= 0 ? firstOpen : Math.max(0, rounds.length - 1);
  const round = rounds[roundIndex];
  return (
    <View style={styles.block}>
      {d.draws.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
          {d.draws.map((x) => (
            <Pill key={x.tab} label={x.tab} on={x.tab === draw.tab} onPress={() => setPickedTab(x.tab)} />
          ))}
        </ScrollView>
      ) : null}
      {draw.format === 'round_robin' ? (
        <Text style={styles.empty}>{t.tournaments.detail.roundRobin}</Text>
      ) : (
        <>
          {rounds.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
              {rounds.map((r, i) => (
                <Pill key={r.name} label={r.name} on={i === roundIndex} onPress={() => setPickedRound({ tab: draw.tab, index: i })} />
              ))}
            </ScrollView>
          ) : null}
          <View key={`${draw.tab}-${roundIndex}`} style={styles.list}>
            {round?.matches.map((m, i) => (
              <DrawCard key={m.key} m={m} i={i} />
            ))}
            {!round ? <Text style={styles.empty}>{t.tournaments.detail.noDraws}</Text> : null}
          </View>
        </>
      )}
    </View>
  );
}

function DrawCard({ m, i }: { m: BracketMatch; i: number }) {
  const enter = useStgIn(STG_MS - 100, Math.min(i, 8) * STAGGER);
  return (
    <Animated.View style={[styles.drawCard, enter]}>
      <SideLine side={m.sides[0]} won={m.winner === 1} advances={m.advances === 1} />
      <SideLine side={m.sides[1]} won={m.winner === 2} advances={m.advances === 2} />
      {m.line ? <Text style={styles.drawLine}>{m.line}</Text> : null}
    </Animated.View>
  );
}

function SideLine({ side, won, advances }: { side: SideView; won: boolean; advances: boolean }) {
  const t = useCopy();
  const d = t.tournaments.detail;
  if (side.bye) {
    return (
      <View style={styles.sideRow}>
        <Text style={styles.bye}>{d.bye}</Text>
      </View>
    );
  }
  return (
    <View style={styles.sideRow}>
      <Text style={[won ? styles.nameWin : styles.name, styles.sideName]} numberOfLines={1}>
        {side.parts.map((p, j) => (
          <Text key={`${p.text}-${j}`} onPress={p.playerId ? () => router.push(`/player/${p.playerId}`) : undefined} suppressHighlighting>
            {j > 0 ? ' / ' : ''}
            {p.text}
          </Text>
        ))}
        {side.seed !== null ? <Text style={styles.seed}> {fmt(d.seed, { n: side.seed })}</Text> : null}
      </Text>
      {won ? <Text style={styles.check}>✓</Text> : null}
      {advances ? <Text style={styles.advances}>{d.advances}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  scroll: { paddingTop: 8, paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  backHit: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' },
  back: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  title: { fontFamily: fonts.displayHeavy, fontSize: 60, lineHeight: 57, color: colors.ink, paddingTop: ACCENT_PAD, marginTop: -ACCENT_PAD },
  sub: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.inkSoft },
  seg: { flexDirection: 'row', gap: 6, padding: 5, borderRadius: 18, backgroundColor: colors.white },
  segBtn: { flex: 1, minHeight: 48, paddingHorizontal: 4, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: colors.ink },
  segText: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 17, textAlign: 'center', color: colors.ink },
  segTextOn: { color: colors.paper },
  block: { gap: 12 },
  pillRow: { gap: 8, paddingRight: 20 },
  pill: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  pillOn: { backgroundColor: colors.ink },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  pillTextOn: { color: colors.paper },
  list: { gap: 10 },
  empty: { paddingTop: 4, paddingHorizontal: 12, fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.inkSoft },
  matchCard: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 24, backgroundColor: colors.white, flexDirection: 'row', gap: 14 },
  matchMine: { backgroundColor: colors.ink },
  time: { width: 62, fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 32 },
  matchBody: { flex: 1, minWidth: 0, gap: 2 },
  meta: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 16 },
  name: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: colors.ink },
  nameWin: { fontFamily: fonts.displayHeavy, fontSize: 26, lineHeight: 30, color: colors.ink },
  score: { marginTop: 2, fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 17 },
  drawCard: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 24, backgroundColor: colors.white, gap: 2 },
  sideRow: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 8 },
  sideName: { flexShrink: 1 },
  seed: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.inkSoft },
  check: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  advances: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.inkSoft },
  bye: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.52, color: colors.muted },
  drawLine: { marginTop: 2, fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 17, color: colors.inkSoft },
});
