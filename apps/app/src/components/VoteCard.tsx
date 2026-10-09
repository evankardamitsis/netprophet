import { memo, useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { CardMatch, CardPct, CardSide } from '../lib/feed';
import type { Side } from '../lib/votes';
import { alpha, bezier, cardSurface, colors, fonts, motion, radii, spacing } from '../theme';

type Phase = 'idle' | 'sending' | 'reveal' | 'folded';

const FOLD_HOLD_MS = 650; // how long the split stays on screen before the card folds
const FOLD_DUR = 500;

const ease = Easing.bezier(...bezier);

function haptic(kind: 'tap' | 'fold' | 'error') {
  if (Platform.OS === 'web') return;
  const run =
    kind === 'tap'
      ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      : Haptics.notificationAsync(
          kind === 'fold' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
        );
  run.catch(() => undefined);
}

interface Props {
  match: CardMatch;
  index?: number;
  /** Sends the vote and resolves with the split to reveal. A rejection puts the card back to idle. */
  onVote: (matchId: string, side: Side) => Promise<CardPct>;
}

export const VoteCard = memo(function VoteCard({ match, index = 0, onVote }: Props) {
  const voted = match.myVote !== undefined && match.split !== undefined;
  const [phase, setPhase] = useState<Phase>(voted ? 'folded' : 'idle');
  const [pick, setPick] = useState<Side | undefined>(match.myVote);
  const [split, setSplit] = useState<CardPct | undefined>(match.split);
  const progress = useSharedValue(0);

  const vote = useCallback(
    (side: Side) => {
      if (phase !== 'idle') return;
      setPick(side);
      setPhase('sending');
      haptic('tap');
      onVote(match.id, side).then(
        (s) => {
          setSplit(s);
          setPhase('reveal');
          progress.value = withTiming(1, { duration: motion.revealDur, easing: ease });
        },
        () => {
          haptic('error');
          setPick(undefined);
          setPhase('idle');
        },
      );
    },
    [phase, progress, onVote, match.id],
  );

  useEffect(() => {
    if (phase !== 'reveal') return undefined;
    const id = setTimeout(() => {
      haptic('fold');
      setPhase('folded');
    }, motion.revealDur + FOLD_HOLD_MS);
    return () => clearTimeout(id);
  }, [phase]);

  const pctA = split?.pctA ?? 0;
  const pctB = split?.pctB ?? 0;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * motion.stagger).duration(motion.revealDur).easing(ease)}
      layout={LinearTransition.duration(FOLD_DUR).easing(ease)}
      style={styles.card}
    >
      {match.meta ? (
        <Text style={styles.meta} numberOfLines={1}>
          {match.meta}
        </Text>
      ) : null}

      {phase !== 'folded' ? (
        <Animated.View key="open" exiting={FadeOut.duration(220)}>
          <Side side="a" player={match.a} phase={phase} pick={pick} pct={pctA} onPress={vote} />
          <View style={styles.gap} />
          <Side side="b" player={match.b} phase={phase} pick={pick} pct={pctB} onPress={vote} />
          {phase === 'reveal' ? <SplitBar progress={progress} pctA={pctA} pctB={pctB} pick={pick} /> : null}
        </Animated.View>
      ) : (
        <Animated.View key="folded" entering={FadeIn.duration(motion.revealDur / 2)}>
          <FoldedRow player={pick === 'a' ? match.a : match.b} pct={pick === 'a' ? pctA : pctB} picked />
          <FoldedRow player={pick === 'a' ? match.b : match.a} pct={pick === 'a' ? pctB : pctA} />
          <Text style={styles.learn}>{match.learn}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
});

interface SideProps {
  side: Side;
  player: CardSide;
  phase: Phase;
  pick: Side | undefined;
  pct: number;
  onPress: (side: Side) => void;
}

function Side({ side, player, phase, pick, pct, onPress }: SideProps) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const chosen = pick === side;
  const dimmed = phase !== 'idle' && !chosen;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${player.subtitle} ${player.title}`}
      disabled={phase !== 'idle'}
      onPress={() => onPress(side)}
      onPressIn={() => {
        scale.value = withSpring(0.96, motion.spring);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.spring);
      }}
    >
      <Animated.View style={[styles.side, chosen && styles.sideChosen, dimmed && styles.sideDim, style]}>
        <View style={styles.names}>
          <Text style={styles.surname} numberOfLines={1}>
            {chosen ? '✓ ' : ''}
            {player.title}
          </Text>
          <Text style={styles.first}>{player.subtitle}</Text>
          {player.detail ? <Text style={styles.sub}>{player.detail}</Text> : null}
        </View>
        {phase === 'reveal' ? (
          <Animated.Text entering={FadeIn.duration(motion.revealDur / 2)} style={styles.pct}>
            {pct}%
          </Animated.Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

function SplitBar({
  progress,
  pctA,
  pctB,
  pick,
}: {
  progress: SharedValue<number>;
  pctA: number;
  pctB: number;
  pick: Side | undefined;
}) {
  const a = useAnimatedStyle(() => ({ width: `${pctA * progress.value}%` }));
  const b = useAnimatedStyle(() => ({ width: `${pctB * progress.value}%` }));
  return (
    <View style={styles.bar}>
      <Animated.View style={[styles.seg, pick === 'a' ? styles.segPick : styles.segOther, a]} />
      <Animated.View style={[styles.seg, pick === 'b' ? styles.segPick : styles.segOther, b]} />
    </View>
  );
}

function FoldedRow({ player, pct, picked = false }: { player: CardSide; pct: number; picked?: boolean }) {
  return (
    <View style={styles.foldRow}>
      <Text style={[styles.foldName, picked ? styles.foldPicked : styles.foldOther]} numberOfLines={1}>
        {picked ? '✓ ' : ''}
        {player.title}
        <Text style={styles.foldFirst}>{`  ${player.subtitle}`}</Text>
      </Text>
      <Text style={[styles.foldPct, picked ? styles.foldPicked : styles.foldOther]}>{pct}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: cardSurface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: alpha(colors.ink, 0.12),
    padding: spacing[4],
    overflow: 'hidden',
  },
  meta: { color: colors.muted, fontFamily: fonts.bodySemi, fontSize: 12, marginBottom: spacing[3] },
  gap: { height: spacing[2] },
  side: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.md,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    marginHorizontal: -spacing[3],
  },
  sideChosen: { backgroundColor: alpha(colors.ink, 0.06) },
  sideDim: { opacity: 0.45 },
  names: { flexShrink: 1 },
  surname: { color: colors.ink, fontFamily: fonts.displayHeavy, fontSize: 40, lineHeight: 44 },
  first: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, marginTop: -2 },
  sub: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  pct: { color: colors.ink, fontFamily: fonts.displayHeavy, fontSize: 32, marginLeft: spacing[3] },
  bar: { flexDirection: 'row', gap: 3, height: 10, marginTop: spacing[3] },
  seg: { height: 10, borderRadius: radii.pill },
  segPick: { backgroundColor: colors.ink },
  segOther: { backgroundColor: alpha(colors.ink, 0.25) },
  foldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 2 },
  foldName: { flexShrink: 1, fontFamily: fonts.displayHeavy, fontSize: 24 },
  foldFirst: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  foldPct: { fontFamily: fonts.displayHeavy, fontSize: 22, marginLeft: spacing[3] },
  foldPicked: { color: colors.ink },
  foldOther: { color: colors.muted },
  learn: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, marginTop: spacing[2] },
});
