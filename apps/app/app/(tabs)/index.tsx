import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AddMatchButton } from '../../src/components/AddMatchButton';
import { Celebration } from '../../src/components/Celebration';
import { QUEST_BAR_MS } from '../../src/components/QuestBar';
import { ConfirmCard } from '../../src/components/ConfirmCard';
import { DailyFold } from '../../src/components/DailyFold';
import { PostponedCard } from '../../src/components/PostponedCard';
import { QuizStrip } from '../../src/components/QuizStrip';
import { ResultCard } from '../../src/components/ResultCard';
import { SponsoredCard } from '../../src/components/SponsoredCard';
import { TOAST_MS, Toast } from '../../src/components/Toast';
import { SafetySheet } from '../../src/components/SafetySheet';
import { VoteCard } from '../../src/components/VoteCard';
import { useCopy } from '../../src/i18n';
import { useBadges, useConfirmations, useFeed, useQuests, useQuiz, useTournaments, type VoteErrorKind, type SafetyTarget } from '../../src/lib/data';
import type { CardResult } from '../../src/lib/feed';
import type { Celebration as CelebrationItem } from '@netprophet/db';
import { isUnlock, nextGroup } from '../../src/lib/celebrate';
import { hasMoment, gateQuests } from '../../src/lib/unlockLadder';
import { useUnlocks } from '../../src/lib/unlocks';
import { openCount } from '../../src/lib/tournaments';
import { dailyFold } from '../../src/lib/dailyFold';
import { fmt } from '../../src/lib/votes';
import { feedbackAfterVote, type QuestFeedback } from '../../src/lib/quests';
import type { Side } from '../../src/lib/votes';
import { useHud } from '../../src/lib/hud';
import { colors, ease, fonts } from '../../src/theme';

const TITLE_IN_MS = 400;
/** the tournaments link sits after this many cards */
const TOURNAMENTS_AFTER = 5;
/** prototype rqStart / rqNext: the first result waits 450ms, the next one comes 140ms after the last closes */
const FIRST_RESULT_DELAY = 450;
const NEXT_RESULT_GAP = 140;

