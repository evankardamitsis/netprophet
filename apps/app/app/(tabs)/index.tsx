import { dayKey } from '@netprophet/core';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated from 'react-native-reanimated';
import { BallerNote } from '../../src/components/BallerNote';
import { Celebration } from '../../src/components/Celebration';
import { Logo } from '../../src/components/Logo';
import { QUEST_BAR_MS } from '../../src/components/QuestBar';
import { ConfirmCard } from '../../src/components/ConfirmCard';
import { DailyFold, ForYouSheet } from '../../src/components/DailyFold';
import { useForYouDaily } from '../../src/lib/forYouDaily';
import { PostponedCard } from '../../src/components/PostponedCard';
import { QuizStrip } from '../../src/components/QuizStrip';
import { ResultCard, ResultStrip } from '../../src/components/ResultCard';
import { SponsoredCard } from '../../src/components/SponsoredCard';
import { TOAST_MS, Toast } from '../../src/components/Toast';
import { SafetySheet } from '../../src/components/SafetySheet';
import { VoteCard } from '../../src/components/VoteCard';
import { useCopy } from '../../src/i18n';
import { useBaller, useBadges, useConfirmations, useFeed, useQuests, useMyMatch, usePro, useQuiz, type VoteErrorKind, type SafetyTarget } from '../../src/lib/data';
import {
  feedDay,
  feedLine,
  firstOpenIndex,
  foldSlot,
  groupHeads,
  laterOpenByDefault,
  openToVote,
  runCategories,
  seenAdd,
  seenToggle,
  splitToday,
  type CardMatch,
  type CardResult,
  type SeenResults,
} from '../../src/lib/feed';
import { useToastQueue } from '../../src/lib/toastQueue';
import { MyMatchCard } from '../../src/components/MyMatchCard';
import { ProNudge } from '../../src/components/ProNudge';
import type { Celebration as CelebrationItem } from '@netprophet/db';
import { isUnlock, nextGroup } from '../../src/lib/celebrate';
import { hasMoment, gateQuests } from '../../src/lib/unlockLadder';
import { useUnlocks } from '../../src/lib/unlocks';
import { dailyFold } from '../../src/lib/dailyFold';
import { feedbackAfterVote } from '../../src/lib/quests';
import { fmt, type Side } from '../../src/lib/votes';
import { useHud } from '../../src/lib/hud';
import { useFadeUpIn, usePress, useStgIn } from '../../src/lib/motion';
import { colors, fonts, motion, surfaceTints, text, type } from '../../src/theme';
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
/** the tap on «Ποιος κερδίζει;» leaves this much of the screen above the first open card */
const SCROLL_ROOM = 12;

/** one line at a time over Σήμερα: a toast, or the quest bar over the tab bar (founder, 19 Oct) */
type Note =
  | { kind: 'toast'; text: string }
  | { kind: 'bar'; bar: { title: string; from: number; to: number; progress: number; target: number } };

