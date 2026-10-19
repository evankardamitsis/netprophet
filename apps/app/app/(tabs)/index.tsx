import { dayKey } from '@netprophet/core';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { BallerNote } from '../../src/components/BallerNote';
import { Celebration } from '../../src/components/Celebration';
import { Logo } from '../../src/components/Logo';
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
import { feedDay, feedLine, groupHeads, laterOpenByDefault, openToVote, splitToday, type CardMatch, type CardResult } from '../../src/lib/feed';
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
import { useStgIn } from '../../src/lib/motion';
import { colors, ease, fonts, motion, text } from '../../src/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BALLER_OFFERED_KEY, shouldOfferBaller } from '../../src/lib/ballerOffer';
import { momentsAct, useMoments } from '../../src/lib/useMoments';
import type { MomentKind } from '../../src/lib/moments';

const TITLE_IN_MS = 400;
/** the tournaments link sits after this many cards */
/** prototype rqStart / rqNext: the first result waits 450ms, the next one comes 140ms after the last closes */
const FIRST_RESULT_DELAY = 450;
const NEXT_RESULT_GAP = 140;
/** a vote counts for the pacer once its reveal has played, so no moment covers the split (prototype reveal ~900ms) */
const VOTE_SETTLE_MS = 1400;
/** after a vote, Baller or «Για σένα» wait for this long without scrolling (founder, 18 Oct: when it makes sense) */
const CALM_MS = 2000;

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
  // votes cast since the feed loaded: the line under the title counts down at once (the cards keep their loaded vote)
  const [votedNow, setVotedNow] = useState<ReadonlySet<string>>(() => new Set());
  const onVote = useCallback(
    async (matchId: string, side: Side) => {
      const before = questsNow.current;
      const badgesBefore = badgesNow.current;
      const pct = await vote(matchId, side);
      setVotedNow((v) => new Set(v).add(matchId));
      void Promise.all([quests.refresh(), badges.refresh()]).then(([after, badgesAfter]) => {
        // quests and badges that are not open yet say nothing
        const { has } = unlocksNow.current;
        const f = after
          ? feedbackAfterVote(before && gateQuests(before, has), gateQuests(after, has), t, has('badges_shelf') ? { before: badgesBefore, after: badgesAfter } : undefined)
          : null;
        if (f) setQuestNote({ ...f, n: Date.now() });
      });
      void unlocksNow.current.refresh();
      // the first vote of the visit opens the door for one moment; after a calm beat Baller or «Για σένα» may come
      setTimeout(() => {
        momentsAct();
        setCalmFrom(Date.now());
      }, VOTE_SETTLE_MS);
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
  const moments = useMoments();
  /** when the last vote settled: from then on we wait for a calm moment; 0 when not waiting */
  const [calmFrom, setCalmFrom] = useState(0);
  const lastScrollAt = useRef(0);
  // a moment plays only while Σήμερα is in front (the game of the day or a profile may sit on top)
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const onScrolled = useCallback(() => {
    lastScrollAt.current = Date.now();
  }, []);
  const [between, setBetween] = useState(false);
  const [played, setPlayed] = useState(0);

  useEffect(() => {
    hud.setPending(results);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);
  // the header holds σερί back for the cards only here; on every other screen it shows get_me as it is
  const { setOnFeed } = hud;
  useFocusEffect(
    useCallback(() => {
      setOnFeed(true);
      // σερί and πόντοι: read get_me again, the same reply Εγώ and the Ladder read
      void unlocksNow.current.refresh();
      return () => setOnFeed(false);
    }, [setOnFeed]),
  );
  // new result cards came in, or one played: get_me again, so the header lands on the server's σερί after the
  // last card (it was read before these results resolved, it would fall back to an old number)
  const resultIds = results.map((r) => r.id).join();
  const firstIds = useRef(true);
  useEffect(() => {
    if (firstIds.current) {
      firstIds.current = false;
      return;
    }
    void unlocksNow.current.refresh();
  }, [resultIds]);

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
  // celebrations wait until every result card has played and the player did something this visit (moments.ts);
  // the group order is nextGroup's; every queued quest together as one. One a visit: the rest stay unseen on the
  // server and come back next visit.
  const group = results.length === 0 && !between ? nextGroup(celebrations) : [];
  const groupKey = group.map((c) => c.id).join();
  const [celebrating, setCelebrating] = useState<CelebrationItem[] | undefined>(undefined);
  const [forYouOpen, setForYouOpen] = useState(false);
  const { claim, pick, acted } = moments;
  useEffect(() => {
    if (celebrating || !groupKey || forYouOpen || !acted || !focused) return;
    if (claim('celebration')) setCelebrating(group);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupKey, celebrating, forYouOpen, acted, focused, claim]);
  // a step that opens quietly has no moment: mark it seen without showing anything
  const quiet = celebrations.filter((c) => isUnlock(c) && !hasMoment(c.payload.key)).map((c) => c.id).join();
  useEffect(() => {
    if (quiet) {
      dismissCelebration(quiet.split(','));
    }
  }, [quiet, dismissCelebration]);
  // after a moment, read the ladder again so what it opened shows
  const onCelebrated = (list: CelebrationItem[]) => {
    setCelebrating(undefined);
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
  const voteCount = openToVote(cards, votedNow);
  const daily = dailyFold(unlocks.has('daily_quiz') ? quiz.quiz : null, confirmations.items.length, t);
  const forYouDaily = useForYouDaily();
  const { markShown } = forYouDaily;
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
          onAnswer={(a) => {
            void confirmations.answer(item.match_id, a).then((o) => {
              if (o !== 'failed') momentsAct();
              setAnswered(o === 'failed' ? t.confirm.failed : t.confirm.done[o]);
            });
          }}
        />
      ))}
    </>
  );
  // players from before Baller had a name meet it once, full screen; «Για σένα» rises once a day when it holds
  // something to do. Neither comes on load (founder, 18 Oct): only after a vote, in a calm beat with no scrolling,
  // and only if this visit has not had its moment (moments.ts: a celebration first, then Baller, then «Για σένα»).
  const baller = useBaller();
  /** this device already offered Baller: undefined while reading */
  const [ballerOffered, setBallerOffered] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    AsyncStorage.getItem(BALLER_OFFERED_KEY)
      .catch(() => null)
      .then((v) => setBallerOffered(v));
  }, []);
  const [calm, setCalm] = useState(false);
  useEffect(() => {
    if (!calmFrom) return undefined;
    let id: ReturnType<typeof setTimeout>;
    const check = () => {
      const quietFor = Date.now() - Math.max(lastScrollAt.current, calmFrom);
      if (quietFor >= CALM_MS) setCalm(true);
      else id = setTimeout(check, CALM_MS - quietFor);
    };
    id = setTimeout(check, CALM_MS);
    return () => clearTimeout(id);
  }, [calmFrom]);
  const ballerReady = ballerOffered !== undefined && shouldOfferBaller(baller.met, ballerOffered);
  const forYouReady = forYouDaily.may === true && daily.show && daily.count > 0;
  useEffect(() => {
    if (!calm || !focused || loading || current || celebrating || forYouOpen) return;
    const ready: MomentKind[] = [];
    if (groupKey) ready.push('celebration');
    if (ballerReady) ready.push('baller');
    if (forYouReady) ready.push('forYou');
    const next = pick(ready);
    // a waiting celebration plays on its own (above); otherwise this calm beat is used up
    if (next === 'celebration') return;
    setCalm(false);
    setCalmFrom(0);
    if (next === 'baller' && claim('baller')) {
      setBallerOffered('1');
      AsyncStorage.setItem(BALLER_OFFERED_KEY, '1').catch(() => undefined);
      router.push('/baller?first=1');
    } else if (next === 'forYou' && claim('forYou')) {
      setForYouOpen(true);
      markShown();
    }
  }, [calm, focused, loading, current, celebrating, forYouOpen, groupKey, ballerReady, forYouReady, pick, claim, markShown]);
  const titleIn = useInA();

  return (
    <View style={styles.screen}>
      <ScrollView
        onScroll={onScrolled}
        onScrollBeginDrag={onScrolled}
        scrollEventThrottle={250}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading && cards.length > 0} onRefresh={refresh} tintColor={colors.ink} />}
      >
        <View style={styles.feed}>
          <Animated.View style={[styles.head, titleIn]}>
            <Text style={styles.title}>{feedDay(new Date()) > dayKey(new Date().toISOString()) ? t.feed.titleTomorrow : t.feed.title}</Text>
            {/* «3 ματς περιμένουν την ψήφο σου.» (founder, 18 Oct: make voting obvious); waits for the feed */}
            {loading && cards.length === 0 ? (
              <Text style={styles.subtitle}>{t.feed.subtitle}</Text>
            ) : (
              <FeedLine key={feedLine(voteCount, t)} line={feedLine(voteCount, t)} open={voteCount.open > 0 || (voteCount.voted === 0 && voteCount.later > 0)} />
            )}
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


