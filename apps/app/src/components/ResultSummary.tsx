import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useCopy } from '../i18n';
import { resultStrip, type CardResult } from '../lib/feed';
import { usePress, useStgIn } from '../lib/motion';
import { summaryLine } from '../lib/resultsSummary';
import { colors, ease, fonts, motion } from '../theme';

/** rows after this many come in together, so a long list does not keep rising for seconds */
const STAGGER_ROWS = 8;

/**
 * Many results at once (founder, 20 Oct): one line under the first result card, «Και 13 ακόμα: 11 σωστά, +155». A tap
 * opens them in place as compact rows (✓, the winner, the score, +points), staggered 70ms, the box following its height
 * on the reveal (700ms); a tap folds it again. «Τα είδα» (`onSeen`) marks them all seen and folds the box into the
 * strip it stays as; without `onSeen` it is that strip, opening the rows without the button. It never flies points to
 * the header: they are already counted there (#222).
 */
export function ResultSummary({ rows, onSeen }: { rows: CardResult[]; onSeen?: () => void }) {
  const t = useCopy();
  const press = usePress(0.97);
  const seenPress = usePress();
  const enter = useStgIn(motion.revealDurShort);
  const [open, setOpen] = useState(false);
  const line = summaryLine(rows, t);
  const allMissed = !rows.some((r) => r.ok);

  // the box follows the content's height; -1 until the first layout (no animation on mount)
  const height = useSharedValue(-1);
  const measured = useRef(false);
  const onContent = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (!measured.current) {
      measured.current = true;
      height.value = h;
    } else height.value = withTiming(h, { duration: motion.revealDur, easing: ease });
  };
  const boxStyle = useAnimatedStyle(() => (height.value < 0 ? {} : { height: height.value }));

  return (
    <Animated.View style={[styles.box, onSeen ? styles.boxLive : allMissed ? styles.boxMiss : styles.boxOk, enter, boxStyle]}>
      <View onLayout={onContent}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={[line.lead, line.points ?? ''].filter(Boolean).join(', ')}
          onPress={() => setOpen((o) => !o)}
          onPressIn={press.onPressIn}
          onPressOut={press.onPressOut}
        >
          <Animated.View style={[styles.head, press.style]}>
            <Text style={styles.lead} numberOfLines={1}>
              {line.lead}
              {line.points ? <Text style={styles.points}>{`, ${line.points}`}</Text> : null}
            </Text>
            <Text style={styles.glyph}>{open ? '↑' : '↓'}</Text>
          </Animated.View>
        </Pressable>
        {open ? (
          <View style={styles.rows}>
            {rows.map((r, i) => (
              <SummaryRow key={r.id} card={r} index={i} />
            ))}
            {onSeen ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setOpen(false);
                  onSeen();
                }}
                onPressIn={seenPress.onPressIn}
                onPressOut={seenPress.onPressOut}
                style={styles.seenHit}
              >
                <Animated.Text style={[styles.seen, seenPress.style]}>{t.result.summary.seen}</Animated.Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

/** one result as a quiet row: ✓ (lime, earned) or nothing, the winner, the score, «+15» */
function SummaryRow({ card, index }: { card: CardResult; index: number }) {
  const t = useCopy();
  const rise = useStgIn(motion.revealDurShort, Math.min(index, STAGGER_ROWS) * motion.stagger);
  const s = resultStrip(card, t);
  return (
    <Animated.View style={[styles.row, rise]} accessible accessibilityLabel={[s.tick ? '✓' : '', s.name, card.sets, card.ok && card.points > 0 ? `+${card.points}` : ''].filter(Boolean).join(' · ')}>
      <Text style={styles.tick}>{s.tick ? '✓' : ''}</Text>
      <View style={styles.rowNames}>
        <Text style={[styles.name, !card.ok && styles.nameMiss]} numberOfLines={1}>
          {s.name}
        </Text>
        {card.sets ? <Text style={styles.sets}>{card.sets}</Text> : null}
      </View>
      {card.ok && card.points > 0 ? <Text style={styles.rowPoints}>{`+${card.points}`}</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 16, overflow: 'hidden' },
  // under a live card it reads as part of the batch; once seen it is a strip like the others
  boxLive: { backgroundColor: colors.inkRaised },
  boxOk: { backgroundColor: colors.ink },
  boxMiss: { backgroundColor: colors.inkRaised },
  head: { minHeight: 48, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  lead: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.paper },
  points: { color: colors.lime },
  glyph: { marginLeft: 'auto', fontFamily: fonts.bodyBold, fontSize: 15, color: colors.mist },
  rows: { paddingHorizontal: 16, paddingBottom: 6, gap: 2 },
  row: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 10 },
  tick: { minWidth: 16, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.lime },
  rowNames: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  name: { flexShrink: 1, fontFamily: fonts.displayHeavy, fontSize: 18, lineHeight: 22, color: colors.paper },
  nameMiss: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 19 },
  sets: { flexShrink: 0, fontFamily: fonts.bodyBold, fontSize: 13, color: colors.mist },
  rowPoints: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.lime },
  seenHit: { minHeight: 44, alignSelf: 'flex-end', justifyContent: 'center', paddingHorizontal: 2 },
  seen: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.paper },
});
