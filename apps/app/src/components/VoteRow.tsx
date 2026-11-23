import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, type CSSTransitionProperties } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useCopy } from '../i18n';
import type { CardMatch, CardPct, CardSide } from '../lib/feed';
import { rowWhere, sideLabel, rowTime } from '../lib/home';
import { hasTime } from '../lib/tournaments';
import { runJpop, usePopIn, usePress, useStgIn } from '../lib/motion';
import { HOLD_MS, holdFor, pointOf, type HoldPerson } from '../lib/playerHold';
import { crowdRole, fmt, type CrowdRole, type Side } from '../lib/votes';
import { setLiveSplit, useLiveSplit } from '../lib/liveSplits';
import { closesInMinutes } from '../lib/homeGuidance';
import { useMinuteClock } from '../lib/minuteClock';
import { noteSessionVote } from '../lib/sessionVotes';
import { cardSurface, colors, fonts, motion, text } from '../theme';
import { Logo } from './Logo';
import { StagePill } from './StagePill';

/**
 * One match as a row (mockup D, founder 22 Oct): the time on the left, a small line with the tournament and category
 * (and the club, with its logo), then the two names as full-width buttons, one under the other (a pair shows both surnames). Tap a name to vote.
 *
 * A tap on a name votes at once (founder, 22 Oct: no lock-in): the name presses in and fills ink, `onVote` runs (the
 * screen's vote path: cast_vote, the burst, quests, error toasts). A vote that fails puts the row back as it was.
 * The crowd's split shows before you vote too and moves while you look (founder, 23 Nov 2026: liveSplits, polled by
 * the screen); with no votes yet, «Κανείς δεν ψήφισε ακόμα, γίνε ο πρώτος». Tap the other name to change your vote,
 * as often as you want, until the match locks.
 * voted     your name filled, the other muted, both percentages
 * resolved  the winner lime with ✓ and the points you got (`result`)
 * A hold on a name opens the player's run (playerHold); a hold elsewhere on the row opens «Αναφορά».
 */

/** hold the row this long for «Αναφορά», longer than a name's hold */
const LONG_PRESS_MS = 450;
const FILL_MS = 250;
const JPOP_MS = 400;
const ENTER_MS = motion.revealDur;

function haptic(kind: 'tap' | 'done') {
  if (Platform.OS === 'web') return;
  const run =
    kind === 'tap' ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium) : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
  /** a closed row with no result yet, in a word under the names: «Έκλεισε» */
  note?: string;
  /** its place in the list, for the stagger */
  index?: number;
}

/** how a row stands: nothing picked, the vote on its way, or in (the split is null for a vote loaded with the feed) */
type RowState = { phase: 'idle' } | { phase: 'sending'; side: Side } | { phase: 'voted'; side: Side; split: CardPct | null };

/** votes cast this session, so a row that unmounts (the list folds, a refresh) and comes back still shows its vote */
const cast = new Map<string, { side: Side; split: CardPct }>();

function startState(match: CardMatch): RowState {
  const mine = cast.get(match.id);
  if (mine) return { phase: 'voted', side: mine.side, split: mine.split };
  return match.myVote ? { phase: 'voted', side: match.myVote, split: match.split ?? null } : { phase: 'idle' };
}

