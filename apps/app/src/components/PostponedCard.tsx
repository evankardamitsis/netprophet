import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';
import type { CardPostponed, CardSide } from '../lib/feed';
import { FitText } from './FitText';
import { cardSurface, colors, ease, fonts } from '../theme';

/**
 * A match that was put off: the match card's frame, muted. No vote buttons, no lime (nothing happened yet).
 * Chip «Αναβλήθηκε», «{τουρνουά} · ήταν {Τρι 13/10 18:30}», the two sides, and what the player will see next.
 */
const ENTER_MS = 400;

export const PostponedCard = memo(function PostponedCard({ card }: { card: CardPostponed }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: ENTER_MS, easing: ease });
  }, [p]);
  const enter = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 10 }] }));
  return (
    <Animated.View style={[styles.card, enter]}>
      <View style={styles.head}>
        <View style={styles.chip}>
          <Text style={styles.chipText}>{card.chip}</Text>
        </View>
        {card.meta ? (
          <Text numberOfLines={2} style={styles.meta}>
            {card.meta}
          </Text>
        ) : null}
      </View>
      <View style={styles.row}>
        <Half data={card.a} />
        <Half data={card.b} />
      </View>
      <Text style={styles.note}>{card.note}</Text>
    </Animated.View>
  );
});

function Half({ data }: { data: CardSide }) {
  return (
    <View style={styles.half}>
      {data.people.map((p, i) => (
        <View key={i}>
          <FitText text={p.surname} style={[styles.sn, i > 0 && styles.snNext]} />
          <Text numberOfLines={1} style={styles.fn}>
            {p.first}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: cardSurface,
    borderWidth: 1,
    borderColor: colors.mist,
    gap: 8,
  },
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  chip: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.sand },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17, color: colors.inkSoft },
  meta: { flexShrink: 1, fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 19.5, color: colors.inkSoft },
  row: { minHeight: 56, borderRadius: 12, backgroundColor: colors.paper, flexDirection: 'row', gap: 12, paddingVertical: 8, paddingHorizontal: 12 },
  half: { flex: 1, minWidth: 0, justifyContent: 'center' },
  sn: { fontFamily: fonts.displayHeavy, fontSize: 20, lineHeight: 20, paddingBottom: 4, marginBottom: -4, color: colors.inkSoft },
  snNext: { paddingTop: 4 },
  fn: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 18, color: colors.inkSoft },
  note: { paddingHorizontal: 4, paddingBottom: 2, fontFamily: fonts.body, fontSize: 15, lineHeight: 20, color: colors.inkSoft },
});
