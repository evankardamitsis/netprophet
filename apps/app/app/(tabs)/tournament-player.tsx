import { useMemo, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { ProLine } from '../../src/components/ProEntries';
import { Block, CloseButton, EntryPills, MiniPath } from '../../src/components/PlayerRun';
import { useCopy } from '../../src/i18n';
import { useMyMatch } from '../../src/lib/data';
import { useGrowFrom, usePress, useStgIn } from '../../src/lib/motion';
import { ifWinsLine, matchesOfEntry, summaryOf, titleOf } from '../../src/lib/playerRun';
import type { NextMatch, PathMatch } from '../../src/lib/tournamentToday';
import { carry, usePlayerRun, type PlayerParams } from '../../src/lib/usePlayerRun';
import { colors, fonts, motion, text } from '../../src/theme';

/**
 * One player in one tournament (founder, 21 Oct; split in three after build 12): opened by holding their name on
 * Πρόγραμμα, Ταμπλό or a card on Σήμερα, it grows out of the name held. Their name (and partner's in doubles) on top,
 * pills for their other categories and pairs, «Αν κερδίσει», the next match, the button to their path in the draw,
 * and what they did so far. «‹» closes it.
 */
/** the tab bar keeps this screen mounted, so a new hold (other name, other point) builds it again: the params are its key */
export default function TournamentPlayerScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  return <Content key={[params.tournament, params.player, params.match, params.slot, params.entry, params.x, params.y].join('|')} />;
}

function Content() {
  const params = useLocalSearchParams<{ tournament: string; player: string; match?: string; slot?: string; entry?: string; x?: string; y?: string }>();
  const p: PlayerParams = { tournament: String(params.tournament), player: String(params.player), match: params.match, slot: params.slot, entry: params.entry };
  const { width, height } = useWindowDimensions();
  const t = useCopy();
  // the screen grows out of the name that was held (the centre when the point is unknown)
  const dx = params.x ? Number(params.x) - width / 2 : 0;
  const dy = params.y ? Number(params.y) - height / 2 : 0;
  const grow = useGrowFrom(Number.isFinite(dx) ? dx : 0, Number.isFinite(dy) ? dy : 0, motion.revealDur, 0.5);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(`/tournament/${p.tournament}`));
  const state = usePlayerRun(p);
  return (
    <Animated.View style={[styles.screen, grow]}>
      <CloseButton onPress={goBack} />
      <ScrollView contentContainerStyle={[styles.scroll, styles.scrollEnd]} showsVerticalScrollIndicator={false}>
        {state.data && state.me ? <Body p={p} state={state} /> : null}
        {state.data && !state.me ? <Text style={styles.empty}>{t.tournaments.focus.notFound}</Text> : null}
        {!state.data && !state.loading ? <Text style={styles.empty}>{t.tournaments.detail.notFound}</Text> : null}
      </ScrollView>
    </Animated.View>
  );
}

function Reveal({ i, children }: { i: number; children: ReactNode }) {
  const enter = useStgIn(motion.revealDur, Math.min(i, 8) * motion.stagger);
  return <Animated.View style={enter}>{children}</Animated.View>;
}

function Body({ p, state }: { p: PlayerParams; state: ReturnType<typeof usePlayerRun> }) {
  const t = useCopy();
  const f = t.tournaments.focus;
  const { data: d, me, entries, entry, run } = state;
  const summary = useMemo(() => (d && me ? summaryOf(me, matchesOfEntry(d, me, entries, entry), run, new Date(), t) : null), [d, me, entries, entry, run, t]);
  const myMatch = useMyMatch();
  const wins = useMemo(() => (run ? ifWinsLine(run, t) : null), [run, t]);
  if (!d || !me || !summary) return null;
  let i = 0;
  return (
    <>
      <Reveal i={i++}>
        <Text style={styles.title}>{titleOf(me, entry, t)}</Text>
        <Text style={styles.sub}>{d.name}</Text>
      </Reveal>
      <Reveal i={i++}>
        <EntryPills entries={entries} picked={entry} onPick={state.pick} />
      </Reveal>
      {/* a new pill builds the rest again, so it enters again */}
      <View key={entry?.key ?? 'none'} style={styles.stack}>
        {wins ? (
          <Reveal i={i++}>
            <View style={styles.ifWins}>
              <Text style={styles.ifWinsLine}>{wins.line}</Text>
              {wins.when ? <Text style={styles.ifWinsWhen}>{wins.when}</Text> : null}
            </View>
          </Reveal>
        ) : null}
        {/* a next match known only from the draw says what «Αν κερδίσει» already said: once is enough */}
        {wins && summary.next && summary.next.matchId === null ? null : (
          <Reveal i={i++}>
            <Block label={f.nextMatch}>{summary.next ? <Next n={summary.next} /> : <Text style={styles.empty}>{f.noNext}</Text>}</Block>
          </Reveal>
        )}
        {summary.next?.matchId && summary.next.matchId === myMatch.match?.matchId ? (
          <Reveal i={i++}>
            <ProLine moment="tournament_player" label={t.pro.entries.opponent} />
          </Reveal>
        ) : null}
        {run && run.steps.length > 0 ? (
          <Reveal i={i++}>
            <PathButton label={f.openPath} onPress={() => router.push({ pathname: '/tournament-path', params: carry(p, entry) })}>
              <MiniPath run={run} />
            </PathButton>
          </Reveal>
        ) : null}
        <Reveal i={i++}>
          <Block label={f.played}>
            {summary.previous.length > 0 ? (
              <View style={styles.list}>
                {summary.previous.map((m, k) => (
                  <Played key={m.matchId} p={m} k={k} />
                ))}
              </View>
            ) : (
              <Text style={styles.empty}>{f.nothingYet}</Text>
            )}
          </Block>
        </Reveal>
      </View>
    </>
  );
}

/** the screen's one primary action: to the path, with a glance at it */
function PathButton({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  const press = usePress();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[styles.pathBtn, press.style]}>
        <View style={styles.pathTop}>
          <Text style={styles.pathLabel}>{label}</Text>
          <Text style={styles.pathGo}>›</Text>
        </View>
        {children}
      </Animated.View>
    </Pressable>
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

function Played({ p, k }: { p: PathMatch; k: number }) {
  const enter = useStgIn(motion.revealDurShort, motion.revealDur + k * motion.stagger);
  return (
    <Animated.View style={[styles.playedRow, enter]}>
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  scroll: { paddingTop: 8, paddingHorizontal: 20, gap: 18 },
  scrollEnd: { paddingBottom: 32 },
  stack: { gap: 18 },
  title: { ...text.title },
  sub: { marginTop: 2, fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.inkSoft },
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
  pathBtn: { paddingVertical: 16, paddingHorizontal: 18, borderRadius: 20, backgroundColor: colors.blue, gap: 12 },
  pathTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pathLabel: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 22, color: colors.white },
  pathGo: { fontFamily: fonts.bodyBold, fontSize: 26, lineHeight: 28, color: colors.white },
});
