import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { GetTournamentResult } from '@netprophet/db';
import { BracketTree } from '../src/components/BracketTree';
import { RoundRobin } from '../src/components/RoundRobin';
import { useCopy } from '../src/i18n';
import { useTournament } from '../src/lib/data';
import { usePress, useStgIn } from '../src/lib/motion';
import { contextOf } from '../src/lib/playerHold';
import { bracketRounds, groupViews } from '../src/lib/tournaments';
import { ifWins, pathKeys, playerPath, type IfWins, type NextMatch, type PathMatch } from '../src/lib/tournamentToday';
import { colors, fonts, motion, text } from '../src/theme';

/**
 * One player in one tournament, full screen (founder, 21 Oct): opened by holding their name on Πρόγραμμα, Ταμπλό or a
 * card on Σήμερα. What they did so far (✓ on wins), their next match, who waits if they win the match the name was
 * held on, and the draw with their path lit and the rest stepped back. «‹» closes it; nothing else to do here.
 */
export default function TournamentPlayerScreen() {
  const t = useCopy();
  const f = t.tournaments.focus;
  const insets = useSafeAreaInsets();
  const { tournament, player, match, slot } = useLocalSearchParams<{ tournament: string; player: string; match?: string; slot?: string }>();
  const { data, loading } = useTournament(String(tournament));
  const close = usePress();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(`/tournament/${tournament}`));
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={f.closeLabel} onPress={goBack} onPressIn={close.onPressIn} onPressOut={close.onPressOut} style={styles.closeHit}>
        <Animated.Text style={[styles.close, close.style]}>{f.close}</Animated.Text>
      </Pressable>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {data ? <Body d={data} playerId={String(player)} match={match} slot={slot} /> : null}
        {!data && !loading ? <Text style={styles.empty}>{t.tournaments.detail.notFound}</Text> : null}
      </ScrollView>
    </View>
  );
}

function Reveal({ i, children }: { i: number; children: ReactNode }) {
  const enter = useStgIn(motion.revealDur, Math.min(i, 8) * motion.stagger);
  return <Animated.View style={enter}>{children}</Animated.View>;
}

function Body({ d, playerId, match, slot }: { d: GetTournamentResult; playerId: string; match?: string; slot?: string }) {
  const t = useCopy();
  const f = t.tournaments.focus;
  const path = useMemo(() => playerPath(d, playerId, new Date(), t), [d, playerId, t]);
  const wins = useMemo(() => ifWins(d, playerId, contextOf(match, slot), t), [d, playerId, match, slot, t]);
  if (!path) return <Text style={styles.empty}>{f.notFound}</Text>;
  let i = 0;
  return (
    <>
      <Reveal i={i++}>
        <Text style={styles.title}>{path.name}</Text>
        <Text style={styles.sub}>{d.name}</Text>
      </Reveal>
      {wins ? (
        <Reveal i={i++}>
          <IfWinsCard w={wins} />
        </Reveal>
      ) : null}
      <Reveal i={i++}>
        <Text style={styles.label}>{f.nextMatch}</Text>
        {path.next ? <Next n={path.next} /> : <Text style={styles.empty}>{f.noNext}</Text>}
      </Reveal>
      <Reveal i={i++}>
        <Text style={styles.label}>{f.played}</Text>
        {path.previous.length > 0 ? (
          <View style={styles.list}>
            {path.previous.map((p) => (
              <Played key={p.matchId} p={p} />
            ))}
          </View>
        ) : (
          <Text style={styles.empty}>{f.nothingYet}</Text>
        )}
      </Reveal>
      {path.draws.length > 0 ? (
        <Reveal i={i++}>
          <Draw d={d} playerId={playerId} tabs={path.draws} wins={wins} />
        </Reveal>
      ) : null}
    </>
  );
}

/** «Αν κερδίσει αυτό το ματς (Ημιτελικά): …», the one line the hold is most often for */
function IfWinsCard({ w }: { w: IfWins }) {
  return (
    <View style={styles.ifWins}>
      <Text style={styles.ifWinsLine}>{w.line}</Text>
      {w.when ? <Text style={styles.ifWinsWhen}>{w.when}</Text> : null}
    </View>
  );
}

