import { useState, type ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import type { GetTournamentResult } from '@netprophet/db';
import { useCopy } from '../../../src/i18n';
import { useTournament } from '../../../src/lib/data';
import { BracketTree } from '../../../src/components/BracketTree';
import { RoundRobin } from '../../../src/components/RoundRobin';
import { usePress, useStgIn } from '../../../src/lib/motion';
import {
  bracketRounds,
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
  // ?draw=<tab>: a «Βγήκε η κλήρωση» push opens straight on that draw
  const { id, draw } = useLocalSearchParams<{ id: string; draw?: string }>();
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
        {data ? <Body key={data.id} d={data} today={today} openDraw={draw} /> : null}
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

function Body({ d, today, openDraw }: { d: GetTournamentResult; today: string; openDraw?: string }) {
  const t = useCopy();
  const segments = segmentsOf(d);
  const [picked, setPicked] = useState<Segment | null>(openDraw && d.draws.some((x) => x.tab === openDraw) ? 'bracket' : null);
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
      {segments.length > 0 && seg === 'bracket' ? <Bracket d={d} openDraw={openDraw} /> : null}
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
        {row.place ? <Text style={[styles.place, { color: soft }]}>{row.place}</Text> : null}
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
  title: { ...text.title },
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
  timeCol: { width: 62 },
  time: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 32, paddingBottom: 6, marginBottom: -6 },
  timeOff: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 32 },
  movedFrom: { fontFamily: fonts.bodySemi, fontSize: 11, lineHeight: 14 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8 },
  chip: { paddingVertical: 1, paddingHorizontal: 8, borderRadius: 999, backgroundColor: colors.sand },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 15, color: colors.inkSoft },
  matchBody: { flex: 1, minWidth: 0, gap: 2 },
  meta: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 16 },
  place: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16 },
  name: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, paddingBottom: 5, marginBottom: -5, color: colors.ink },
  nameWin: { fontFamily: fonts.displayHeavy, fontSize: 26, lineHeight: 30, paddingBottom: 5, marginBottom: -5, color: colors.ink },
  score: { marginTop: 2, fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 17 },
});
