import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { ProLine } from '../../src/components/ProEntries';
import { Block, CloseButton, MiniPath } from '../../src/components/PlayerRun';
import { useCopy } from '../../src/i18n';
import { useMyMatch } from '../../src/lib/data';
import { useGrowFrom, usePress, useStgIn } from '../../src/lib/motion';
import { HoldSegs } from '../../src/lib/playerHold';
import { sectionsOf, titleOf, type RunSection } from '../../src/lib/playerRun';
import type { NextMatch, PathMatch } from '../../src/lib/tournamentToday';
import { carry, usePlayerRun, type PlayerParams } from '../../src/lib/usePlayerRun';
import { colors, fonts, motion, text } from '../../src/theme';

/**
 * One player in one tournament (founder, 21 Oct; split in three after build 12): opened by holding their name on
 * Πρόγραμμα, Ταμπλό, a card on Σήμερα, a result and anywhere else a name shows in a tournament, it grows out of the
 * name held. Their name on top, then a section for each category and pair they play here (founder, 22 Oct): the
 * held match's first and open, the others as headers that open on a tap. In a section «Αν κερδίσει», the next match,
 * the button to the path in the draw, and what they did so far. «‹» closes it.
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
  const { data: d, me, entries, ctx } = state;
  const sections = useMemo(() => (d && me ? sectionsOf(d, me, entries, ctx, new Date(), t) : []), [d, me, entries, ctx, t]);
  if (!d || !me) return null;
  return (
    <>
      <Reveal i={0}>
        <Text style={styles.title}>{titleOf(me, null, t)}</Text>
        <Text style={styles.sub}>{d.name}</Text>
      </Reveal>
      <View style={styles.sections}>
        {sections.map((s, i) => (
          <Section key={s.entry?.key ?? 'none'} p={p} s={s} first={i === 0} i={i + 1} only={sections.length === 1} />
        ))}
      </View>
    </>
  );
}

/** a category or pair: the first (the held match's) is open, the others open on a tap and close on another */
function Section({ p, s, first, only, i }: { p: PlayerParams; s: RunSection; first: boolean; only: boolean; i: number }) {
  const [open, setOpen] = useState(first);
  const enter = useStgIn(motion.revealDur, Math.min(i, 8) * motion.stagger);
  return (
    <Animated.View style={enter}>
      <Animated.View layout={LinearTransition.duration(motion.revealDurShort)} style={styles.section}>
        {s.entry && !only ? <SectionHeader label={s.entry.label} open={open} onPress={() => setOpen((o) => !o)} /> : s.entry ? <Text style={styles.onlyLabel}>{s.entry.label}</Text> : null}
        {open ? <SectionBody p={p} s={s} primary={first} /> : null}
      </Animated.View>
    </Animated.View>
  );
}

/** «MD 40+ · με Μέμμο ↓»: a tap opens what is under it */
function SectionHeader({ label, open, onPress }: { label: string; open: boolean; onPress: () => void }) {
  const press = usePress();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[styles.header, open && styles.headerOn, press.style]}>
        <Text style={[styles.headerLabel, open && styles.headerLabelOn]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.headerGlyph, open && styles.headerLabelOn]}>{open ? '↑' : '↓'}</Text>
      </Animated.View>
    </Pressable>
  );
}

