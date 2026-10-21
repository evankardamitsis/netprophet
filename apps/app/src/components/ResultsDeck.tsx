import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import Animated, { cubicBezier, useReducedMotion, type CSSTransitionProperties } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useCopy } from '../i18n';
import type { CardResult } from '../lib/feed';
import { useHudActions } from '../lib/hud';
import { usePress, useStgIn } from '../lib/motion';
import { deckFull, restAfter, restLine, showSkip, takeAll } from '../lib/resultsSummary';
import { bezier, colors, fonts, motion } from '../theme';
import { ResultCard } from './ResultCard';

/**
 * The day's results on Σήμερα (founder, 21 Oct: "as it was before"): one block at the top that plays them one by one.
 * One card at a time; «Επόμενο ›» sends it off (it slides away and fades) and the next one pops in. Nothing is left
 * behind: when the last card goes, the whole block folds away and is removed.
 * With 2 or more waiting behind the card, a row at the bottom of the block says what they hold, «Και 13 ακόμα: 11 ✓ ·
 * 2 χαμένα», with one action, «Πάρε τους πόντους»: their points fly to the header from the row, `onTake` says it in a
 * toast, and the block leaves the same way. Exits are Reanimated CSS transitions on plain style values (20 Oct: no
 * shared-value sequence that could freeze part-way).
 */
const EXIT_MS = motion.exitDur;
const EASE_CSS = cubicBezier(...bezier);
/** the gap between the block and what follows it (Σήμερα's feed gap), folded away with the block */
const FEED_GAP = 14;

/** one card leaving, or the whole block (the last card, or «Πάρε τους πόντους») */
type Leaving = { card: CardResult; all: boolean; taken: boolean };

interface Props {
  /** unseen results, oldest first */
  results: readonly CardResult[];
  /** the first card of a visit waits this long (prototype rqStart) */
  firstDelay: number;
  /** a card played and left: mark it seen */
  onDone: (card: CardResult) => void;
  /** «Πάρε τους πόντους» tapped: the toast, at once */
  onTake: (taken: { points: number; streak: number }) => void;
  /** the block left after «Πάρε τους πόντους»: mark the card and every result behind it seen (one call) */
  onTaken: (card: CardResult, rest: CardResult[]) => void;
}