export default function VoteScreen() {
  const t = useCopy();
  // a failed vote, a confirmed match, a finished or moved quest, a report sent: one queue, one at a time
  const notes = useToastQueue<Note>();
  const pushNote = notes.push;
  const toast = useCallback((text: string) => pushNote({ kind: 'toast', text }, TOAST_MS), [pushNote]);
  const onVoteError = useCallback((kind: VoteErrorKind) => toast(t.feed[kind]), [toast, t]);
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
  // vote short of its next tier (never more than one), in the queue
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
        if (f?.kind === 'toast') toast(f.text);
        else if (f) pushNote({ kind: 'bar', bar: { title: f.title, from: f.from, to: f.to, progress: f.progress, target: f.target } }, QUEST_BAR_MS);
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
    [vote, quests.refresh, badges.refresh, t, toast, pushNote],
  );
  // «Αναφορά» from a long press on a card
  const [safety, setSafety] = useState<SafetyTarget | null>(null);
  const hud = useHud();
  // the bar slides over the tab bar, so the tabs layout draws it (prototype mp); it shows when its turn comes
  const { showQuestBar } = hud;
  const note = notes.active;
  useEffect(() => {
    showQuestBar(note?.item.kind === 'bar' ? note.item.bar : null);
  }, [note, showQuestBar]);
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

  // results played this visit fold into strips; a tap opens one again (founder, 19 Oct)
  const [seen, setSeen] = useState<SeenResults>({ list: [], open: null });
  const onResultDone = useCallback(
    (card: CardResult) => {
      setSeen((s) => seenAdd(s, card));
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

  const empty = !loading && cards.length === 0;
  const split = splitToday(cards);
  const showLater = laterChoice ?? laterOpenByDefault(split.today);
  const shown = [...split.today, ...(showLater ? split.later : [])];
  const heads = groupHeads(shown);
  const cats = runCategories(shown);
  const voteCount = openToVote(cards, votedNow);
  // «Για σένα» and the Pro line wait after the 3rd match of today (founder, 19 Oct), never between a head and its run
  const slot = foldSlot(shown, split.today.length);
  const firstOpen = firstOpenIndex(shown, votedNow);
  const scroller = useRef<ScrollView>(null);
  const feedTop = useRef(0);
  const cardTops = useRef(new Map<string, number>());
  const firstOpenId = firstOpen >= 0 ? shown[firstOpen]!.id : null;
  const toFirstVote = useCallback(() => {
    const y = firstOpenId ? cardTops.current.get(firstOpenId) : undefined;
    if (y === undefined) return;
    scroller.current?.scrollTo({ y: Math.max(0, feedTop.current + y - SCROLL_ROOM), animated: true });
  }, [firstOpenId]);
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
              toast(o === 'failed' ? t.confirm.failed : t.confirm.done[o]);
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
  const titleIn = useFadeUpIn(TITLE_IN_MS);
  // the Pro line only once you voted this visit or today, and never above the feed (founder, 19 Oct)
  const votedToday = votedNow.size > 0 || voteCount.voted > 0;
  const extras = (
    <>
      {/* «Για σένα»: the game of the day and the matches to confirm, folded (founder, 13 Oct) */}
      <DailyFold fold={daily}>{forYouItems}</DailyFold>
      {myMatch.match && !proState?.pro && votedToday ? <ProNudge moment="before_match" /> : null}
    </>
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scroller}
        onScroll={onScrolled}
        onScrollBeginDrag={onScrolled}
        scrollEventThrottle={250}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading && cards.length > 0} onRefresh={refresh} tintColor={colors.ink} />}
      >
        <View style={styles.feed} onLayout={(e: LayoutChangeEvent) => (feedTop.current = e.nativeEvent.layout.y)}>
          <Animated.View style={[styles.head, titleIn]}>
            <Text style={styles.title}>{feedDay(new Date()) > dayKey(new Date().toISOString()) ? t.feed.titleTomorrow : t.feed.title}</Text>
            {/* «3 ματς περιμένουν την ψήφο σου.» (founder, 18 Oct: make voting obvious); waits for the feed. «Ποιος
                κερδίζει; Πάτα τον νικητή» is said here once for every card, and a tap takes you to the first vote */}
            {loading && cards.length === 0 ? (
              <Text style={styles.subtitle}>{t.feed.subtitle}</Text>
            ) : (
              <FeedHead
                line={feedLine(voteCount, t)}
                open={voteCount.open > 0 || (voteCount.voted === 0 && voteCount.later > 0)}
                ask={firstOpen >= 0}
                onPress={toFirstVote}
              />
            )}
          </Animated.View>
          {myMatch.match ? <MyMatchCard match={myMatch.match} pro={proState?.pro ?? false} /> : null}
          {seen.list.map((r) =>
            seen.open === r.id ? (
              <ResultCard key={`seen-${r.id}`} card={r} more={false} delay={0} replay onDone={(c) => setSeen((s) => seenToggle(s, c.id))} />
            ) : (
              <ResultStrip key={`seen-${r.id}`} card={r} onPress={(c) => setSeen((s) => seenToggle(s, c.id))} />
            ),
          )}
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
              {i === slot ? extras : null}
              {showLater && i === split.today.length ? <LaterFold count={split.later.length} open onPress={() => setShowLater(false)} /> : null}
              {heads.has(i) && c.kind === 'match' ? <GroupHead group={c.group!} category={cats.head.get(i)} /> : null}
              {/* every card in a wrapper, always: its top is where «Ποιος κερδίζει;» scrolls to */}
              <View onLayout={(e: LayoutChangeEvent) => cardTops.current.set(c.id, e.nativeEvent.layout.y)}>
                {c.kind === 'match' ? (
                  <VoteCard match={c} hideCategory={cats.hide.has(i)} onVote={onVote} onLongPress={(id) => setSafety({ kind: 'match', id })} />
                ) : c.kind === 'postponed' ? (
                  <PostponedCard card={c} />
                ) : c.kind === 'sponsored' ? (
                  <SponsoredCard card={c} />
                ) : null}
              </View>
            </Fragment>
          ))}
          {slot >= shown.length ? extras : null}
          {split.later.length > 0 && !showLater ? <LaterFold count={split.later.length} open={false} onPress={() => setShowLater(true)} /> : null}
          {empty ? error ? <Text style={styles.end}>{t.feed.error}</Text> : <BallerNote line={t.feed.empty} /> : null}
        </View>
      </ScrollView>
      {note?.item.kind === 'toast' ? <Toast key={note.n} text={note.item.text} /> : null}
      <ForYouSheet visible={forYouOpen} onClose={() => setForYouOpen(false)}>
        {forYouItems}
      </ForYouSheet>
      <SafetySheet target={safety} onClose={(text) => { setSafety(null); if (text) toast(text); }} />
      {celebrating ? <Celebration key={celebrating.map((c) => c.id).join()} items={celebrating} onDone={() => onCelebrated(celebrating)} /> : null}
    </View>
  );
}



