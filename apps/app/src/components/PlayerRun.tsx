import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { greekCaps } from '@netprophet/copy';
import { useCopy } from '../i18n';
import { useGrowDownIn, usePopIn, usePress, usePulse, useStgIn } from '../lib/motion';
import type { Entry, PathStep, Run } from '../lib/playerRun';
import { colors, fonts, motion, text } from '../theme';

/**
 * The pieces of the player screens (founder, 21 Oct, after build 12): the pills for their categories and pairs, the
 * path down the rounds drawn step by step, and the small row of dots that opens it.
 */

/** «‹», top left, as on every full screen */
export function CloseButton({ onPress }: { onPress: () => void }) {
  const f = useCopy().tournaments.focus;
  const press = usePress();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={f.closeLabel} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={styles.closeHit}>
      <Animated.Text style={[styles.close, press.style]}>{f.close}</Animated.Text>
    </Pressable>
  );
}

/** one pill per entry: «MD 40+ · με Μέμμο», «Μ 40+»; the picked one in ink */
export function EntryPills({ entries, picked, onPick }: { entries: Entry[]; picked: Entry | null; onPick: (key: string) => void }) {
  if (entries.length < 2) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsBleed} contentContainerStyle={styles.pillRow}>
      {entries.map((e, i) => (
        <Pill key={e.key} i={i} label={e.label} on={e.key === picked?.key} onPress={() => onPick(e.key)} />
      ))}
    </ScrollView>
  );
}

