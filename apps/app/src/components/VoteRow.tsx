import { memo, useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type CSSTransitionProperties } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useCopy } from '../i18n';
import type { CardMatch, CardPct, CardSide } from '../lib/feed';
import { sideLabel, rowTime } from '../lib/home';
import { runJpop, usePopIn, usePress, useStgIn } from '../lib/motion';
import { HOLD_MS, holdFor, pointOf, type HoldPerson } from '../lib/playerHold';
import { initialLock, lockOf, lockProgress, locksVersion, pickedSide, subscribeLocks, tapVote, undoVote, type LockState } from '../lib/voteLock';
import { fmt, type Side } from '../lib/votes';
import { cardSurface, colors, fonts, motion, text } from '../theme';

/**
 * One match as a row (mockup D, founder 22 Oct): the time on the left, a small line with the tournament and category,
 * then the two names as full-width buttons, one under the other (a pair shows both surnames). Tap a name to vote.
 *
 * A vote is final on the server, so a tap first locks in (lib/voteLock): the name fills ink, a bar runs along it for
 * `motion.voteLock` and «Αναίρεση» shows under the names; a tap on the other name moves the pick. Only when the bar
 * completes does `onVote` run (the screen's vote path: cast_vote, the burst, quests, error toasts). The lock-in lives
 * outside the row, so leaving the screen still sends it.
 * voted     your name ink, the other muted, both percentages
 * resolved  the winner lime with ✓ and the points you got (`result`)
 * A hold on a name opens the player's run (playerHold); a hold elsewhere on the row opens «Αναφορά».
 */

/** hold the row this long for «Αναφορά», longer than a name's hold */
const LONG_PRESS_MS = 450;
const FILL_MS = 250;
const JPOP_MS = 400;
const ENTER_MS = motion.revealDur;

function haptic(kind: 'tap' | 'done' | 'undo') {
  if (Platform.OS === 'web') return;
  const run =
    kind === 'tap'
      ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      : kind === 'done'
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        : Haptics.selectionAsync();
  run.catch(() => undefined);
}

interface Props {
  match: CardMatch;
  /** sends the vote and resolves with the split; a rejection puts the row back */
  onVote: (matchId: string, side: Side) => Promise<CardPct>;
  /** a hold on the row (not a name): «Αναφορά» */
  onLongPress?: (matchId: string) => void;
  /** the small line: «Open Γλυφάδας · 40+»; defaults to the tournament and category */
  where?: string;
  /** a played match: who won and what your call brought */
  result?: { winner: Side; points: number | null };
  /** its place in the list, for the stagger */
  index?: number;
}

