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
import { soonLabel, startsSoon, type CardMatch, type CardPct, type CardSide } from '../lib/feed';
import { FitText } from './FitText';
import { PRESS_MS, runJpop, runPop, usePopIn } from '../lib/motion';
import type { Side } from '../lib/votes';
import { cardSurface, colors, ease, fonts, springEase, text, type } from '../theme';
import { useCopy } from '../i18n';
import { Lit } from './Lit';
import { Avatar as DrawnAvatar } from './Avatar';
import type { AvatarLook } from '../lib/avatar';
import { Logo } from './Logo';

/**
 * Feed match card (founder, 19 Oct, design B: voting is the prominent action):
 * idle      each side is itself a dark button: an ink tile with the names in paper, standing on a lip so it reads as
 *           pressable; a touch presses it down onto the lip. «Ποιος κερδίζει;» is said once above the feed, not here;
 *           in its last hour «Ξεκινά σε 40 λεπτά» sits at the end of the card's time line
 * picked    the side you did not pick fades to the paper outline at once; your side shows ✓ and jpops
 * revealed  your side turns paper too, with an ink border; lime fills grow to the split (ink on lime), percentages pop
 * folded    1100ms after the tap (as in the prototype, whatever the network took), and never before the
 *           fills finish growing: one row, lime under the pick, ✓ and both percentages
 */
type Phase = 'idle' | 'sending' | 'revealed' | 'folded';

const FOLD_AFTER_MS = 1100;
const FILL_MS = 600;
const PCT_POP_MS = 450;
const PCT_POP_DELAY = 120;
const TONE_MS = 400;
const JPOP_MS = 400;
const FOLD_MS = 550;
const ENTER_MS = 400;
const AVATAR_POP_MS = 400;
const AVATAR_POP_DELAY = 150;
const TICK_POP_MS = 400;
/** how often an idle card in its last hour reads the clock again */
const SOON_TICK_MS = 30_000;
/** the lip under a dark tile; a press takes the tile down to the last pixel of it */
const EDGE = 5;
/** how much of the lip still shows while pressed */
const EDGE_PRESSED = 1;
/** the side you did not pick, once faded */
const FADED_OPACITY = 0.72;

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
  /** the category tag adds nothing here: its tournament's head says it (feed runCategories) */
  hideCategory?: boolean;
}

export const VoteCard = memo(function VoteCard({ match, onVote, onLongPress, hideCategory = false }: Props) {
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
  if (match.closed) return <ClosedCard match={match} hideCategory={hideCategory} onLongPress={hold} />;
  if (phase === 'folded' && pick && split) {
    return (
      <Pressable onLongPress={hold} delayLongPress={LONG_PRESS_MS}>
        <FoldedCard match={match} pick={pick} split={split} fresh={voted} hideCategory={hideCategory} />
      </Pressable>
    );
  }

  const revealed = phase === 'revealed' && split !== undefined;
  return (
    <Pressable onLongPress={hold} delayLongPress={LONG_PRESS_MS}>
      <Animated.View style={[styles.card, enter]}>
        <Meta match={match} hideCategory={hideCategory} soonAt={phase === 'idle' ? match.startsAt : undefined} />
        <View style={styles.grid}>
          {(['a', 'b'] as const).map((s) => (
            <Tile
              key={s}
              side={s}
              data={match[s]}
              doubles={match.doubles}
              picked={pick === s}
              faded={pick !== undefined && pick !== s}
              flat={false}
              disabled={phase !== 'idle'}
              pct={revealed ? (s === 'a' ? split.pctA : split.pctB) : null}
              onPress={vote}
            />
          ))}
        </View>
      </Animated.View>
    </Pressable>
  );
});

/**
 * Voting has closed (founder, 17 Oct): the match as it stands, both sides flat (no buttons), the crowd's split and your
 * pick if you made one, and «Οι ψήφοι έκλεισαν» under them. It leaves Σήμερα when the result comes in.
 */
function ClosedCard({ match, hideCategory, onLongPress }: { match: CardMatch; hideCategory: boolean; onLongPress?: () => void }) {
  const t = useCopy();
  const enter = useEnter();
  const none = () => undefined;
  return (
    <Pressable onLongPress={onLongPress} delayLongPress={LONG_PRESS_MS} accessibilityLabel={`${match.meta}. ${t.match.closed}`}>
      <Animated.View style={[styles.card, enter]}>
        <Meta match={match} hideCategory={hideCategory} />
        <View style={styles.grid}>
          {(['a', 'b'] as const).map((s) => (
            <Tile
              key={s}
              side={s}
              data={match[s]}
              doubles={match.doubles}
              picked={match.myVote === s}
              faded={match.myVote !== undefined && match.myVote !== s}
              flat
              disabled
              pct={match.split ? (s === 'a' ? match.split.pctA : match.split.pctB) : null}
              onPress={none}
            />
          ))}
        </View>
        <Text style={styles.closed}>{t.match.closed}</Text>
      </Animated.View>
    </Pressable>
  );
}