function Pill({ i, label, on, onPress }: { i: number; label: string; on: boolean; onPress: () => void }) {
  const press = usePress();
  const enter = useStgIn(motion.revealDurShort, i * motion.stagger);
  return (
    <Animated.View style={enter}>
      <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
        <Animated.View style={[styles.pill, on && styles.pillOn, press.style]}>
          <Text style={[styles.pillText, on && styles.pillTextOn]}>{label}</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/* ================= the path ================= */

const NODE = 26;
const RAIL = 34;
/** where the node sits in its row: level with the card's first line */
const NODE_TOP = 14;
/** the gap between two steps; the line runs through it */
const STEP_GAP = 12;
/** each step a little after the one above, so the line draws itself down the rounds */
const STEP_DELAY = motion.stagger * 2;

/**
 * The run as one column, first round at the top: a node per step on a rail, a compact card beside it. The path walked
 * so far is a solid ink line and ✓ on lime for each win; the match to play is ringed; the slot it leads to is dashed
 * and breathes; the rounds after it are quiet dots. Built anew (and drawn again) when the entry changes.
 */
export function PathView({ run }: { run: Run }) {
  const t = useCopy();
  const steps = run.steps;
  return (
    <View>
      {steps.map((s, i) => (
        <StepRow key={s.key} s={s} i={i} last={i === steps.length - 1 && !run.champion} next={steps[i + 1]} focus={s.key === run.focusKey} />
      ))}
      {run.champion ? <ChampionRow i={steps.length} label={t.tournaments.focus.title} /> : null}
    </View>
  );
}

/** the line out of a step, by what it joins: walked (ink), towards the slot ahead (dashed), or still far (mist) */
function lineKind(s: PathStep, next: PathStep | undefined): 'walked' | 'ahead' | 'far' | null {
  if (!next) return null;
  if (s.state === 'won' || s.state === 'bye') return 'walked';
  if (s.state === 'open') return 'ahead';
  return 'far';
}

function StepRow({ s, i, last, next, focus }: { s: PathStep; i: number; last: boolean; next: PathStep | undefined; focus: boolean }) {
  const kind = last ? null : lineKind(s, next) ?? 'walked';
  const delay = i * STEP_DELAY;
  const card = useStgIn(motion.revealDur, delay);
  const line = useGrowDownIn(motion.revealDurShort, delay + motion.stagger);
  return (
    <View style={styles.stepRow}>
      <View style={styles.rail}>
        {kind ? <Animated.View style={[styles.line, kind === 'walked' && styles.lineWalked, kind === 'ahead' && styles.lineAhead, kind === 'far' && styles.lineFar, line]} /> : null}
        <Node s={s} delay={delay} />
      </View>
      <Animated.View style={[styles.stepBody, card]}>{s.state === 'later' ? <LaterLine s={s} /> : <StepCard s={s} focus={focus} />}</Animated.View>
    </View>
  );
}

function Node({ s, delay }: { s: PathStep; delay: number }) {
  const pop = usePopIn(motion.revealDurShort, delay);
  const pulse = usePulse(motion.revealDur * 2, delay + motion.revealDur);
  if (s.state === 'later') return <Animated.View style={[styles.nodeWrap, pop]}><View style={styles.dotFar} /></Animated.View>;
  const body =
    s.state === 'won' ? (
      <View style={[styles.node, styles.nodeWon]}>
        <Text style={styles.nodeTick}>✓</Text>
      </View>
    ) : s.state === 'lost' ? (
      <View style={[styles.node, styles.nodeLost]} />
    ) : s.state === 'bye' ? (
      <View style={[styles.node, styles.nodeBye]} />
    ) : s.state === 'open' ? (
      <View style={[styles.node, styles.nodeOpen]}>
        <View style={styles.nodeOpenDot} />
      </View>
    ) : (
      <Animated.View style={[styles.node, styles.nodeNext, pulse]} />
    );
  return <Animated.View style={[styles.nodeWrap, pop]}>{body}</Animated.View>;
}

function StepCard({ s, focus }: { s: PathStep; focus: boolean }) {
  const f = useCopy().tournaments.focus;
  const head = s.state === 'next' ? `${f.ifWinsStep} · ${s.round}` : s.round;
  const meta = s.state === 'won' || s.state === 'lost' ? s.score : s.when;
  return (
    <View style={[styles.card, s.state === 'open' && styles.cardOpen, s.state === 'next' && styles.cardNext, s.state === 'lost' && styles.cardLost, focus && styles.cardFocus]}>
      <Text style={styles.round} numberOfLines={1}>
        {greekCaps(head)}
      </Text>
      <Text style={[styles.against, s.state === 'lost' && styles.lostText]} numberOfLines={2}>
        {s.state === 'bye' ? f.byeStep : s.against ?? f.notYet}
      </Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
  );
}

function LaterLine({ s }: { s: PathStep }) {
  return <Text style={styles.later}>{s.round}</Text>;
}

function ChampionRow({ i, label }: { i: number; label: string }) {
  const pop = usePopIn(motion.revealDur, i * STEP_DELAY);
  return (
    <View style={styles.stepRow}>
      <View style={styles.rail}>
        <Animated.View style={[styles.nodeWrap, pop]}>
          <View style={[styles.node, styles.nodeWon]}>
            <Text style={styles.nodeTick}>✓</Text>
          </View>
        </Animated.View>
      </View>
      <Animated.View style={[styles.stepBody, pop]}>
        <View style={[styles.card, styles.cardChampion]}>
          <Text style={styles.championText}>{label}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

/* ================= the small path, on the summary ================= */

/** one dot per round, the walked ones joined in ink: a glance at how far they got, inside the button that opens it */
export function MiniPath({ run }: { run: Run }) {
  return (
    <View style={styles.mini}>
      {run.steps.map((s, i) => (
        <MiniDot key={s.key} s={s} i={i} joinNext={i < run.steps.length - 1 || run.champion} />
      ))}
    </View>
  );
}

function MiniDot({ s, i, joinNext }: { s: PathStep; i: number; joinNext: boolean }) {
  const pop = usePopIn(motion.revealDurShort, motion.revealDur + i * motion.stagger);
  const walked = s.state === 'won' || s.state === 'bye';
  return (
    <>
      <Animated.View
        style={[
          styles.miniDot,
          s.state === 'won' && styles.miniWon,
          s.state === 'open' && styles.miniOpen,
          s.state === 'next' && styles.miniNext,
          s.state === 'lost' && styles.miniLost,
          pop,
        ]}
      />
      {joinNext ? <View style={[styles.miniLine, walked && styles.miniLineWalked]} /> : null}
    </>
  );
}

/** a white card under a small caps label, the summary's blocks */
export function Block({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <View>
      {label ? <Text style={styles.blockLabel}>{greekCaps(label)}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  closeHit: { minHeight: 44, minWidth: 44, marginLeft: 12, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 8 },
  close: { fontFamily: fonts.bodyBold, fontSize: 28, lineHeight: 32, color: colors.ink },
  pillsBleed: { marginHorizontal: -20 },
  pillRow: { gap: 8, paddingHorizontal: 20 },
  pill: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.mist, alignItems: 'center', justifyContent: 'center' },
  pillOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  pillTextOn: { color: colors.paper },
  stepRow: { flexDirection: 'row', paddingBottom: STEP_GAP },
  rail: { width: RAIL, alignItems: 'center' },
  // from under this node to the next one (through the gap and the next row's top)
  line: { position: 'absolute', top: NODE_TOP + NODE, bottom: -NODE_TOP, width: 3, borderRadius: 2, transformOrigin: 'top' },
  lineWalked: { backgroundColor: colors.ink },
  lineAhead: { width: 0, borderLeftWidth: 2, borderStyle: 'dashed', borderColor: colors.ink, borderRadius: 0 },
  lineFar: { width: 2, backgroundColor: colors.mist },
  nodeWrap: { marginTop: NODE_TOP, width: NODE, height: NODE, alignItems: 'center', justifyContent: 'center' },
  node: { width: NODE, height: NODE, borderRadius: NODE / 2, alignItems: 'center', justifyContent: 'center' },
  // a win is what happened: lime
  nodeWon: { backgroundColor: colors.lime, borderWidth: 2, borderColor: colors.ink },
  nodeTick: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 16, color: colors.ink },
  nodeLost: { backgroundColor: colors.sand, borderWidth: 2, borderColor: colors.stone },
  nodeBye: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.ink },
  nodeOpen: { backgroundColor: colors.paper, borderWidth: 3, borderColor: colors.ink },
  nodeOpenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.ink },
  nodeNext: { backgroundColor: colors.paper, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.ink },
  dotFar: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.mist },
  stepBody: { flex: 1, minWidth: 0, paddingLeft: 10 },
  card: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.white, gap: 2 },
  cardOpen: { borderWidth: 2, borderColor: colors.ink },
  cardNext: { backgroundColor: colors.paper, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.ink },
  cardLost: { backgroundColor: colors.sand },
  cardFocus: { borderWidth: 2, borderColor: colors.ink },
  cardChampion: { backgroundColor: colors.ink },
  championText: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 23, color: colors.paper },
  round: { ...text.label },
  against: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 21, color: colors.ink },
  lostText: { color: colors.inkSoft },
  meta: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18, color: colors.inkSoft, fontVariant: ['tabular-nums'] },
  later: { marginTop: NODE_TOP + 3, fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 19, color: colors.muted },
  mini: { flexDirection: 'row', alignItems: 'center' },
  // on the blue button: walked dots lime (what happened), the match to play white, the slot ahead a dashed ring
  miniDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.white, opacity: 0.35 },
  miniWon: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.lime, opacity: 1 },
  miniOpen: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.white, opacity: 1 },
  miniNext: { width: 16, height: 16, borderRadius: 8, backgroundColor: 'transparent', opacity: 1, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.white },
  miniLost: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.stone, opacity: 1 },
  miniLine: { width: 22, height: 2, backgroundColor: colors.white, opacity: 0.35 },
  miniLineWalked: { opacity: 1 },
  blockLabel: { ...text.label, marginBottom: 8 },
});