/**
 * The lines under the title: what waits for your vote, and while a card takes a vote «Ποιος κερδίζει;» with «Πάτα τον
 * νικητή» beside it, said once for the whole feed. A tap takes you to the first card still waiting for your vote.
 */
function FeedHead({ line, open, ask, onPress }: { line: string; open: boolean; ask: boolean; onPress: () => void }) {
  const t = useCopy();
  const press = usePress(0.97);
  // one Pressable throughout (disabled once nothing waits), so the line does not mount again and rise twice
  return (
    <Pressable
      accessibilityRole={ask ? 'button' : 'text'}
      accessibilityLabel={ask ? `${line} ${t.match.who} ${t.feed.hint}` : line}
      disabled={!ask}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      <Animated.View style={[styles.feedHead, press.style]}>
        <FeedLine key={line} line={line} open={open} />
        {ask ? (
          <View style={styles.ask}>
            <Text style={styles.askText}>{t.match.who}</Text>
            <Text style={styles.hint}>{t.feed.hint}</Text>
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

/** the line under the title; it rises in again whenever it changes, so a vote visibly counts down */
function FeedLine({ line, open }: { line: string; open: boolean }) {
  const rise = useStgIn(motion.revealDurShort);
  return <Animated.Text style={[styles.subtitle, open && styles.subtitleOpen, rise]}>{line}</Animated.Text>;
}

/**
 * The tournament and where it is played, once above its run of matches; with the category every match in the run
 * shares («40+»), said here once instead of on each card.
 */
function GroupHead({ group, category }: { group: NonNullable<CardMatch['group']>; category?: string }) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHead}>
        <Logo path={group.logo} name={group.title} size={24} />
        <Text style={styles.groupTitle}>{group.title}</Text>
        {group.surface ? <SurfacePill surface={group.surface} /> : null}
      </View>
      {group.sub || category ? (
        <View style={styles.groupSub}>
          {category ? <Text style={styles.groupCategory}>{category}</Text> : null}
          {group.club && group.sub ? <Logo path={group.club.logo} name={group.club.name} size={16} /> : null}
          {group.sub ? <Text style={[text.meta, styles.groupSubText]}>{group.sub}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

/** the court surface as a quiet tinted pill: «Χώμα» in clay, «Σκληρό» in blue-grey (founder, 19 Oct) */
function SurfacePill({ surface }: { surface: string }) {
  const t = useCopy();
  const label = t.match.surfaces[surface];
  const tint = surfaceTints[surface as keyof typeof surfaceTints];
  if (!label || !tint) return null;
  return (
    <View style={[styles.surfacePill, { backgroundColor: tint.bg }]}>
      <Text style={[styles.surfaceText, { color: tint.ink }]}>{label}</Text>
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
  surfacePill: { paddingVertical: 1, paddingHorizontal: 8, borderRadius: 999 },
  surfaceText: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17 },
  groupCategory: { fontFamily: fonts.bodyBold, fontSize: type.body.size, lineHeight: type.meta.line, color: colors.ink },
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
  feedHead: { gap: 4 },
  ask: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 10 },
  askText: { fontFamily: fonts.displayHeavy, fontSize: 22, lineHeight: 24, paddingTop: 5, marginTop: -5, paddingBottom: 5, marginBottom: -5, color: colors.ink },
  hint: { ...text.meta },
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