export default function VoteScreen() {
  const t = useCopy();
  const [notice, setNotice] = useState<{ kind: VoteErrorKind; n: number } | null>(null);
  const onVoteError = useCallback((kind: VoteErrorKind) => setNotice((p) => ({ kind, n: (p?.n ?? 0) + 1 })), []);
  const { cards, results, dismissResult, celebrations, dismissCelebration, loading, error, refresh, vote } = useFeed(onVoteError);
  const confirmations = useConfirmations();
  const unlocks = useUnlocks();
  const unlocksNow = useRef(unlocks);
  unlocksNow.current = unlocks;
  const quests = useQuests();
  const quiz = useQuiz();
  const tournaments = useTournaments();
  const tourCount = openCount(tournaments.data?.items);
  // «Οι 6 της ημέρας»: read again whenever the feed comes back into view (after playing, or a new day)
  const quizRefresh = quiz.refresh;
  useFocusEffect(
    useCallback(() => {
      void quizRefresh();
    }, [quizRefresh]),
  );
  const questsNow = useRef(quests.quests);
  questsNow.current = quests.quests;
  const badges = useBadges();
  const badgesNow = useRef(badges.badges);
  badgesNow.current = badges.badges;
  // after a vote: a toast for a quest that finished, else the slim bar for a quest that moved, else for a badge one
  // vote short of its next tier (never more than one)
  const [questNote, setQuestNote] = useState<(NonNullable<QuestFeedback> & { n: number }) | null>(null);
  const onVote = useCallback(
    async (matchId: string, side: Side) => {
      const before = questsNow.current;
      const badgesBefore = badgesNow.current;
      const pct = await vote(matchId, side);
      void Promise.all([quests.refresh(), badges.refresh()]).then(([after, badgesAfter]) => {
        // quests and badges that are not open yet say nothing
        const { has } = unlocksNow.current;
        const f = after
          ? feedbackAfterVote(before && gateQuests(before, has), gateQuests(after, has), t, has('badges_shelf') ? { before: badgesBefore, after: badgesAfter } : undefined)
          : null;
        if (f) setQuestNote({ ...f, n: Date.now() });
      });
      void unlocksNow.current.refresh();
      return pct;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vote, quests.refresh, badges.refresh, t],
  );
  useEffect(() => {
    if (!questNote) return undefined;
    const id = setTimeout(() => setQuestNote(null), questNote.kind === 'toast' ? TOAST_MS : QUEST_BAR_MS);
    return () => clearTimeout(id);
  }, [questNote]);
  const [answered, setAnswered] = useState<string | null>(null);
  // «Αναφορά» from a long press on a card
  const [safety, setSafety] = useState<SafetyTarget | null>(null);
  const [said, setSaid] = useState<{ text: string; n: number } | null>(null);
  useEffect(() => {
    if (!answered) return undefined;
    const id = setTimeout(() => setAnswered(null), TOAST_MS);
    return () => clearTimeout(id);
  }, [answered]);
  const hud = useHud();
  // the bar slides over the tab bar, so the tabs layout draws it (prototype mp)
  const { showQuestBar } = hud;
  useEffect(() => {
    showQuestBar(questNote?.kind === 'bar' ? { title: questNote.title, from: questNote.from, to: questNote.to, progress: questNote.progress, target: questNote.target } : null);
  }, [questNote, showQuestBar]);
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
  // celebrations wait until every result card has played
  // σερί ones first, one by one; every queued quest together as one
  const group = results.length === 0 && !between ? nextGroup(celebrations) : [];
  const celebrating = group.length > 0 ? group : undefined;
  // a step that opens quietly has no moment: mark it seen without showing anything
  const quiet = celebrations.filter((c) => isUnlock(c) && !hasMoment(c.payload.key)).map((c) => c.id).join();
  useEffect(() => {
    if (quiet) {
      dismissCelebration(quiet.split(','));
    }
  }, [quiet, dismissCelebration]);
  // after a moment, read the ladder again so what it opened shows
  const onCelebrated = (list: CelebrationItem[]) => {
    dismissCelebration(list.map((c) => c.id));
    if (list.some(isUnlock)) void unlocks.refresh({ afterMoment: true });
  };

  useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(() => setNotice(null), TOAST_MS);
    return () => clearTimeout(id);
  }, [notice]);

  const empty = !loading && cards.length === 0;
  const daily = dailyFold(unlocks.has('daily_quiz') ? quiz.quiz : null, confirmations.items.length, t);
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
          {/* «Για σένα»: the game of the day and the matches to confirm, folded (founder, 13 Oct) */}
          <DailyFold fold={daily}>
            {unlocks.has('daily_quiz') && quiz.quiz && quiz.quiz.cards.length > 0 ? <QuizStrip quiz={quiz.quiz} onPress={() => router.push('/quiz')} /> : null}
            {confirmations.items.slice(0, 1).map((item) => (
              <ConfirmCard
                key={item.match_id}
                item={item}
                onAnswer={(a) =>
                  void confirmations.answer(item.match_id, a).then((o) => setAnswered(o === 'failed' ? t.confirm.failed : t.confirm.done[o]))
                }
              />
            ))}
          </DailyFold>
          {current ? (
            <ResultCard
              key={current.id}
              card={current}
              more={results.length > 1}
              delay={played === 0 ? FIRST_RESULT_DELAY : 0}
              onDone={onResultDone}
            />
          ) : null}
          {cards.map((c, i) => (
            <Fragment key={c.id}>
              {c.kind === 'match' ? (
                <VoteCard match={c} onVote={onVote} onLongPress={(id) => setSafety({ kind: 'match', id })} />
              ) : c.kind === 'postponed' ? (
                <PostponedCard card={c} />
              ) : c.kind === 'sponsored' ? (
                <SponsoredCard card={c} />
              ) : null}
              {/* prototype: «Τα τουρνουά σου · 3 ›» after the fifth card (at the end when there are fewer) */}
              {tourCount > 0 && i === Math.min(cards.length, TOURNAMENTS_AFTER) - 1 ? (
                <Pressable accessibilityRole="button" onPress={() => router.push('/tournaments?from=feed')} style={styles.tourLink}>
                  <Text style={styles.tourLinkText}>{fmt(t.tournaments.feedLink, { count: tourCount })}</Text>
                </Pressable>
              ) : null}
            </Fragment>
          ))}
          {loading && cards.length === 0 ? null : (
            <Text style={styles.end}>{empty ? (error ? t.feed.error : t.feed.empty) : t.feed.end}</Text>
          )}
        </View>
      </ScrollView>
      {notice ? <Toast key={notice.n} text={t.feed[notice.kind]} /> : null}
      {answered ? <Toast key={answered} text={answered} /> : null}
      {questNote?.kind === 'toast' ? <Toast key={questNote.n} text={questNote.text} /> : null}
      {said ? <Toast key={said.n} text={said.text} /> : null}
      <SafetySheet target={safety} onClose={(text) => { setSafety(null); if (text) setSaid({ text, n: Date.now() }); }} />
      <AddMatchButton />
      {celebrating ? <Celebration key={celebrating.map((c) => c.id).join()} items={celebrating} onDone={() => onCelebrated(celebrating)} /> : null}
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


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  // prototype: padding 18px 20px, 84px at the bottom while «+ Ματς» shows
  scroll: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 84 },
  feed: { gap: 14 },
  head: { gap: 6 },
  title: { fontFamily: fonts.displayHeavy, fontSize: 60, lineHeight: 60, paddingBottom: 12, marginBottom: -15, color: colors.ink },
  subtitle: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20.25, color: colors.inkSoft },
  tourLink: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 2 },
  tourLinkText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.blue },
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
});