/** «Ξεκινά σε 40 λεπτά» while the start is under an hour away; the clock is read again only while it is near */
function useSoon(startsAt: string | undefined): string | null {
  const t = useCopy();
  const [now, setNow] = useState(() => new Date());
  const near = startsAt !== undefined && Date.parse(startsAt) - now.getTime() < 2 * 60 * 60_000;
  useEffect(() => {
    if (!near) return undefined;
    const id = setInterval(() => setNow(new Date()), SOON_TICK_MS);
    return () => clearInterval(id);
  }, [near]);
  const soon = startsSoon(startsAt, now);
  return soon === null ? null : soonLabel(soon, t);
}

function SoonChip({ label }: { label: string }) {
  const pop = usePopIn(TICK_POP_MS);
  return (
    <Animated.View style={[styles.soon, pop]}>
      <Text style={styles.soonText}>{label}</Text>
    </Animated.View>
  );
}

interface MetaProps {
  match: CardMatch;
  hideCategory?: boolean;
  /** an idle card's start: «Ξεκινά σε …» at the end of the line in its last hour */
  soonAt?: string;
  style?: object;
}

/** the meta line; a match that moved to a new day gets the «Νέα μέρα» chip and «(ήταν Τρι 13/10)» after the time */
function Meta({ match, style, ...rest }: MetaProps) {
  if (!match.place) return <MetaLine match={match} style={style} {...rest} />;
  // «PRC (Μαρούσι) · Σκληρό» under it: where it is played
  return (
    <View style={[styles.metaStack, style]}>
      <MetaLine match={match} {...rest} />
      <View style={styles.placeRow}>
        {match.club ? <Logo path={match.club.logo} name={match.club.name} size={16} /> : null}
        <Text style={styles.place}>{match.place}</Text>
      </View>
    </View>
  );
}

function MetaLine({ match, hideCategory = false, soonAt, style }: MetaProps) {
  const m = match.moved;
  const soon = useSoon(soonAt);
  // the category: bold ink text a step bigger than the time, no fill (founder, 19 Oct: lighter)
  const cat = match.category && !hideCategory ? <Text style={styles.category}>{match.category}</Text> : null;
  return (
    <View style={[styles.metaRow, style]}>
      {cat}
      {m ? (
        <>
          <Text style={styles.meta}>{m.head}</Text>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{m.chip}</Text>
          </View>
          <Text style={styles.meta}>{m.tail ? `${m.was} · ${m.tail}` : m.was}</Text>
        </>
      ) : (
        <Text style={styles.meta}>{match.meta}</Text>
      )}
      {soon !== null ? <SoonChip label={soon} /> : null}
    </View>
  );
}

interface TileProps {
  side: Side;
  data: CardSide;
  doubles: boolean;
  picked: boolean;
  /** another side was picked: this one steps back to the paper outline */
  faded: boolean;
  /** not a button (voting closed): paper outline from the start, no lip */
  flat: boolean;
  disabled: boolean;
  /** null until the split is known */
  pct: number | null;
  onPress: (side: Side) => void;
}

/**
 * One side as a dark pressable tile on a lip (design B). It turns to the paper look when it steps back (the other side
 * was picked) or once the split shows on your pick, so the lime fill always carries ink text. The names are drawn twice,
 * paper for the dark tile and ink for the paper one, and cross-fade with the tile.
 */
