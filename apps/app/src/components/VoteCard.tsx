import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { CardMatch, CardPct, CardSide } from '../lib/feed';
import { runJpop, runPop, usePopIn, usePress } from '../lib/motion';
import type { Side } from '../lib/votes';
import { cardSurface, colors, ease, fonts } from '../theme';

/**
 * Feed match card, prototype V2 («Τι παίζει σήμερα;»):
 * idle      two vote buttons side by side, avatars on the top edge
 * revealed  the pick gets an ink border and a jpop, lime fills grow to the split, percentages pop in
 * folded    1100ms after the tap (as in the prototype, whatever the network took), and never before the
 *           fills finish growing: one row, lime under the pick, ✓ and both percentages
 */
type Phase = 'idle' | 'sending' | 'revealed' | 'folded';

const FOLD_AFTER_MS = 1100;
const FILL_MS = 600;
const PCT_POP_MS = 450;
const PCT_POP_DELAY = 120;
const BORDER_MS = 400;
const JPOP_MS = 400;
const FOLD_MS = 550;
const ENTER_MS = 400;
const AVATAR_POP_MS = 400;
const AVATAR_POP_DELAY = 150;

const cssEase = Easing.bezier(0.25, 0.1, 0.25, 1);
const foldEase = Easing.bezier(0.4, 0, 0.2, 1);

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

/** fcIn: fade in from 10px below. `run` false keeps it still (a card that folds in place does not re-enter). */
function useEnter(run = true) {
  const p = useSharedValue(run ? 0 : 1);
  useEffect(() => {
    if (run) p.value = withTiming(1, { duration: ENTER_MS, easing: cssEase });
  }, [p, run]);
  return useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 10 }] }));
}

interface Props {
  match: CardMatch;
  /** Sends the vote and resolves with the split to reveal. A rejection puts the card back to idle. */
  onVote: (matchId: string, side: Side) => Promise<CardPct>;
}

export const VoteCard = memo(function VoteCard({ match, onVote }: Props) {
  const voted = match.myVote !== undefined && match.split !== undefined;
  const [phase, setPhase] = useState<Phase>(voted ? 'folded' : 'idle');
  const [pick, setPick] = useState<Side | undefined>(match.myVote);
  const [split, setSplit] = useState<CardPct | undefined>(match.split);
  const enter = useEnter();
  const tappedAt = useRef(0);

  const vote = useCallback(
    (side: Side) => {
      if (phase !== 'idle') return;
      tappedAt.current = Date.now();
      setPick(side);
      setPhase('sending');
      haptic('tap');
      onVote(match.id, side).then(
        (s) => {
          setSplit(s);
          setPhase('revealed');
        },
        () => {
          haptic('error');
          setPick(undefined);
          setPhase('idle');
        },
      );
    },
    [phase, onVote, match.id],
  );

  useEffect(() => {
    if (phase !== 'revealed') return undefined;
    const left = FOLD_AFTER_MS - (Date.now() - tappedAt.current);
    const id = setTimeout(() => {
      haptic('fold');
      setPhase('folded');
    }, Math.max(left, FILL_MS));
    return () => clearTimeout(id);
  }, [phase]);

  if (phase === 'folded' && pick && split) {
    return <FoldedCard match={match} pick={pick} split={split} fresh={voted} />;
  }

  const revealed = phase === 'revealed' && split !== undefined;
  return (
    <Animated.View style={[styles.card, enter]}>
      <Text style={styles.meta}>{match.meta}</Text>
      <View style={styles.grid}>
        <VoteButton
          side="a"
          data={match.a}
          doubles={match.doubles}
          picked={pick === 'a'}
          disabled={phase !== 'idle'}
          pct={revealed ? split.pctA : null}
          onPress={vote}
        />
        <VoteButton
          side="b"
          data={match.b}
          doubles={match.doubles}
          picked={pick === 'b'}
          disabled={phase !== 'idle'}
          pct={revealed ? split.pctB : null}
          onPress={vote}
        />
      </View>
    </Animated.View>
  );
});

