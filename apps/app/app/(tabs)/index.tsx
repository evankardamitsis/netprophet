import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { AddMatchButton } from '../../src/components/AddMatchButton';
import { ResultCard } from '../../src/components/ResultCard';
import { SponsoredCard } from '../../src/components/SponsoredCard';
import { VoteCard } from '../../src/components/VoteCard';
import { useCopy } from '../../src/i18n';
import { useFeed, type VoteErrorKind } from '../../src/lib/data';
import type { CardResult } from '../../src/lib/feed';
import { useHud } from '../../src/lib/hud';
import { colors, ease, fonts } from '../../src/theme';

/** Prototype toast: 2.2s, in over the first 12%, out after 85%. */
const TOAST_MS = 2200;
const TITLE_IN_MS = 400;
/** prototype rqStart / rqNext: the first result waits 450ms, the next one comes 140ms after the last closes */
const FIRST_RESULT_DELAY = 450;
const NEXT_RESULT_GAP = 140;

export default function VoteScreen() {
  const t = useCopy();
  const [notice, setNotice] = useState<{ kind: VoteErrorKind; n: number } | null>(null);
  const onVoteError = useCallback((kind: VoteErrorKind) => setNotice((p) => ({ kind, n: (p?.n ?? 0) + 1 })), []);
  const { cards, results, dismissResult, loading, error, refresh, vote } = useFeed(onVoteError);
  const hud = useHud();
  const [between, setBetween] = useState(false);
  const [played, setPlayed] = useState(0);

  useEffect(() => {
    hud.setPending(results);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  const onResultDone = useCallback(
    (card: CardResult) => {
      setBetween(true);
      setPlayed((n) => n + 1);
      dismissResult(card.id);
      setTimeout(() => setBetween(false), NEXT_RESULT_GAP);
    },
    [dismissResult],
  );
  const current = !between ? results[0] : undefined;

  useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(() => setNotice(null), TOAST_MS);
    return () => clearTimeout(id);
  }, [notice]);

  const empty = !loading && cards.length === 0;
  const titleIn = useInA();

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading && cards.length > 0} onRefresh={refresh} tintColor={colors.ink} />}
      >
        <View style={styles.feed}>
          <Animated.View style={[styles.head, titleIn]}>
            <Text style={styles.title}>{t.feed.title}</Text>
            <Text style={styles.subtitle}>{t.feed.subtitle}</Text>
          </Animated.View>
          {current ? (
            <ResultCard
              key={current.id}
              card={current}
              more={results.length > 1}
              delay={played === 0 ? FIRST_RESULT_DELAY : 0}
              onDone={onResultDone}
            />
          ) : null}
          {cards.map((c) =>
            c.kind === 'match' ? (
              <VoteCard key={c.id} match={c} onVote={vote} />
            ) : c.kind === 'sponsored' ? (
              <SponsoredCard key={c.id} card={c} />
            ) : null,
          )}
          {loading && cards.length === 0 ? null : (
            <Text style={styles.end}>{empty ? (error ? t.feed.error : t.feed.empty) : t.feed.end}</Text>
          )}
        </View>
      </ScrollView>
      {notice ? <Toast key={notice.n} text={t.feed[notice.kind]} /> : null}
      <AddMatchButton />
    </View>
  );
}

/** inA: fade in from 12px below on the prototype ease. */
function useInA() {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: TITLE_IN_MS, easing: ease });
  }, [p]);
  return useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 12 }] }));
}

function Toast({ text }: { text: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withSequence(
      withTiming(1, { duration: TOAST_MS * 0.12, easing: ease }),
      withTiming(1, { duration: TOAST_MS * 0.73 }),
      withTiming(0, { duration: TOAST_MS * 0.15, easing: ease }),
    );
  }, [p]);
  const style = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: (1 - p.value) * -14 }, { scale: 0.9 + p.value * 0.1 }],
  }));
  return (
    <View style={styles.toastWrap} pointerEvents="none">
      <Animated.View style={[styles.toast, style]} accessibilityLiveRegion="polite">
        <Text style={styles.toastText}>{text}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  // prototype: padding 18px 20px, 84px at the bottom while «+ Ματς» shows
  scroll: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 84 },
  feed: { gap: 14 },
  head: { gap: 6 },
  title: { fontFamily: fonts.displayHeavy, fontSize: 60, lineHeight: 57, color: colors.ink },
  subtitle: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20.25, color: colors.inkSoft },
  end: {
    paddingTop: 4,
    paddingHorizontal: 12,
    paddingBottom: 2,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 21,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  toastWrap: { position: 'absolute', top: 10, left: 0, right: 0, alignItems: 'center' },
  toast: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: colors.ink,
    shadowColor: colors.ink,
    shadowOpacity: 0.3,
    shadowRadius: 11,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  toastText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.lime },
});
