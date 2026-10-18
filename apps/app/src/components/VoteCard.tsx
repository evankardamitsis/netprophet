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
import { FitText } from './FitText';
import { runJpop, runPop, usePopIn, usePress } from '../lib/motion';
import type { Side } from '../lib/votes';
import { cardSurface, colors, ease, fonts, text } from '../theme';
import { useCopy } from '../i18n';
import { Lit } from './Lit';
import { Avatar as DrawnAvatar } from './Avatar';
import type { AvatarLook } from '../lib/avatar';
import { Logo } from './Logo';

/**
 * Feed match card, prototype V2 («Τι παίζει σήμερα;»):
 * idle      two vote buttons side by side, each player a small avatar beside the name (founder, 16 Oct: compact,
 *           easy to read; the tournament and where it is played sit once above the run of cards)
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

/** hold a card this long for «Αναφορά» */
const LONG_PRESS_MS = 450;

interface Props {
  match: CardMatch;
  /** Sends the vote and resolves with the split to reveal. A rejection puts the card back to idle. */
  onVote: (matchId: string, side: Side) => Promise<CardPct>;
  /** a long press opens «Αναφορά» */
  onLongPress?: (matchId: string) => void;
}

export const VoteCard = memo(function VoteCard({ match, onVote, onLongPress }: Props) {
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

  const hold = onLongPress ? () => onLongPress(match.id) : undefined;
  if (match.closed) return <ClosedCard match={match} onLongPress={hold} />;
  if (phase === 'folded' && pick && split) {
    return (
      <Pressable onLongPress={hold} delayLongPress={LONG_PRESS_MS}>
        <FoldedCard match={match} pick={pick} split={split} fresh={voted} />
      </Pressable>
    );
  }

  const revealed = phase === 'revealed' && split !== undefined;
  return (
    <Pressable onLongPress={hold} delayLongPress={LONG_PRESS_MS}>
      <Animated.View style={[styles.card, enter]}>
        <Meta match={match} />
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
    </Pressable>
  );
});

/**
 * Voting has closed (founder, 17 Oct): the match as it stands, both sides without buttons, the crowd's split and your
 * pick if you made one, and «Οι ψήφοι έκλεισαν» under them. It leaves Σήμερα when the result comes in.
 */
function ClosedCard({ match, onLongPress }: { match: CardMatch; onLongPress?: () => void }) {
  const t = useCopy();
  const enter = useEnter();
  const none = () => undefined;
  return (
    <Pressable onLongPress={onLongPress} delayLongPress={LONG_PRESS_MS} accessibilityLabel={`${match.meta}. ${t.match.closed}`}>
      <Animated.View style={[styles.card, enter]}>
        <Meta match={match} />
        <View style={styles.grid}>
          <VoteButton side="a" data={match.a} doubles={match.doubles} picked={match.myVote === 'a'} disabled pct={match.split ? match.split.pctA : null} onPress={none} />
          <VoteButton side="b" data={match.b} doubles={match.doubles} picked={match.myVote === 'b'} disabled pct={match.split ? match.split.pctB : null} onPress={none} />
        </View>
        <Text style={styles.closed}>{t.match.closed}</Text>
      </Animated.View>
    </Pressable>
  );
}

/** the meta line; a match that moved to a new day gets the «Νέα μέρα» chip and «(ήταν Τρι 13/10)» after the time */
function Meta({ match, style }: { match: CardMatch; style?: object }) {
  if (!match.place) return <MetaLine match={match} style={style} />;
  // «PRC (Μαρούσι) · Σκληρό» under it: where it is played
  return (
    <View style={[styles.metaStack, style]}>
      <MetaLine match={match} />
      <View style={styles.placeRow}>
        {match.club ? <Logo path={match.club.logo} name={match.club.name} size={16} /> : null}
        <Text style={styles.place}>{match.place}</Text>
      </View>
    </View>
  );
}

