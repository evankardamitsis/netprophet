import { dayKey } from '@netprophet/core';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { BallerNote } from '../../src/components/BallerNote';
import { Celebration } from '../../src/components/Celebration';
import { QUEST_BAR_MS } from '../../src/components/QuestBar';
import { ConfirmCard } from '../../src/components/ConfirmCard';
import { DailyFold, ForYouSheet } from '../../src/components/DailyFold';
import { useForYouDaily } from '../../src/lib/forYouDaily';
import { PostponedCard } from '../../src/components/PostponedCard';
import { QuizStrip } from '../../src/components/QuizStrip';
import { ResultCard } from '../../src/components/ResultCard';
import { SponsoredCard } from '../../src/components/SponsoredCard';
import { TOAST_MS, Toast } from '../../src/components/Toast';
import { SafetySheet } from '../../src/components/SafetySheet';
import { VoteCard } from '../../src/components/VoteCard';
import { useCopy } from '../../src/i18n';
import { useBaller, useBadges, useConfirmations, useFeed, useQuests, useMyMatch, usePro, useQuiz, type VoteErrorKind, type SafetyTarget } from '../../src/lib/data';
import { feedDay, groupHeads, laterOpenByDefault, splitToday, type CardMatch, type CardResult } from '../../src/lib/feed';
import { MyMatchCard } from '../../src/components/MyMatchCard';
import { ProNudge } from '../../src/components/ProNudge';
import type { Celebration as CelebrationItem } from '@netprophet/db';
import { isUnlock, nextGroup } from '../../src/lib/celebrate';
import { hasMoment, gateQuests } from '../../src/lib/unlockLadder';
import { useUnlocks } from '../../src/lib/unlocks';
import { dailyFold } from '../../src/lib/dailyFold';
import { feedbackAfterVote, type QuestFeedback } from '../../src/lib/quests';
import { fmt, type Side } from '../../src/lib/votes';
import { useHud } from '../../src/lib/hud';
import { colors, ease, fonts, text } from '../../src/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BALLER_OFFERED_KEY, shouldOfferBaller } from '../../src/lib/ballerOffer';

const TITLE_IN_MS = 400;
/** the tournaments link sits after this many cards */
/** prototype rqStart / rqNext: the first result waits 450ms, the next one comes 140ms after the last closes */
const FIRST_RESULT_DELAY = 450;
const NEXT_RESULT_GAP = 140;
/** «Για σένα» rises full screen this long after Σήμερα settles, once a day (founder, 14 Oct) */
const FOR_YOU_RISE_MS = 1500;
/** a player who was here before Baller had a name meets it this long after Σήμερα settles, once */
const MEET_BALLER_MS = 1200;