export const VoteRow = memo(function VoteRow({ match, onVote, onLongPress, where, result, note, index = 0 }: Props) {
  const t = useCopy();
  const [state, setState] = useState<RowState>(() => startState(match));
  const picked = state.phase === 'idle' ? null : state.side;
  const enter = useStgIn(ENTER_MS, Math.min(index, 8) * motion.stagger);

  // a name can be tapped until the lock: the first vote, or a change of mind; not while one is on its way
  const open = !result && !match.closed && state.phase !== 'sending';
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const tap = useCallback(
    (side: Side) => {
      if (!open) return;
      if (state.phase === 'voted' && state.side === side) return;
      const before = state;
      haptic('tap');
      setState({ phase: 'sending', side });
      onVote(match.id, side).then(
        (split) => {
          cast.set(match.id, { side, split });
          setLiveSplit(match.id, split);
          noteSessionVote(match.id, side);
          if (mounted.current) {
            haptic('done');
            setState({ phase: 'voted', side, split });
          }
        },
        // the screen says why in a toast; the row goes back to how it was (no vote, or the earlier one)
        () => {
          if (mounted.current) setState(before);
        },
      );
    },
    [open, onVote, match.id, state],
  );

  const live = useLiveSplit(match.id);
  const split = live ?? (state.phase === 'voted' ? state.split : null) ?? match.split ?? null;
  // a split with nobody in it says so instead of 0% / 0%
  const empty = split?.total === 0;
  const showPct = split !== null && !empty;
  const place = rowWhere(where ?? [match.group?.title, match.category].filter(Boolean).join(' · '), match.club);
  const small = place.line;
  const hold = onLongPress ? () => onLongPress(match.id) : undefined;
  // the countdown to the lock, on a row still open
  const counts = !result && !match.closed && !!match.lockAt;

  return (
    <Animated.View style={enter}>
      <Pressable onLongPress={hold} delayLongPress={LONG_PRESS_MS} accessibilityLabel={small || undefined}>
        <View style={styles.row}>
          <View style={styles.time}>
            {/* «Σήμερα» for a row with no time is wider than the column: one line, a little smaller, never «Σήμερ / α» */}
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.timeText, styles.center]}>
              {rowTime(match, t)}
            </Text>
            {match.later && hasTime(match.startsAt) ? <Text style={styles.small}>{t.match.tomorrow}</Text> : null}
          </View>
          <View style={styles.body}>
            {match.stage ? <StagePill stage={match.stage} /> : null}
            {small ? (
              <View style={styles.whereRow}>
                {place.logo && place.clubName ? <Logo path={place.logo} name={place.clubName} size={16} /> : null}
                <Text numberOfLines={1} style={[styles.small, styles.whereText]}>
                  {small}
                </Text>
                {counts ? <ClosesIn lockAt={match.lockAt} /> : null}
              </View>
            ) : counts ? (
              <ClosesIn lockAt={match.lockAt} />
            ) : null}
            {(['a', 'b'] as const).map((s) => (
              <NameButton
                key={s}
                side={s}
                data={match[s]}
                picked={picked === s}
                other={picked !== null && picked !== s}
                pct={showPct && split ? (s === 'a' ? split.pctA : split.pctB) : null}
                crowd={showPct && split ? crowdRole(s === 'a' ? split.pctA : split.pctB, s === 'a' ? split.pctB : split.pctA) : 'even'}
                won={result ? result.winner === s : null}
                disabled={!open}
                onTap={tap}
                onHold={holdFor(match, match[s])}
              />
            ))}
            {result && picked === result.winner ? <Called points={result.points} /> : null}
            {empty && !result && !match.closed && picked === null ? <Text style={styles.small}>{t.home.vote.noVotesYet}</Text> : null}
            {note && !result ? <Text style={styles.small}>{note}</Text> : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

/**
 * «Κλείνει σε 20′» (home guidance board 5.1): a sand tag from 30 minutes before the lock, counting down on the minute
 * (one shared clock). Sand, not lime: nothing has happened yet. It pops in when it first shows.
 */
function ClosesIn({ lockAt }: { lockAt?: string }) {
  const t = useCopy();
  const now = useMinuteClock();
  const n = closesInMinutes(lockAt, new Date(now));
  return n === null ? null : <ClosesInTag text={fmt(t.home.vote.closesIn, { n })} />;
}

function ClosesInTag({ text: label }: { text: string }) {
  const pop = usePopIn(motion.revealDurShort, 0);
  return (
    <Animated.View style={[styles.closes, pop]}>
      <Text numberOfLines={1} style={styles.closesText}>
        {label}
      </Text>
    </Animated.View>
  );
}

const CROWD_COLOR: Record<CrowdRole, string> = { favorite: colors.favorite, underdog: colors.underdog, even: colors.slate };

function NameButton({
  side,
  data,
  picked,
  other,
  pct,
  crowd,
  won,
  disabled,
  onTap,
  onHold,
}: {
  side: Side;
  data: CardSide;
  picked: boolean;
  /** the other name was picked: this one steps back */
  other: boolean;
  pct: number | null;
  /** the crowd's favourite or underdog: the colour of the percentage and its bar */
  crowd: CrowdRole;
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
  const label = sideLabel(data.people);

  useEffect(() => {
    if (picked && won === null) runJpop(jpop, JPOP_MS);
  }, [picked, won, jpop]);

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: jpop.value }] }));

  const bg = won === true ? colors.lime : won === false ? colors.white : picked ? colors.lime : other ? colors.white : colors.paper;
  const border = won === true || picked ? colors.lime : colors.mist;
  const fg = won === false || (other && won === null) ? colors.slate : colors.ink;
  const face: CSSTransitionProperties & Pick<ViewStyle, 'backgroundColor' | 'borderColor'> = {
    backgroundColor: bg,
    borderColor: border,
    transitionProperty: ['backgroundColor', 'borderColor'],
    transitionDuration: reduced ? 0 : FILL_MS,
    transitionTimingFunction: 'ease-out',
  };
  const tone = CROWD_COLOR[crowd];

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
        {pct !== null && won === null ? <Bar pct={pct} color={tone} reduced={reduced} /> : null}
        <Text numberOfLines={1} style={[styles.nameText, { color: fg }]}>
          {label}
        </Text>
        {won === true ? (
          <Tick color={fg} />
        ) : pct !== null ? (
          // on your lime pick the number stays ink to read; elsewhere it takes the crowd's colour
          <Pct value={pct} color={picked ? colors.ink : other && won === null ? fg : tone} reduced={reduced} />
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

/**
 * A line along the bottom of a name, as wide as its share, in the crowd's colour. It grows from nothing when it first
 * shows and slides when the split moves.
 */
function Bar({ pct, color, reduced }: { pct: number; color: string; reduced: boolean }) {
  const [shown, setShown] = useState(reduced ? pct : 0);
  useEffect(() => {
    // one frame at 0 first, so the width transition runs on arrival too
    const id = requestAnimationFrame(() => setShown(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);
  const style: CSSTransitionProperties & Pick<ViewStyle, 'width' | 'backgroundColor'> = {
    width: `${Math.max(0, Math.min(100, shown))}%`,
    backgroundColor: color,
    transitionProperty: ['width', 'backgroundColor'],
    transitionDuration: reduced ? 0 : motion.revealDur,
    transitionTimingFunction: 'ease-out',
  };
  return <Animated.View pointerEvents="none" style={[styles.bar, style]} />;
}

/** counts from `from` to `to` over `ms` (ease-out), a frame at a time; reduced motion jumps */
function useCountTo(to: number, ms: number, reduced: boolean): number {
  const [now, setNow] = useState(reduced ? to : 0);
  const from = useRef(reduced ? to : 0);
  useEffect(() => {
    if (reduced) {
      setNow(to);
      from.current = to;
      return undefined;
    }
    const start = from.current;
    const t0 = Date.now();
    let id = 0;
    const step = () => {
      const k = Math.min(1, (Date.now() - t0) / ms);
      const v = Math.round(start + (to - start) * (1 - (1 - k) ** 3));
      setNow(v);
      from.current = v;
      if (k < 1) id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [to, ms, reduced]);
  return now;
}

/**
 * The percentage: counts up when it arrives and rolls to the new number when the split moves, with a small pulse
 * each time it changes (founder, 23 Nov 2026: "slightly micro animated, not static").
 */
function Pct({ value, color, reduced }: { value: number; color: string; reduced: boolean }) {
  const shown = useCountTo(value, motion.revealDur, reduced);
  const pulse = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!reduced) runJpop(pulse, JPOP_MS);
  }, [value, reduced, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  return <Animated.Text style={[styles.pct, { color }, pulseStyle]}>{`${shown}%`}</Animated.Text>;
}

/** the winner's ✓ pops in */
function Tick({ color }: { color: string }) {
  const pop = usePopIn(450, 120);
  return <Animated.Text style={[styles.pct, { color }, pop]}>✓</Animated.Text>;
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
  whereRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  whereText: { flexShrink: 1, flexGrow: 1 },
  closes: { flexShrink: 0, alignSelf: 'flex-start', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6, backgroundColor: colors.sand },
  closesText: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 16, color: colors.ink },
  center: { textAlign: 'center' },
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
  nameText: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 21 },
  pct: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 19 },
  bar: { position: 'absolute', left: 0, bottom: 0, height: 4, opacity: 0.8 },
  called: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pointsPill: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8, backgroundColor: colors.lime },
  pointsText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink },
});
