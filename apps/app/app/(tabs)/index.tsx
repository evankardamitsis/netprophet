import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { AddMatchButton } from '../../src/components/AddMatchButton';
import { VoteCard } from '../../src/components/VoteCard';
import { useCopy } from '../../src/i18n';
import { useFeed, type VoteErrorKind } from '../../src/lib/data';
import { alpha, colors, fonts, motion, radii, spacing } from '../../src/theme';

const NOTICE_MS = 2600;

export default function VoteScreen() {
  const t = useCopy();
  const [notice, setNotice] = useState<VoteErrorKind | null>(null);
  const onVoteError = useCallback((kind: VoteErrorKind) => setNotice(kind), []);
  const { cards, loading, error, refresh, vote } = useFeed(onVoteError);

  useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(id);
  }, [notice]);

  const empty = !loading && cards.length === 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.feed}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.ink} />}
      >
        {cards.map((m, i) => (
          <VoteCard key={m.id} match={m} index={i} onVote={vote} />
        ))}
        {empty ? <Text style={styles.empty}>{error ? t.feed.error : t.feed.empty}</Text> : null}
      </ScrollView>
      {notice ? (
        <Animated.View
          entering={FadeIn.duration(motion.revealDur / 3)}
          exiting={FadeOut.duration(motion.revealDur / 3)}
          style={styles.notice}
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.noticeText}>{t.feed[notice]}</Text>
        </Animated.View>
      ) : null}
      <AddMatchButton />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  feed: { padding: spacing[4], gap: spacing[3], paddingBottom: 96 },
  empty: { color: colors.muted, fontFamily: fonts.body, fontSize: 16, textAlign: 'center', marginTop: spacing[6] },
  notice: {
    position: 'absolute',
    top: spacing[3],
    left: spacing[4],
    right: spacing[4],
    backgroundColor: colors.ink,
    borderRadius: radii.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    shadowColor: colors.ink,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  noticeText: { color: alpha(colors.paper, 0.95), fontFamily: fonts.bodySemi, fontSize: 14, textAlign: 'center' },
});