/** the line under the title; it rises in again whenever it changes, so a vote visibly counts down */
function FeedLine({ line, open }: { line: string; open: boolean }) {
  const rise = useStgIn(motion.revealDurShort);
  return <Animated.Text style={[styles.subtitle, open && styles.subtitleOpen, rise]}>{line}</Animated.Text>;
}

/** the tournament and where it is played, once above its run of matches */
function GroupHead({ group }: { group: NonNullable<CardMatch['group']> }) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHead}>
        <Logo path={group.logo} name={group.title} size={24} />
        <Text style={styles.groupTitle}>{group.title}</Text>
      </View>
      {group.sub ? (
        <View style={styles.groupSub}>
          {group.club ? <Logo path={group.club.logo} name={group.club.name} size={16} /> : null}
          <Text style={[text.meta, styles.groupSubText]}>{group.sub}</Text>
        </View>
      ) : null}
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
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupSub: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  groupSubText: { flexShrink: 1 },
  groupTitle: { flexShrink: 1, fontFamily: fonts.displayHeavy, fontSize: 22, lineHeight: 24, paddingTop: 5, marginTop: -5, paddingBottom: 5, marginBottom: -5, color: colors.ink },
  later: { minHeight: 52, paddingHorizontal: 18, borderRadius: 18, borderWidth: 2, borderColor: colors.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  laterText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  screen: { flex: 1, backgroundColor: colors.paper },
  // prototype: padding 18px 20px, 84px at the bottom while «+ Ματς» shows
  scroll: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 84 },
  feed: { gap: 14 },
  head: { gap: 6 },
  title: { ...text.title },
  subtitle: text.subtitle,
  // matches wait for you: the line reads as the screen's job, in ink
  subtitleOpen: { fontFamily: fonts.bodyBold, color: colors.ink },
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