function Tile({ side, data, doubles, picked, faded, flat, disabled, pct, onPress }: TileProps) {
  const light = flat || faded || (picked && pct !== null);
  const press = useSharedValue(0);
  const tone = useSharedValue(light ? 1 : 0);
  const dim = useSharedValue(faded ? 1 : 0);
  const jpop = useSharedValue(1);
  const fill = useSharedValue(0);
  const pctScale = useSharedValue(0.4);
  const pctOpacity = useSharedValue(0);
  const tickScale = useSharedValue(picked ? 1 : 0.4);
  const tickOpacity = useSharedValue(picked ? 1 : 0);
  // the ink copy of the names mounts once it can show (a pick, or a closed card), so idle cards draw them once
  const [inked, setInked] = useState(light);
  if (light && !inked) setInked(true);

  useEffect(() => {
    tone.value = withTiming(light ? 1 : 0, { duration: TONE_MS, easing: cssEase });
  }, [light, tone]);
  useEffect(() => {
    dim.value = withTiming(faded ? 1 : 0, { duration: TONE_MS, easing: cssEase });
  }, [faded, dim]);
  useEffect(() => {
    if (picked) {
      runJpop(jpop, JPOP_MS);
      runPop(tickScale, tickOpacity, TICK_POP_MS);
    } else tickOpacity.value = withTiming(0, { duration: TONE_MS });
  }, [picked, jpop, tickScale, tickOpacity]);
  useEffect(() => {
    if (pct === null) return;
    fill.value = withTiming(pct, { duration: FILL_MS, easing: ease });
    runPop(pctScale, pctOpacity, PCT_POP_MS, PCT_POP_DELAY);
  }, [pct, fill, pctScale, pctOpacity]);

  const faceStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(tone.value, [0, 1], [colors.ink, colors.paper]),
    borderColor: picked
      ? interpolateColor(tone.value, [0, 1], [colors.inkLine, colors.ink])
      : interpolateColor(tone.value, [0, 1], [colors.inkLine, colors.slate]),
    opacity: 1 - dim.value * (1 - FADED_OPACITY),
    transform: [{ translateY: press.value * (EDGE - EDGE_PRESSED) }, { scale: jpop.value }],
  }));
  // the lip goes with the dark tile: a paper tile lies flat
  const edgeStyle = useAnimatedStyle(() => ({ opacity: 1 - tone.value }));
  const darkStyle = useAnimatedStyle(() => ({ opacity: 1 - tone.value }));
  const lightStyle = useAnimatedStyle(() => ({ opacity: tone.value }));
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value}%` }));
  const pctStyle = useAnimatedStyle(() => ({ opacity: pctOpacity.value, transform: [{ scale: pctScale.value }] }));
  const tickStyle = useAnimatedStyle(() => ({
    color: interpolateColor(tone.value, [0, 1], [colors.paper, colors.ink]),
    opacity: tickOpacity.value,
    transform: [{ scale: tickScale.value }],
  }));
  const names = data.people.map((p) => `${p.first} ${p.surname}`).join(' & ');

  return (
    <Pressable
      style={styles.col}
      accessibilityRole="button"
      accessibilityLabel={names}
      accessibilityState={{ selected: picked, disabled }}
      disabled={disabled}
      onPress={() => onPress(side)}
      onPressIn={() => {
        press.value = withTiming(1, { duration: PRESS_MS, easing: springEase });
      }}
      onPressOut={() => {
        press.value = withTiming(0, { duration: PRESS_MS, easing: springEase });
      }}
    >
      <View style={[styles.tile, flat && styles.tileFlat]}>
        {flat ? null : <Animated.View style={[styles.edge, edgeStyle]} pointerEvents="none" />}
        <Animated.View style={[styles.face, faceStyle]}>
          <Animated.View style={[styles.fill, fillStyle]} pointerEvents="none" />
          <Animated.View style={[styles.layer, darkStyle]}>
            <TileText data={data} doubles={doubles} dark pop />
          </Animated.View>
          {inked ? (
            <Animated.View style={[styles.layer, styles.layerOver, lightStyle]} pointerEvents="none">
              <TileText data={data} doubles={doubles} dark={false} pop={false} />
            </Animated.View>
          ) : null}
          {/* always mounted: Reanimated (web) does not animate a view that appears mid-flight */}
          <Animated.Text style={[styles.tick, tickStyle]} pointerEvents="none">
            ✓
          </Animated.Text>
          <Animated.Text style={[styles.pct, pctStyle]} pointerEvents="none">
            {pct === null ? '' : `${pct}%`}
          </Animated.Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

/** the names and facts of one side, in paper on the dark tile or in ink on the paper one */
function TileText({ data, doubles, dark, pop }: { data: CardSide; doubles: boolean; dark: boolean; pop: boolean }) {
  return (
    <>
      {data.people.map((p, i) => (
        <View key={i} style={[styles.person, i === 0 && styles.personFirst]}>
          <Avatar initials={p.initials} look={p.look ?? null} dark={dark} pop={pop} />
          <View style={styles.names}>
            <FitText text={p.surname} style={[styles.sn, doubles && styles.snDbl, dark ? styles.onInk : styles.onPaper]} />
            <Text numberOfLines={1} style={[styles.fn, dark ? styles.fnInk : styles.onPaper]}>
              {p.first}
            </Text>
          </View>
        </View>
      ))}
      {data.level || data.area ? (
        <View style={styles.facts}>
          {data.level ? (
            <View style={[styles.levelPill, dark && styles.levelPillInk]}>
              <Text style={[styles.levelText, dark && styles.factInk]}>{data.level}</Text>
            </View>
          ) : null}
          {data.area ? (
            <Text numberOfLines={1} style={[styles.area, dark && styles.factInk]}>
              {data.area}
            </Text>
          ) : null}
        </View>
      ) : data.sub ? (
        <Text style={[styles.sub, dark && styles.factInk]}>{data.sub}</Text>
      ) : null}
    </>
  );
}

/** the player's drawn avatar when they have an account (founder, 14 Oct); otherwise their initials */
function Avatar({ initials, look, dark, pop }: { initials: string; look: AvatarLook | null; dark: boolean; pop: boolean }) {
  const popIn = usePopIn(AVATAR_POP_MS, AVATAR_POP_DELAY);
  return (
    <Animated.View style={[styles.av, dark && styles.avInk, look && styles.avDrawn, pop && popIn]} pointerEvents="none">
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
  hideCategory,
}: {
  match: CardMatch;
  pick: Side;
  split: CardPct;
  /** true when the feed loaded it already voted: it enters like any card instead of folding */
  fresh: boolean;
  hideCategory: boolean;
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
      <Meta match={match} hideCategory={hideCategory} style={styles.doneMeta} />
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
      <Text style={[styles.rowTick, { color: fg }]}>{on ? '✓' : ''}</Text>
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
const TILE_RADIUS = 16;
const TILE_PAD = 10;

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
  // outlined: it is a fact about time, not an action
  soon: { marginLeft: 'auto', paddingVertical: 1, paddingHorizontal: 10, borderRadius: 999, borderWidth: 2, borderColor: colors.ink },
  soonText: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17, color: colors.ink },
  closed: { ...text.meta, fontFamily: fonts.bodyBold, color: colors.inkSoft, textAlign: 'center' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 4 },
  metaStack: { gap: 2 },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  place: { ...text.meta, flexShrink: 1 },
  // the category: bold ink, a step above the time line, no fill (founder, 19 Oct)
  category: { fontFamily: fonts.bodyBold, fontSize: type.body.size, lineHeight: type.meta.line, color: colors.ink },
  chip: { paddingVertical: 2, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.sand },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17, color: colors.inkSoft },
  grid: { flexDirection: 'row', gap: 10 },
  col: { flex: 1, minWidth: 0 },
  // the room under the face is the lip
  tile: { flex: 1, paddingBottom: EDGE },
  tileFlat: { paddingBottom: 0 },
  edge: { position: 'absolute', left: 0, right: 0, top: EDGE, bottom: 0, borderRadius: TILE_RADIUS, backgroundColor: colors.ink },
  face: { flex: 1, overflow: 'hidden', borderRadius: TILE_RADIUS, borderWidth: 2 },
  layer: { padding: TILE_PAD, gap: 8 },
  layerOver: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // room for the ✓ in the corner, on every tile so both sides lay out alike
  personFirst: { paddingRight: 14 },
  names: { flex: 1, minWidth: 0 },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.lime },
  tick: { position: 'absolute', top: 6, right: 10, fontFamily: fonts.bodyBold, fontSize: 18, lineHeight: 22 },
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
  sn: { fontFamily: fonts.displayHeavy, fontSize: 24, lineHeight: 24, paddingTop: 4, marginTop: -4, paddingBottom: 5, marginBottom: -5 },
  snDbl: { fontSize: 21, lineHeight: 21 },
  onInk: { color: colors.paper },
  onPaper: { color: colors.ink },
  // the first name belongs to the name: bold, right under the surname; a lighter paper on the dark tile
  fn: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 18 },
  fnInk: { color: colors.mist },
  facts: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  levelPill: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999, backgroundColor: colors.sand },
  levelPillInk: { backgroundColor: colors.inkRaised },
  levelText: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17, color: colors.ink },
  area: { flexShrink: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 17, color: colors.inkSoft },
  sub: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 19.5, color: colors.inkSoft },
  // quiet on ink: the names lead
  factInk: { color: colors.mist },
  av: {
    width: AV_SIZE,
    height: AV_SIZE,
    borderRadius: 999,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avInk: { backgroundColor: colors.inkRaised },
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
  rowTick: { fontFamily: fonts.bodyBold, fontSize: 15 },
  halfNames: { flexShrink: 1, minWidth: 0 },
  rowSn: { fontFamily: fonts.displayHeavy, fontSize: 20, lineHeight: 20, paddingBottom: 4, marginBottom: -4 },
  rowSnNext: { paddingTop: 4 },
  rowFn: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 18, color: colors.inkSoft },
  rowPct: { marginLeft: 'auto', fontFamily: fonts.bodySemi, fontSize: 15 },
  rowPctOn: { fontFamily: fonts.bodyBold },
});