export function ResultsDeck({ results, firstDelay, onDone, onTake, onTaken }: Props) {
  const t = useCopy();
  const hud = useHudActions();
  const reduced = useReducedMotion();
  const [leaving, setLeaving] = useState<Leaving | null>(null);
  /** the rest as it was when «Πάρε τους πόντους» was tapped */
  const takenRest = useRef<CardResult[]>([]);
  const played = useRef(0);
  /** a card was opened full in this run of the deck: the next ones enter full (reset when the deck ends) */
  const openRun = useRef(false);
  const applied = useRef(new Set<string>());
  const height = useRef(0);
  // the block folds in two frames: its height is pinned first, so the transition to 0 has a number to start from
  const [fold, setFold] = useState<'none' | 'pin' | 'go'>('none');
  const row = useRef<View>(null);

  const card = leaving?.card ?? results[0];
  const rest = leaving?.taken ? takenRest.current : restAfter(results).filter((r) => r.id !== card?.id);

  const exitMs = reduced ? 0 : EXIT_MS;
  const finish = useRef<() => void>(() => undefined);
  useEffect(() => {
    if (!leaving) return undefined;
    if (leaving.all) {
      setFold('pin');
    }
    const id = setTimeout(() => finish.current(), exitMs);
    return () => clearTimeout(id);
  }, [leaving, exitMs]);
  useEffect(() => {
    if (fold !== 'pin') return undefined;
    const id = requestAnimationFrame(() => setFold('go'));
    return () => cancelAnimationFrame(id);
  }, [fold]);

  const onNext = useCallback(
    (c: CardResult) => {
      if (leaving) return;
      const last = results.filter((r) => r.id !== c.id).length === 0;
      finish.current = () => {
        played.current += 1;
        setLeaving(null);
        setFold('none');
        onDone(c);
      };
      setLeaving({ card: c, all: last, taken: false });
    },
    [leaving, results, onDone],
  );

  const onTakeAll = () => {
    if (!card || leaving) return;
    const behind = restAfter(results).filter((r) => r.id !== card.id);
    const taken = takeAll(card, behind, applied.current.has(card.id));
    takenRest.current = behind;
    if (taken.points > 0) void hud.fly(row, taken.points, taken.allRight);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    onTake(taken);
    finish.current = () => {
      played.current += 1;
      setLeaving(null);
      setFold('none');
      onTaken(card, behind);
    };
    setLeaving({ card, all: true, taken: true });
  };

  // a fresh block (new results after the last one left) waits like the first card of a visit
  useEffect(() => {
    if (results.length === 0 && !leaving) {
      played.current = 0;
      openRun.current = false;
    }
  }, [results.length, leaving]);

  if (!card) return null;
  const goingAll = leaving?.all === true;
  const goingCard = leaving !== null && !goingAll;
  const blockStyle: CSSTransitionProperties & Pick<ViewStyle, 'opacity' | 'transform' | 'height' | 'marginBottom'> = {
    opacity: goingAll ? 0 : 1,
    transform: [{ translateY: goingAll ? -16 : 0 }, { scale: goingAll ? 0.96 : 1 }],
    ...(fold === 'none' ? {} : { height: fold === 'go' ? 0 : height.current, marginBottom: fold === 'go' ? -FEED_GAP : 0 }),
    transitionProperty: ['opacity', 'transform', 'height', 'marginBottom'],
    transitionDuration: exitMs,
    transitionTimingFunction: EASE_CSS,
  };
  const cardStyle: CSSTransitionProperties & Pick<ViewStyle, 'opacity' | 'transform'> = {
    opacity: goingCard ? 0 : 1,
    transform: [{ translateX: goingCard ? -40 : 0 }, { scale: goingCard ? 0.94 : 1 }],
    transitionProperty: ['opacity', 'transform'],
    transitionDuration: exitMs,
    transitionTimingFunction: EASE_CSS,
  };
  const skip = showSkip(rest);

  return (
    <Animated.View
      style={[styles.block, blockStyle]}
      onLayout={(e: LayoutChangeEvent) => {
        if (fold === 'none') height.current = e.nativeEvent.layout.height;
      }}
    >
      {/* a new key for every card: it mounts and plays its own entrance */}
      <Animated.View key={card.id} style={cardStyle}>
        <ResultCard
          card={card}
          more={rest.length > 0}
          delay={played.current === 0 ? firstDelay : 0}
          onDone={onNext}
          onApplied={(c) => applied.current.add(c.id)}
          stop={leaving?.taken === true}
          startFull={deckFull(openRun.current, false)}
          onOpened={() => {
            openRun.current = deckFull(openRun.current, true);
          }}
        />
      </Animated.View>
      {skip ? <TakeRow ref={row} line={restLine(rest, t)} action={t.result.summary.take} onPress={onTakeAll} disabled={leaving !== null} /> : null}
    </Animated.View>
  );
}

/** «Και 13 ακόμα: 11 ✓ · 2 χαμένα» and «Πάρε τους πόντους», the block's last line */
function TakeRow({
  ref,
  line,
  action,
  onPress,
  disabled,
}: {
  ref: RefObject<View | null>;
  line: string;
  action: string;
  onPress: () => void;
  disabled: boolean;
}) {
  const press = usePress();
  const enter = useStgIn(motion.revealDurShort, motion.stagger * 2);
  return (
    <Animated.View ref={ref} collapsable={false} style={[styles.row, enter]}>
      <Text style={styles.line} numberOfLines={2}>
        {line}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${action}. ${line}`}
        disabled={disabled}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={styles.actionHit}
      >
        <Animated.View style={[styles.action, press.style]}>
          <Text style={styles.actionText}>{action}</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 10, overflow: 'hidden' },
  // on paper, under the card: quiet text, one ink pill (blue stays the vote's)
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 6 },
  line: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 20, color: colors.ink },
  actionHit: { minHeight: 44, justifyContent: 'center' },
  action: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, backgroundColor: colors.ink },
  actionText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.paper },
});