function MetaLine({ match, style }: { match: CardMatch; style?: object }) {
  const m = match.moved;
  const cat = match.category ? (
    <View style={styles.category}>
      <Text style={styles.categoryText}>{match.category}</Text>
    </View>
  ) : null;
  if (!m)
    return cat ? (
      <View style={[styles.metaRow, style]}>
        {cat}
        <Text style={styles.meta}>{match.meta}</Text>
      </View>
    ) : (
      <Text style={[styles.meta, style]}>{match.meta}</Text>
    );
  return (
    <View style={[styles.metaRow, style]}>
      {cat}
      <Text style={styles.meta}>{m.head}</Text>
      <View style={styles.chip}>
        <Text style={styles.chipText}>{m.chip}</Text>
      </View>
      <Text style={styles.meta}>{m.tail ? `${m.was} · ${m.tail}` : m.was}</Text>
    </View>
  );
}

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
          <Animated.View style={[styles.vb, box]}>
            <Animated.View style={[styles.fill, fillStyle]} />
            {/* always mounted: Reanimated (web) does not animate a view that appears mid-flight */}
            <Animated.Text style={[styles.pct, pctStyle]}>{pct === null ? '' : `${pct}%`}</Animated.Text>
            {data.people.map((p, i) => (
              <View key={i} style={styles.person}>
                <Avatar initials={p.initials} look={p.look ?? null} />
                <View style={styles.names}>
                  <FitText text={p.surname} style={[styles.sn, doubles && styles.snDbl]} />
                  <Text numberOfLines={1} style={styles.fn}>
                    {p.first}
                  </Text>
                </View>
              </View>
            ))}
            {data.level || data.area ? (
              <View style={styles.facts}>
                {data.level ? (
                  <View style={styles.levelPill}>
                    <Text style={styles.levelText}>{data.level}</Text>
                  </View>
                ) : null}
                {data.area ? (
                  <Text numberOfLines={1} style={styles.area}>
                    {data.area}
                  </Text>
                ) : null}
              </View>
            ) : data.sub ? (
              <Text style={styles.sub}>{data.sub}</Text>
            ) : null}
          </Animated.View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

/** the player's drawn avatar when they have an account (founder, 14 Oct); otherwise their initials */
function Avatar({ initials, look }: { initials: string; look: AvatarLook | null }) {
  const pop = usePopIn(AVATAR_POP_MS, AVATAR_POP_DELAY);
  return (
    <Animated.View style={[styles.av, look && styles.avDrawn, pop]} pointerEvents="none">
      {look ? (
        <DrawnAvatar look={look} size={AV_SIZE} />
      ) : (
        <>
          <Lit />
          <Text style={styles.avText}>{initials}</Text>
        </>
      )}
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
      <Meta match={match} style={styles.doneMeta} />
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
            <FitText text={p.surname} style={[styles.rowSn, { color: fg }, i > 0 && styles.rowSnNext]} />
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

/** the avatar disc beside the name */
const AV_SIZE = 32;

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: cardSurface,
    borderWidth: 1,
    borderColor: colors.mist,
    gap: 10,
  },
  meta: { ...text.meta, fontFamily: fonts.bodyBold },
  closed: { ...text.meta, fontFamily: fonts.bodyBold, color: colors.inkSoft, textAlign: 'center' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8 },
  metaStack: { gap: 2 },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  place: { ...text.meta, flexShrink: 1 },
  // the category: the card's tag, in the display face (founder, 18 Oct)
  category: { paddingVertical: 2, paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.ink },
  categoryText: { fontFamily: fonts.displayHeavy, fontSize: 17, lineHeight: 22, color: colors.paper },
  chip: { paddingVertical: 2, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.sand },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17, color: colors.inkSoft },
  grid: { flexDirection: 'row', gap: 10 },
  col: { flex: 1, minWidth: 0 },
  vb: {
    overflow: 'hidden',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: colors.paper,
    gap: 8,
  },
  person: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  names: { flex: 1, minWidth: 0 },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.lime },
  // the split, in the bottom corner over the lime, while the card waits to fold
  pct: {
    position: 'absolute',
    right: 10,
    bottom: 8,
    fontFamily: fonts.displayHeavy,
    fontSize: 22,
    lineHeight: 22,
    color: colors.ink,
  },
  sn: { fontFamily: fonts.displayHeavy, fontSize: 24, lineHeight: 24, paddingTop: 4, marginTop: -4, paddingBottom: 5, marginBottom: -5, color: colors.ink },
  snDbl: { fontSize: 21, lineHeight: 21 },
  // the first name belongs to the name: dark and bold, right under the surname
  fn: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 18, color: colors.ink },
  facts: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  levelPill: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999, backgroundColor: colors.sand },
  levelText: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17, color: colors.ink },
  area: { flexShrink: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 17, color: colors.inkSoft },
  sub: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 19.5, color: colors.inkSoft },
  av: {
    width: AV_SIZE,
    height: AV_SIZE,
    borderRadius: 999,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.lime },
  avDrawn: { overflow: 'hidden', backgroundColor: colors.paper },
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
  rowSn: { fontFamily: fonts.displayHeavy, fontSize: 20, lineHeight: 20, paddingBottom: 4, marginBottom: -4 },
  rowSnNext: { paddingTop: 4 },
  rowFn: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 18, color: colors.inkSoft },
  rowPct: { marginLeft: 'auto', fontFamily: fonts.bodySemi, fontSize: 15 },
  rowPctOn: { fontFamily: fonts.bodyBold },
});