export const VoteRow = memo(function VoteRow({ match, onVote, onLongPress, where, result, index = 0 }: Props) {
  const t = useCopy();
  useSyncExternalStore(subscribeLocks, locksVersion, locksVersion);
  const state = lockOf(match.id, initialLock(match.myVote, match.split));
  const picked = pickedSide(state);
  const enter = useStgIn(ENTER_MS, Math.min(index, 8) * motion.stagger);

  const send = useCallback((side: Side) => onVote(match.id, side), [onVote, match.id]);
  const open = !result && !match.closed && (state.phase === 'idle' || state.phase === 'locking');
  const tap = useCallback(
    (side: Side) => {
      if (!open) return;
      if (tapVote(match.id, side, send, motion.voteLock)) haptic('tap');
    },
    [open, match.id, send],
  );
  const undo = () => {
    if (undoVote(match.id)) haptic('undo');
  };
  // the vote went in while you look: a short success tick (not for one that was in already)
  const phase = state.phase;
  const was = useRef(phase);
  useEffect(() => {
    if (was.current === 'sending' && phase === 'voted') haptic('done');
    was.current = phase;
  }, [phase]);

  const split = state.phase === 'voted' ? state.split : null;
  const small = where ?? [match.group?.title, match.category].filter(Boolean).join(' · ');
  const hold = onLongPress ? () => onLongPress(match.id) : undefined;

  return (
    <Animated.View style={enter}>
      <Pressable onLongPress={hold} delayLongPress={LONG_PRESS_MS} accessibilityLabel={small || undefined}>
        <View style={styles.row}>
          <View style={styles.time}>
            <Text style={styles.timeText}>{rowTime(match, t)}</Text>
            {match.later ? <Text style={styles.small}>{t.match.tomorrow}</Text> : null}
          </View>
          <View style={styles.body}>
            {small ? (
              <Text numberOfLines={1} style={styles.small}>
                {small}
              </Text>
            ) : null}
            {(['a', 'b'] as const).map((s) => (
              <NameButton
                key={s}
                side={s}
                data={match[s]}
                state={state}
                picked={picked === s}
                other={picked !== null && picked !== s}
                pct={split ? (s === 'a' ? split.pctA : split.pctB) : null}
                won={result ? result.winner === s : null}
                disabled={!open}
                onTap={tap}
                onHold={holdFor(match, match[s])}
              />
            ))}
            {state.phase === 'locking' ? <Undo onPress={undo} /> : null}
            {result && picked === result.winner ? <Called points={result.points} /> : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

function NameButton({
  side,
  data,
  state,
  picked,
  other,
  pct,
  won,
  disabled,
  onTap,
  onHold,
}: {
  side: Side;
  data: CardSide;
  state: LockState;
  picked: boolean;
  /** the other name was picked: this one steps back */
  other: boolean;
  pct: number | null;
  /** played: true for the winner, false for the other, null before */
  won: boolean | null;
  disabled: boolean;
  onTap: (side: Side) => void;
  onHold?: HoldPerson;
}) {
  const t = useCopy();
  const press = usePress(0.97);
  const reduced = useReducedMotion();
  const jpop = useSharedValue(1);
  const bar = useSharedValue(0);
  const label = sideLabel(data.people);

  useEffect(() => {
    if (picked && won === null) runJpop(jpop, JPOP_MS);
  }, [picked, won, jpop]);

  // the lock-in bar along the picked name: it runs from where it is to the end in what is left of the lock time
  const locking = picked && state.phase === 'locking';
  const since = state.phase === 'locking' ? state.since : 0;
  useEffect(() => {
    cancelAnimation(bar);
    if (!locking) {
      bar.value = 0;
      return;
    }
    const p = lockProgress(state, Date.now(), motion.voteLock);
    bar.value = p;
    bar.value = withTiming(1, { duration: reduced ? 0 : Math.max(0, (1 - p) * motion.voteLock), easing: Easing.linear });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locking, since]);
  const barStyle = useAnimatedStyle(() => ({ width: `${bar.value * 100}%` }));
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: jpop.value }] }));

  const bg = won === true ? colors.lime : won === false ? colors.white : picked ? colors.ink : other ? colors.white : colors.paper;
  const border = won === true ? colors.lime : picked ? colors.ink : colors.mist;
  const fg = won === false || (other && won === null) ? colors.slate : picked && won === null ? colors.paper : colors.ink;
  const face: CSSTransitionProperties & Pick<ViewStyle, 'backgroundColor' | 'borderColor'> = {
    backgroundColor: bg,
    borderColor: border,
    transitionProperty: ['backgroundColor', 'borderColor'],
    transitionDuration: reduced ? 0 : FILL_MS,
    transitionTimingFunction: 'ease-out',
  };
  const right = won === true ? '✓' : pct !== null ? `${pct}%` : '';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={fmt(t.home.vote.a11yVote, { name: data.people.map((p) => `${p.first} ${p.surname}`).join(' & ') })}
      accessibilityState={{ selected: picked, disabled }}
      disabled={disabled && !onHold}
      onPress={disabled ? undefined : () => onTap(side)}
      onLongPress={onHold ? (e) => onHold(0, pointOf(e)) : undefined}
      delayLongPress={HOLD_MS}
      onPressIn={disabled ? undefined : press.onPressIn}
      onPressOut={press.onPressOut}
    >
      <Animated.View style={[styles.name, face, press.style, popStyle]}>
        {locking ? <Animated.View pointerEvents="none" style={[styles.bar, barStyle]} /> : null}
        <Text numberOfLines={1} style={[styles.nameText, { color: fg }]}>
          {label}
        </Text>
        {right ? <Pct key={right} text={right} color={fg} /> : null}
      </Animated.View>
    </Pressable>
  );
}

/** the percentage (or ✓) pops in when it arrives */
function Pct({ text: value, color }: { text: string; color: string }) {
  const pop = usePopIn(450, 120);
  return <Animated.Text style={[styles.pct, { color }, pop]}>{value}</Animated.Text>;
}

/** «Αναίρεση» while the bar runs */
function Undo({ onPress }: { onPress: () => void }) {
  const t = useCopy();
  const press = usePress(0.95);
  const pop = usePopIn(300);
  return (
    <Animated.View style={[styles.undoWrap, pop]}>
      <Pressable accessibilityRole="button" onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} hitSlop={8} style={styles.undoHit}>
        <Animated.Text style={[styles.undo, press.style]}>{t.home.vote.undo}</Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

/** «Το είχες ✓» and the points, in lime: earned */
function Called({ points }: { points: number | null }) {
  const t = useCopy();
  const pop = usePopIn(450, 200);
  return (
    <View style={styles.called}>
      <Text style={styles.small}>{t.home.vote.called}</Text>
      {points !== null && points > 0 ? (
        <Animated.View style={[styles.pointsPill, pop]}>
          <Text style={styles.pointsText}>{`+${points}`}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, padding: 10, borderRadius: 16, backgroundColor: cardSurface },
  time: { width: 52, alignItems: 'center', justifyContent: 'center', gap: 2 },
  timeText: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 19, color: colors.ink },
  body: { flex: 1, minWidth: 0, gap: 6 },
  small: { ...text.meta, fontSize: 13, lineHeight: 17 },
  name: {
    minHeight: 46,
    overflow: 'hidden',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  // the lock-in runs along the bottom of the ink name, in paper
  bar: { position: 'absolute', left: 0, bottom: 0, height: 3, backgroundColor: colors.paper },
  nameText: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 21 },
  pct: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 19 },
  undoWrap: { alignItems: 'flex-end' },
  undoHit: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 4 },
  undo: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.inkSoft, textDecorationLine: 'underline' },
  called: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pointsPill: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8, backgroundColor: colors.lime },
  pointsText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink },
});
