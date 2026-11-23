import { useCallback, useState } from 'react';
import { RefreshControl, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BallerNote } from '../../src/components/BallerNote';
import { QuietLink, Reveal, VoteGroupHeading } from '../../src/components/HomeCards';
import { SafetySheet } from '../../src/components/SafetySheet';
import { TOAST_MS, Toast } from '../../src/components/Toast';
import { VoteRow } from '../../src/components/VoteRow';
import { useCopy } from '../../src/i18n';
import { useFeed, useTournaments, type SafetyTarget } from '../../src/lib/data';
import { tournamentRanks, voteList } from '../../src/lib/home';
import { currentMe } from '../../src/lib/meStore';
import { useNotes, useVotePath } from '../../src/lib/useVotePath';
import { fmt } from '../../src/lib/votes';
import { pollIds, useSplitPoller } from '../../src/lib/liveSplits';
import { colors, fonts, text } from '../../src/theme';

/**
 * «Όλα τα ματς σήμερα» (founder, 25 Oct): «Περισσότερα ›» on the home opens this page, so the home keeps its length. The
 * same grouped list as the home's votes, all of it, with the same rows and the same vote path (useVotePath); when
 * nothing is left to vote today it is «Τα επόμενα ματς αύριο», as on the home. It lives inside the tabs, so the header and
 * the tab bar stay and Τουρνουά stays lit (TabBar LIT_BY). `?day=today` (the end card's «Δες τις ψήφους σου ›») keeps
 * today's list with your votes; `?day=tomorrow` («Αύριο ›») opens tomorrow's. It ends with «Όλα τα τουρνουά ›», so it
 * never dead-ends (home guidance board 3A).
 */
export default function AllMatchesScreen() {
  const t = useCopy();
  const { note, pushNote, toast, onVoteError } = useNotes();
  const { cards, loading, error, refresh, vote } = useFeed(onVoteError);
  const tournaments = useTournaments();
  const onVote = useVotePath({ vote, pushNote, toast });
  const [safety, setSafety] = useState<SafetyTarget | null>(null);
  const onCardLongPress = useCallback((id: string) => setSafety({ kind: 'match', id }), []);
  const back = () => (router.canGoBack() ? router.back() : router.navigate('/'));
  const params = useLocalSearchParams<{ day?: string }>();
  const day = params.day === 'today' || params.day === 'tomorrow' ? params.day : undefined;

  const votes = voteList(cards, tournamentRanks(tournaments.data?.items ?? [], currentMe()?.profile.area_ids ?? []), day);
  const none = votes.mode === 'none' && !loading;
  useSplitPoller(pollIds(votes.groups.flatMap((g) => g.rows.filter((r) => !r.closed).map((r) => r.id))));

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading && cards.length > 0} onRefresh={refresh} tintColor={colors.ink} />}
      >
        <Pressable accessibilityRole="button" onPress={back} style={styles.backHit}>
          <Text style={styles.back}>{t.home.all.back}</Text>
        </Pressable>
        <Reveal i={0}>
          <Text accessibilityRole="header" style={styles.title}>
            {votes.mode === 'tomorrow' ? t.home.vote.tomorrow : t.home.all.title}
          </Text>
        </Reveal>
        {votes.groups.map((g) => (
          <View key={g.key} style={styles.group}>
            <VoteGroupHeading
              title={g.title ?? t.home.vote.friendlies}
              count={fmt(g.count === 1 ? t.home.vote.count.one : t.home.vote.count.many, { n: g.count })}
              onPress={g.tournamentId ? () => router.push(`/tournament/${g.tournamentId}`) : undefined}
            />
            {g.rows.map((m, i) => (
              <VoteRow key={m.id} match={m} where={m.category ?? ''} onVote={onVote} onLongPress={onCardLongPress} index={i} />
            ))}
          </View>
        ))}
        {none ? error ? <Text style={styles.end}>{t.feed.error}</Text> : <BallerNote line={t.home.vote.empty} /> : null}
        {loading && cards.length === 0 ? null : <QuietLink label={t.home.tournaments.all} onPress={() => router.push('/tournaments')} />}
      </ScrollView>
      {note?.item.kind === 'toast' ? <Toast key={note.n} text={note.item.text} ms={TOAST_MS} /> : null}
      <SafetySheet
        target={safety}
        onClose={(msg) => {
          setSafety(null);
          if (msg) toast(msg);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  scroll: { paddingTop: 4, paddingHorizontal: 16, paddingBottom: 32, gap: 14 },
  backHit: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' },
  back: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  title: { ...text.title },
  group: { gap: 8 },
  end: { ...text.meta, paddingHorizontal: 4 },
});