function Next({ n }: { n: NextMatch }) {
  const f = useCopy().tournaments.focus;
  return (
    <View style={styles.card}>
      <View style={styles.nextTop}>
        <Text style={styles.nextWhen}>{n.when}</Text>
        {n.now ? (
          <View style={styles.nowChip}>
            <Text style={styles.nowText}>{f.playingNow}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.against}>{n.against}</Text>
      {n.place ? <Text style={styles.meta}>{n.place}</Text> : null}
    </View>
  );
}

function Played({ p }: { p: PathMatch }) {
  return (
    <View style={styles.playedRow}>
      <View style={[styles.tick, !p.won && styles.tickOff]}>
        <Text style={styles.tickText}>{p.won ? '✓' : ''}</Text>
      </View>
      <View style={styles.playedBody}>
        <Text style={[styles.against, !p.won && styles.lost]} numberOfLines={1}>
          {p.against}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[p.day, p.meta, p.score].filter(Boolean).join(' · ')}
        </Text>
      </View>
    </View>
  );
}

/** the draw with their path lit; pills when they play in more than one */
function Draw({ d, playerId, tabs, wins }: { d: GetTournamentResult; playerId: string; tabs: string[]; wins: IfWins | null }) {
  const t = useCopy();
  const [picked, setPicked] = useState<string>(wins?.tab ?? tabs[0]!);
  const draw = d.draws.find((x) => x.tab === picked) ?? d.draws.find((x) => x.tab === tabs[0])!;
  const robin = draw.format === 'round_robin';
  const lit = useMemo(() => pathKeys(draw, playerId), [draw, playerId]);
  const here = wins && wins.tab === draw.tab ? wins : null;
  // open the draw on the match the sheet is about, else on their last match in it
  const focusKey = here?.key ?? [...lit].sort((a, b) => Number(a.split('-')[0]) - Number(b.split('-')[0])).pop() ?? null;
  return (
    <View style={styles.block}>
      <Text style={styles.label}>{t.tournaments.focus.drawTitle}</Text>
      {tabs.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
          {tabs.map((tab) => (
            <Pressable key={tab} accessibilityRole="button" accessibilityState={{ selected: tab === draw.tab }} onPress={() => setPicked(tab)} style={[styles.pill, tab === draw.tab && styles.pillOn]}>
              <Text style={[styles.pillText, tab === draw.tab && styles.pillTextOn]}>{tab}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      {robin ? (
        <RoundRobin key={draw.tab} groups={groupViews(draw, d.masked, playerId, t)} focus />
      ) : (
        <BracketTree key={draw.tab} rounds={bracketRounds(draw, d.masked, t)} me={playerId} lit={lit} maybe={here?.nextKey ?? null} focusKey={focusKey} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  closeHit: { minHeight: 44, minWidth: 44, marginLeft: 12, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 8 },
  close: { fontFamily: fonts.bodyBold, fontSize: 28, lineHeight: 32, color: colors.ink },
  scroll: { paddingHorizontal: 20, gap: 18 },
  title: { ...text.title },
  sub: { marginTop: 2, fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.inkSoft },
  label: { ...text.label, marginBottom: 8 },
  empty: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.inkSoft },
  ifWins: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, backgroundColor: colors.ink, gap: 4 },
  ifWinsLine: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 23, color: colors.paper },
  ifWinsWhen: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 17, color: colors.mist },
  card: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, backgroundColor: colors.white, gap: 2 },
  nextTop: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  nextWhen: { fontFamily: fonts.displayHeavy, fontSize: 26, lineHeight: 30, paddingBottom: 4, marginBottom: -4, color: colors.ink },
  nowChip: { paddingVertical: 2, paddingHorizontal: 10, borderRadius: 999, borderWidth: 2, borderColor: colors.ink },
  nowText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.ink },
  against: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 21, color: colors.ink },
  lost: { color: colors.inkSoft },
  meta: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  list: { gap: 8 },
  playedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.white },
  playedBody: { flex: 1, minWidth: 0 },
  // ✓ on a win: lime is what happened
  tick: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  tickOff: { backgroundColor: colors.sand },
  tickText: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 16, color: colors.ink },
  block: { gap: 10 },
  pillRow: { gap: 8, paddingRight: 20 },
  pill: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  pillOn: { backgroundColor: colors.ink },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  pillTextOn: { color: colors.paper },
});