interface VoteButtonProps {
  side: Side;
  data: CardSide;
  doubles: boolean;
  picked: boolean;
  disabled: boolean;
  /** null until the split is known */
  pct: number | null;
  onPress: (side: Side) => void;
}

function VoteButton({ side, data, doubles, picked, disabled, pct, onPress }: VoteButtonProps) {
  const press = usePress();
  const line = useSharedValue(0);
  const jpop = useSharedValue(1);
  const fill = useSharedValue(0);
  const pctScale = useSharedValue(0.4);
  const pctOpacity = useSharedValue(0);

  useEffect(() => {
    line.value = withTiming(picked ? 1 : 0, { duration: BORDER_MS, easing: cssEase });
    if (picked) runJpop(jpop, JPOP_MS);
  }, [picked, line, jpop]);

  useEffect(() => {
    if (pct === null) return;
    fill.value = withTiming(pct, { duration: FILL_MS, easing: ease });
    runPop(pctScale, pctOpacity, PCT_POP_MS, PCT_POP_DELAY);
  }, [pct, fill, pctScale, pctOpacity]);

  const box = useAnimatedStyle(() => ({
    borderColor: interpolateColor(line.value, [0, 1], [colors.slate, colors.ink]),
    transform: [{ scale: jpop.value }],
  }));
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value}%` }));
  const pctStyle = useAnimatedStyle(() => ({ opacity: pctOpacity.value, transform: [{ scale: pctScale.value }] }));
  const names = data.people.map((p) => `${p.first} ${p.surname}`).join(' & ');

  return (
    <View style={styles.col}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={names}
        accessibilityState={{ selected: picked, disabled }}
        disabled={disabled}
        onPress={() => onPress(side)}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
      >
        <Animated.View style={press.style}>
          <Animated.View style={[styles.vb, doubles && styles.vbDbl, box]}>
            <Animated.View style={[styles.fill, fillStyle]} />
            {/* always mounted: Reanimated (web) does not animate a view that appears mid-flight */}
            <Animated.Text style={[styles.pct, doubles && styles.pctDbl, pctStyle]}>{pct === null ? '' : `${pct}%`}</Animated.Text>
            {data.people.map((p, i) => (
              <View key={i}>
                <Text numberOfLines={1} style={[styles.sn, doubles && styles.snDbl]}>
                  {p.surname}
                </Text>
                <Text numberOfLines={1} style={styles.fn}>
                  {p.first}
                </Text>
              </View>
            ))}
            {data.sub ? <Text style={styles.sub}>{data.sub}</Text> : null}
          </Animated.View>
        </Animated.View>
      </Pressable>
      {data.people.map((p, i) => (
        <Avatar key={i} initials={p.initials} left={i === 0 ? 8 : 44} />
      ))}
    </View>
  );
}

function Avatar({ initials, left }: { initials: string; left: number }) {
  const pop = usePopIn(AVATAR_POP_MS, AVATAR_POP_DELAY);
  return (
    <Animated.View style={[styles.av, { left }, pop]} pointerEvents="none">
      <Text style={styles.avText}>{initials}</Text>
    </Animated.View>
  );
}

function FoldedCard({
  match,
  pick,
  split,
  fresh,
}: {
  match: CardMatch;
  pick: Side;
  split: CardPct;
  /** true when the feed loaded it already voted: it enters like any card instead of folding */
  fresh: boolean;
}) {
  const enter = useEnter(fresh);
  const op = useSharedValue(fresh ? 1 : 0.35);
  useEffect(() => {
    if (!fresh) op.value = withTiming(1, { duration: FOLD_MS, easing: foldEase });
  }, [op, fresh]);
  const fold = useAnimatedStyle(() => ({ opacity: op.value }));
  const myPct = pick === 'a' ? split.pctA : split.pctB;
  return (
    <Animated.View style={[styles.done, enter, fold]}>
      <Text style={[styles.meta, styles.doneMeta]}>{match.meta}</Text>
      <View style={styles.row}>
        <View style={[styles.rowFill, pick === 'a' ? styles.rowFillLeft : styles.rowFillRight, { width: `${myPct}%` }]} />
        <Half data={match.a} pct={split.pctA} on={pick === 'a'} />
        <Half data={match.b} pct={split.pctB} on={pick === 'b'} />
      </View>
    </Animated.View>
  );
}

function Half({ data, pct, on }: { data: CardSide; pct: number; on: boolean }) {
  const fg = on ? colors.ink : colors.inkSoft;
  return (
    <View style={styles.half}>
      <Text style={[styles.tick, { color: fg }]}>{on ? '✓' : ''}</Text>
      <View style={styles.halfNames}>
        {data.people.map((p, i) => (
          <View key={i}>
            <Text numberOfLines={1} style={[styles.rowSn, { color: fg }, i > 0 && styles.rowSnNext]}>
              {p.surname}
            </Text>
            <Text numberOfLines={1} style={styles.rowFn}>
              {p.first}
            </Text>
          </View>
        ))}
      </View>
      <Text style={[styles.rowPct, { color: fg }, on ? styles.rowPctOn : null]}>{`${pct}%`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 24,
    backgroundColor: cardSurface,
    borderWidth: 1,
    borderColor: colors.mist,
    gap: 12,
  },
  meta: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 19.5, color: colors.inkSoft },
  grid: { flexDirection: 'row', gap: 10 },
  col: { flex: 1, minWidth: 0, paddingTop: 22 },
  vb: {
    overflow: 'hidden',
    minHeight: 148,
    paddingTop: 44,
    paddingHorizontal: 10,
    paddingBottom: 12,
    borderRadius: 18,
    borderWidth: 2,
    backgroundColor: colors.paper,
    justifyContent: 'flex-end',
    gap: 2,
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.lime },
  pct: {
    position: 'absolute',
    right: 12,
    top: 28,
    fontFamily: fonts.displayHeavy,
    fontSize: 30,
    lineHeight: 30,
    color: colors.ink,
  },
  // doubles: the two players spread over the whole button instead of piling up at the bottom;
  // the % moves to the bottom corner so a long first surname never runs under it
  vbDbl: { paddingTop: 32, justifyContent: 'space-between' },
  pctDbl: { top: 'auto', bottom: 12, fontSize: 24, lineHeight: 24 },
  sn: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 30, color: colors.ink },
  snDbl: { fontSize: 25, lineHeight: 25 },
  fn: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 18.75, color: colors.inkSoft },
  sub: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 19.5, color: colors.inkSoft },
  av: {
    position: 'absolute',
    top: 0,
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.ink,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.lime },
  done: {
    overflow: 'hidden',
    paddingTop: 12,
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderRadius: 20,
    backgroundColor: cardSurface,
    borderWidth: 1,
    borderColor: colors.mist,
    gap: 8,
  },
  doneMeta: { paddingHorizontal: 8 },
  row: {
    overflow: 'hidden',
    minHeight: 60,
    borderRadius: 12,
    backgroundColor: colors.paper,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  rowFill: { position: 'absolute', top: 0, bottom: 0, backgroundColor: colors.lime },
  rowFillLeft: { left: 0 },
  rowFillRight: { right: 0 },
  half: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
  tick: { fontFamily: fonts.bodyBold, fontSize: 15 },
  halfNames: { flexShrink: 1, minWidth: 0 },
  rowSn: { fontFamily: fonts.displayHeavy, fontSize: 20, lineHeight: 20 },
  rowSnNext: { paddingTop: 4 },
  rowFn: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 18, color: colors.inkSoft },
  rowPct: { marginLeft: 'auto', fontFamily: fonts.bodySemi, fontSize: 15 },
  rowPctOn: { fontFamily: fonts.bodyBold },
});