export default function VoteScreen() {
  const t = useCopy();
  const [notice, setNotice] = useState<{ kind: VoteErrorKind; n: number } | null>(null);
  const onVoteError = useCallback((kind: VoteErrorKind) => setNotice((p) => ({ kind, n: (p?.n ?? 0) + 1 })), []);
  const { cards, results, dismissResult, celebrations, dismissCelebration, loading, error, refresh, vote } = useFeed(onVoteError);
  const confirmations = useConfirmations();
  const myMatch = useMyMatch();
  const { state: proState } = usePro();
  // matches on later days wait under «Αύριο και μετά» (founder, 14 Oct: Σήμερα is today)
  /** null: not chosen yet, the fold follows laterOpenByDefault */
  const [laterChoice, setShowLater] = useState<boolean | null>(null);
  const unlocks = useUnlocks();
  const unlocksNow = useRef(unlocks);
  unlocksNow.current = unlocks;
  const quests = useQuests();
  const quiz = useQuiz();
  // «Οι ερωτήσεις της ημέρας»: read again whenever the feed comes back into view (after playing, or a new day)
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
  const split = splitToday(cards);
  const showLater = laterChoice ?? laterOpenByDefault(split.today);
  const shown = [...split.today, ...(showLater ? split.later : [])];
  const heads = groupHeads(shown);
  const daily = dailyFold(unlocks.has('daily_quiz') ? quiz.quiz : null, confirmations.items.length, t);
  const forYouDaily = useForYouDaily();
  const [forYouOpen, setForYouOpen] = useState(false);
  // once a day, when it holds something to do and no result or moment is playing
  const forYouReady = forYouDaily.may === true && daily.show && daily.count > 0 && !loading && !current && !celebrating;
  const { markShown } = forYouDaily;
  useEffect(() => {
    if (!forYouReady) return undefined;
    const id = setTimeout(() => {
      setForYouOpen(true);
      markShown();
    }, FOR_YOU_RISE_MS);
    return () => clearTimeout(id);
  }, [forYouReady, markShown]);
  const forYouItems = (
    <>
      {unlocks.has('daily_quiz') && quiz.quiz && quiz.quiz.cards.length > 0 ? (
        <QuizStrip
          quiz={quiz.quiz}
          onPress={() => {
            setForYouOpen(false);
            router.push('/quiz');
          }}
        />
      ) : null}
      {confirmations.items.slice(0, 1).map((item) => (
        <ConfirmCard
          key={item.match_id}
          item={item}
          onAnswer={(a) =>
            void confirmations.answer(item.match_id, a).then((o) => setAnswered(o === 'failed' ? t.confirm.failed : t.confirm.done[o]))
          }
        />
      ))}
    </>
  );
  // players from before Baller had a name meet it once, full screen, when nothing else is playing
  const baller = useBaller();
  const meetReady = baller.met === false && !loading && !current && !celebrating && !forYouOpen;
  useEffect(() => {
    if (!meetReady) return undefined;
    let cancelled = false;
    const id = setTimeout(() => {
      AsyncStorage.getItem(BALLER_OFFERED_KEY)
        .catch(() => null)
        .then((offered) => {
          if (cancelled || !shouldOfferBaller(baller.met, offered)) return;
          AsyncStorage.setItem(BALLER_OFFERED_KEY, '1').catch(() => undefined);
          router.push('/baller?first=1');
        });
    }, MEET_BALLER_MS);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [meetReady, baller.met]);
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
            <Text style={styles.title}>{feedDay(new Date()) > dayKey(new Date().toISOString()) ? t.feed.titleTomorrow : t.feed.title}</Text>
            <Text style={styles.subtitle}>{t.feed.subtitle}</Text>
          </Animated.View>
          {myMatch.match ? <MyMatchCard match={myMatch.match} pro={proState?.pro ?? false} /> : null}
          {myMatch.match && !proState?.pro ? <ProNudge moment="before_match" /> : null}
          {/* «Για σένα»: the game of the day and the matches to confirm, folded (founder, 13 Oct) */}
          <DailyFold fold={daily}>{forYouItems}</DailyFold>
          {current ? (
            <ResultCard
              key={current.id}
              card={current}
              more={results.length > 1}
              delay={played === 0 ? FIRST_RESULT_DELAY : 0}
              onDone={onResultDone}
            />
          ) : null}
          {shown.map((c, i) => (
            <Fragment key={c.id}>
              {showLater && i === split.today.length ? <LaterFold count={split.later.length} open onPress={() => setShowLater(false)} /> : null}
              {heads.has(i) && c.kind === 'match' ? <GroupHead group={c.group!} /> : null}
              {c.kind === 'match' ? (
                <VoteCard match={c} onVote={onVote} onLongPress={(id) => setSafety({ kind: 'match', id })} />
              ) : c.kind === 'postponed' ? (
                <PostponedCard card={c} />
              ) : c.kind === 'sponsored' ? (
                <SponsoredCard card={c} />
              ) : null}
            </Fragment>
          ))}
          {split.later.length > 0 && !showLater ? <LaterFold count={split.later.length} open={false} onPress={() => setShowLater(true)} /> : null}
          {empty ? error ? <Text style={styles.end}>{t.feed.error}</Text> : <BallerNote line={t.feed.empty} /> : null}
        </View>
      </ScrollView>
      {notice ? <Toast key={notice.n} text={t.feed[notice.kind]} /> : null}
      {answered ? <Toast key={answered} text={answered} /> : null}
      {questNote?.kind === 'toast' ? <Toast key={questNote.n} text={questNote.text} /> : null}
      {said ? <Toast key={said.n} text={said.text} /> : null}
      <ForYouSheet visible={forYouOpen} onClose={() => setForYouOpen(false)}>
        {forYouItems}
      </ForYouSheet>
      <SafetySheet target={safety} onClose={(text) => { setSafety(null); if (text) setSaid({ text, n: Date.now() }); }} />
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


/** the tournament and where it is played, once above its run of matches */
function GroupHead({ group }: { group: NonNullable<CardMatch['group']> }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{group.title}</Text>
      {group.sub ? <Text style={text.meta}>{group.sub}</Text> : null}
    </View>
  );
}

/** «Αύριο και μετά · 4 ↓»: the later days, folded until asked for */
function LaterFold({ count, open, onPress }: { count: number; open: boolean; onPress: () => void }) {
  const t = useCopy();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onPress} style={styles.later}>
      <Text style={styles.laterText}>{fmt(t.feed.later, { count })}</Text>
      <Text style={styles.laterText}>{open ? '↑' : '↓'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { marginTop: 8, marginBottom: -4, paddingHorizontal: 4, gap: 2 },
  groupTitle: { fontFamily: fonts.displayHeavy, fontSize: 22, lineHeight: 24, paddingTop: 5, marginTop: -5, paddingBottom: 5, marginBottom: -5, color: colors.ink },
  later: { minHeight: 52, paddingHorizontal: 18, borderRadius: 18, borderWidth: 2, borderColor: colors.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  laterText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  screen: { flex: 1, backgroundColor: colors.paper },
  // prototype: padding 18px 20px, 84px at the bottom while «+ Ματς» shows
  scroll: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 84 },
  feed: { gap: 14 },
  head: { gap: 6 },
  title: { ...text.title },
  subtitle: text.subtitle,
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