function SectionBody({ p, s, primary }: { p: PlayerParams; s: RunSection; primary: boolean }) {
  const t = useCopy();
  const f = t.tournaments.focus;
  const myMatch = useMyMatch();
  const { run, next, previous, wins, entry } = s;
  let i = 0;
  return (
    <View style={styles.stack}>
      {wins ? (
        <Reveal i={i++}>
          <View style={styles.ifWins}>
            <Text style={styles.ifWinsLine}>{wins.line}</Text>
            {wins.when ? <Text style={styles.ifWinsWhen}>{wins.when}</Text> : null}
          </View>
        </Reveal>
      ) : null}
      {/* a next match known only from the draw says what «Αν κερδίσει» already said: once is enough */}
      {wins && next && next.matchId === null ? null : (
        <Reveal i={i++}>
          <Block label={f.nextMatch}>{next ? <Next n={next} tournamentId={p.tournament} /> : <Text style={styles.empty}>{f.noNext}</Text>}</Block>
        </Reveal>
      )}
      {next?.matchId && next.matchId === myMatch.match?.matchId ? (
        <Reveal i={i++}>
          <ProLine moment="tournament_player" label={t.pro.entries.opponent} />
        </Reveal>
      ) : null}
      {run && run.steps.length > 0 ? (
        <Reveal i={i++}>
          <PathButton label={f.openPath} primary={primary} onPress={() => router.push({ pathname: '/tournament-path', params: carry(p, entry) })}>
            {primary ? <MiniPath run={run} /> : null}
          </PathButton>
        </Reveal>
      ) : null}
      <Reveal i={i++}>
        <Block label={f.played}>
          {previous.length > 0 ? (
            <View style={styles.list}>
              {previous.map((m, k) => (
                <Played key={m.matchId} p={m} k={k} tournamentId={p.tournament} />
              ))}
            </View>
          ) : (
            <Text style={styles.empty}>{f.nothingYet}</Text>
          )}
        </Block>
      </Reveal>
    </View>
  );
}

/** the way to the path in the draw, with a glance at it; blue on the held section (one primary action on the screen), quiet on the others */
function PathButton({ label, primary, onPress, children }: { label: string; primary: boolean; onPress: () => void; children: ReactNode }) {
  const press = usePress();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[styles.pathBtn, !primary && styles.pathBtnQuiet, press.style]}>
        <View style={styles.pathTop}>
          <Text style={[styles.pathLabel, !primary && styles.pathLabelQuiet]}>{label}</Text>
          <Text style={[styles.pathGo, !primary && styles.pathLabelQuiet]}>›</Text>
        </View>
        {children}
      </Animated.View>
    </Pressable>
  );
}

function Next({ n, tournamentId }: { n: NextMatch; tournamentId: string }) {
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
      <Text style={styles.against}>{n.matchId && n.againstSegs ? <HoldSegs tournamentId={tournamentId} segs={n.againstSegs} ctx={{ match: n.matchId }} /> : n.against}</Text>
      {n.place ? <Text style={styles.meta}>{n.place}</Text> : null}
    </View>
  );
}

function Played({ p, k, tournamentId }: { p: PathMatch; k: number; tournamentId: string }) {
  const enter = useStgIn(motion.revealDurShort, motion.revealDur + k * motion.stagger);
  return (
    <Animated.View style={[styles.playedRow, enter]}>
      <View style={[styles.tick, !p.won && styles.tickOff]}>
        <Text style={styles.tickText}>{p.won ? '✓' : ''}</Text>
      </View>
      <View style={styles.playedBody}>
        <Text style={[styles.against, !p.won && styles.lost]} numberOfLines={1}>
          {p.againstSegs ? <HoldSegs tournamentId={tournamentId} segs={p.againstSegs} ctx={{ match: p.matchId }} /> : p.against}
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
  sections: { gap: 12 },
  section: { gap: 14 },
  stack: { gap: 18 },
  title: { ...text.title },
  sub: { marginTop: 2, fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.inkSoft },
  empty: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.inkSoft },
  onlyLabel: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 22, color: colors.ink },
  header: { minHeight: 48, paddingHorizontal: 16, borderRadius: 999, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.mist, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  headerLabel: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 21, color: colors.ink },
  headerLabelOn: { color: colors.paper },
  headerGlyph: { fontFamily: fonts.bodyBold, fontSize: 18, lineHeight: 22, color: colors.ink },
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
  pathBtnQuiet: { paddingVertical: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.mist },
  pathTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pathLabel: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 22, color: colors.white },
  pathLabelQuiet: { color: colors.ink },
  pathGo: { fontFamily: fonts.bodyBold, fontSize: 26, lineHeight: 28, color: colors.white },
});
