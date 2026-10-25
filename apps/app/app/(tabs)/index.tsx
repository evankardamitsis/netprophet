import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { AppState, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BallerNote } from '../../src/components/BallerNote';
import { Celebration } from '../../src/components/Celebration';
import { ConfirmRow } from '../../src/components/ConfirmCard';
import { ProLine } from '../../src/components/ProEntries';
import { ResultsDeck } from '../../src/components/ResultsDeck';
import { SponsoredCard } from '../../src/components/SponsoredCard';
import { Toast } from '../../src/components/Toast';
import { SafetySheet } from '../../src/components/SafetySheet';
import { VoteRow } from '../../src/components/VoteRow';
import {
  AddMatchPill,
  HomeHeader,
  MyMatchRow,
  ProCard,
  QuietLink,
  QuizCard,
  ResultsCard,
  Reveal,
  TournamentStrip,
  VoteGroupHeading,
  YoursBlock,
  YoursRow,
} from '../../src/components/HomeCards';
import { useCopy } from '../../src/i18n';
import { openProEntry } from '../../src/lib/proEntry';
import { ONBOARDING_MOMENT, takeOnboardingPro } from '../../src/lib/proOnboarding';
import { useBaller, useConfirmations, useFeed, useMyMatch, usePro, useQuiz, useTournaments, type SafetyTarget } from '../../src/lib/data';
import type { CardResult } from '../../src/lib/feed';
import { hasMoreVotes, homeSections, homeTournaments, quizCard, resultsLine, todayHeading, topVotes, tournamentRanks, tournamentStrip, voteList, yoursNow, type HomeSection } from '../../src/lib/home';
import { useFollowedIds } from '../../src/lib/myPeople';
import { yoursSet } from '../../src/lib/tournamentToday';
import { useNotes, useVotePath } from '../../src/lib/useVotePath';
import { skipIds, takenToast } from '../../src/lib/resultsSummary';
import type { Celebration as CelebrationItem } from '@netprophet/db';
import { isUnlock, nextGroup } from '../../src/lib/celebrate';
import { hasMoment } from '../../src/lib/unlockLadder';
import { useUnlocks } from '../../src/lib/unlocks';
import { quizStaleIn } from '../../src/lib/quiz';
import { fmt } from '../../src/lib/votes';
import { useHudActions } from '../../src/lib/hud';
import { measureView, useTour, useTourTarget } from '../../src/lib/tour';
import { revealDelta, type TourTarget } from '../../src/lib/tourSteps';
import { useTabScrollTop } from '../../src/lib/scrollTop';
import { colors, fonts, text } from '../../src/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BALLER_OFFERED_KEY, shouldOfferBaller } from '../../src/lib/ballerOffer';
import { momentsAct, useMoments } from '../../src/lib/useMoments';
import { currentMe } from '../../src/lib/meStore';
import { clearSeenResultPushes } from '../../src/lib/push';
import { markResultsSeen } from '../../src/lib/resultsSeen';
import type { MomentKind } from '../../src/lib/moments';

/**
 * Τουρνουά, the home (layout C, founder 25 Oct), top to bottom (homeSections): the page header («Σήμερα» and the date,
 * scrolls with the page), the results card (only while results wait; it opens the results one by one, as Σήμερα played
 * them), «Οι δικοί σου», «Τουρνουά σήμερα» as a strip you swipe, Pro, the quiz, «Ψήφισε σήμερα» (the first three; tap a
 * name to vote; «Περισσότερα ›» opens «Όλα τα ματς σήμερα»), the sponsor's banner and the two quiet links. Everything under the layout is Σήμερα's machinery as it was: the header's held numbers while
 * results wait, the vote burst (quests, badges, celebrations), the moments pacer (Baller, «Για σένα»), the tour.
 */
/** the results deck opens on a tap: its first card comes in after this short beat */
const FIRST_RESULT_DELAY = 150;
/** after a vote, Baller or «Για σένα» wait for this long without scrolling (founder, 18 Oct: when it makes sense) */
const CALM_MS = 2000;

export default function HomeScreen() {
  const t = useCopy();
  // a failed vote, a confirmed match, a finished or moved quest, a report sent: one queue, one at a time
  const { note, pushNote, toast, onVoteError } = useNotes();
  const { cards, results, dismissResult, celebrations, dismissCelebration, loading, error, refresh, vote } = useFeed(onVoteError);
  const confirmations = useConfirmations();
  const myMatch = useMyMatch();
  const { state: proState } = usePro();
  const tournaments = useTournaments();
  const followed = useFollowedIds();
  // the results card opens the deck; a results push lands here with ?results=1 and opens it at once
  const [deckOpen, setDeckOpen] = useState(false);
  // a tap on the card opens the results in the full view and they stay full (founder, 22 Oct); a push opens them as before
  const [deckFull, setDeckFull] = useState(false);
  // every result of this visit has played: «Δες πώς πας φέτος με Pro ›» takes the deck's place
  const [deckEnded, setDeckEnded] = useState(false);
  const params = useLocalSearchParams<{ results?: string }>();
  const unlocks = useUnlocks();
  const unlocksNow = useRef(unlocks);
  unlocksNow.current = unlocks;
  const quiz = useQuiz();
  // «Οι ερωτήσεις της ημέρας»: read again when the feed comes back into view after playing, or on a new quiz day
  // (get_quiz is slow; quizNeedsRead)
  const quizRefresh = quiz.refreshIfNeeded;
  useFocusEffect(
    useCallback(() => {
      void quizRefresh();
    }, [quizRefresh]),
  );
  // a phone left open on Σήμερα gets no focus event: read again when the app comes back to the front, and when the held
  // set runs out while you look (founder, 21 Oct: yesterday's finished quiz hid today's «Για σένα» all day)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void quizRefresh();
    });
    return () => sub.remove();
  }, [quizRefresh]);
  const heldQuiz = quiz.quiz;
  useEffect(() => {
    const ms = quizStaleIn(heldQuiz, new Date());
    // setTimeout holds 32 bits; a set that ends days away is read again on focus or foreground instead
    if (ms === null || ms > 2 ** 31 - 1) return undefined;
    const id = setTimeout(() => void quizRefresh(), ms + 1000);
    return () => clearTimeout(id);
  }, [heldQuiz, quizRefresh]);
  // a vote counts for the pacer once its reveal has played: then, in a calm beat, Baller or «Για σένα» may come
  const onVote = useVotePath({ vote, pushNote, toast, onSettled: () => setCalmFrom(Date.now()) });
  // «Αναφορά» from a long press on a card
  const [safety, setSafety] = useState<SafetyTarget | null>(null);
  // one function for every card, so the memoised VoteRow does not re-render with each render of the home
  const onCardLongPress = useCallback((id: string) => setSafety({ kind: 'match', id }), []);
  const hud = useHudActions();
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

  useEffect(() => {
    hud.setPending(results);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);
  // the header holds σερί back for the cards only here; on every other screen it shows get_me as it is
  const { setOnFeed } = hud;
  useFocusEffect(
    useCallback(() => {
      setOnFeed(true);
      // σερί and πόντοι: read get_me again if the one held is stale, the same reply Εγώ and the Ladder read
      void unlocksNow.current.refresh({ ifStale: true });
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

  // the day's results play one by one in one block at the top (ResultsDeck, founder, 21 Oct); a played card leaves
  // and nothing of it stays on Σήμερα
  const onResultDone = useCallback((card: CardResult) => dismissResult(card.id), [dismissResult]);
  // «Πάρε τους πόντους»: the toast says what came in, at once (the points fly from the row); once the block has left,
  // one mark_inbox_seen call for the card and every result behind it. Their points are already counted on the server,
  // so the header lands on get_me's numbers; the queue is empty after this, so the celebrations behind it can play.
  const onTake = useCallback((taken: { points: number; streak: number }) => toast(takenToast(taken, t)), [toast, t]);
  const onTaken = useCallback((card: CardResult, rest: CardResult[]) => dismissResult(skipIds(card, rest)), [dismissResult]);
  // every result card played: the «Βγήκαν αποτελέσματα» pushes leave the notification centre and the dot on
  // «Αποτελέσματα» goes dark (founder, 20 Oct: "if I see it, remove the notification"). A fresh read with no card
  // waiting clears the pushes too.
  const hadResults = useRef(false);
  useEffect(() => {
    if (loading) return;
    if (results.length > 0) {
      hadResults.current = true;
      return;
    }
    if (hadResults.current) {
      hadResults.current = false;
      // the last result has played: one quiet Pro line where the deck was (capped once a day)
      setDeckEnded(true);
      const at = currentMe()?.results_at;
      if (at) markResultsSeen(at);
    }
    void clearSeenResultPushes();
  }, [loading, results.length]);
  // every result played: the card and the deck are gone
  useEffect(() => {
    if (results.length === 0) {
      setDeckOpen(false);
      setDeckFull(false);
    }
  }, [results.length]);
  // opened from a results push
  const wantResults = params.results === '1';
  useEffect(() => {
    if (!wantResults || loading) return;
    if (results.length > 0) setDeckOpen(true);
    router.setParams({ results: undefined });
  }, [wantResults, loading, results.length]);
  // celebrations wait until every result card has played and the player did something this visit (moments.ts);
  // the group order is nextGroup's; every queued quest together as one. One a visit: the rest stay unseen on the
  // server and come back next visit.
  const group = results.length === 0 ? nextGroup(celebrations) : [];
  const groupKey = group.map((c) => c.id).join();
  const [celebrating, setCelebrating] = useState<CelebrationItem[] | undefined>(undefined);
  const { claim, pick, acted } = moments;
  // the first-visit tour: no moment covers it, and it starts only on a calm Σήμερα (below)
  const tour = useTour();
  const touring = tour.active;
  useEffect(() => {
    if (celebrating || !groupKey || !acted || !focused || touring) return;
    if (claim('celebration')) setCelebrating(group);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupKey, celebrating, acted, focused, touring, claim]);
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

  // a pull reads everything on the home again: the feed, the quiz, the tournaments, your match
  const quizRead = quiz.refresh;
  const refreshTournaments = tournaments.refresh;
  const refreshMyMatch = myMatch.refresh;
  const onPull = useCallback(async () => {
    void quizRead();
    void refreshTournaments();
    void refreshMyMatch();
    await refresh();
  }, [quizRead, refreshTournaments, refreshMyMatch, refresh]);
  const empty = !loading && cards.length === 0;
  const scroller = useRef<ScrollView>(null);
  // a tap on Τουρνουά while on it (or two) scrolls back to the top
  useTabScrollTop(scroller);
  // players from before Baller had a name meet it once, full screen. «Για σένα» no longer rises: the quiz and the
  // matches to confirm sit on the home itself (mockup D). Neither comes on load (founder, 18 Oct): only after a vote, in a calm beat with no scrolling,
  // and only if this visit has not had its moment (moments.ts: a celebration first, then Baller).
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
  useEffect(() => {
    if (!calm || !focused || loading || deckOpen || celebrating || touring) return;
    const ready: MomentKind[] = [];
    if (groupKey) ready.push('celebration');
    if (ballerReady) ready.push('baller');
    const next = pick(ready);
    // a waiting celebration plays on its own (above); otherwise this calm beat is used up
    if (next === 'celebration') return;
    setCalm(false);
    setCalmFrom(0);
    if (next === 'baller' && claim('baller')) {
      setBallerOffered('1');
      AsyncStorage.setItem(BALLER_OFFERED_KEY, '1').catch(() => undefined);
      router.push('/baller?first=1');
    }
  }, [calm, focused, loading, deckOpen, celebrating, touring, groupKey, ballerReady, pick, claim]);
  // the tour starts once the feed has loaded and nothing else is in front (results waiting behind their card do not
  // count, only the open deck); it scrolls the home to the top first
  const tourReady = focused && !loading && !error && !deckOpen && !celebrating && safety === null && !tournaments.loading;
  const { setHome } = tour;
  // the list's offset as the tour left it (nobody scrolls under the tour): a place below the fold is brought up to
  // the top of the list, a place already in view stays where it is
  const tourY = useRef(0);
  const tourVote = useTourTarget('vote');
  const tourTournament = useTourTarget('tournament');
  const reveal = useCallback(
    async (id: TourTarget) => {
      const ref = id === 'vote' ? tourVote : id === 'tournament' ? tourTournament : null;
      const list = scroller.current as unknown as { measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void } | null;
      if (!ref || !list) return;
      const [target, view] = await Promise.all([
        measureView(ref),
        new Promise<{ top: number; bottom: number }>((resolve) => list.measureInWindow((_x, y, _w, h) => resolve({ top: y, bottom: y + h }))),
      ]);
      if (!target) return;
      const delta = revealDelta(target, view, 12);
      if (delta === 0) return;
      tourY.current = Math.max(0, tourY.current + delta);
      scroller.current?.scrollTo({ y: tourY.current, animated: false });
    },
    [tourVote, tourTournament],
  );
  useEffect(() => {
    setHome(
      tourReady,
      () => {
        tourY.current = 0;
        scroller.current?.scrollTo({ y: 0, animated: false });
      },
      reveal,
    );
  }, [tourReady, setHome, reveal]);
  useEffect(() => () => setHome(false), [setHome]);

  // what the home shows, from what is loaded (the vote list reads the cards as the feed loaded them, so rows stay put)
  const now = new Date();
  const meNow = currentMe();
  const yours = yoursSet(meNow?.player?.id ?? null, followed);
  const votes = voteList(cards, tournamentRanks(tournaments.data?.items ?? [], meNow?.profile.area_ids ?? []));
  // always the first three still open; «Περισσότερα ›» opens the rest on its own page, so the home keeps its length
  const shownVotes = topVotes(votes.groups);
  const resultsView = resultsLine(results, t, now);
  const mine = myMatch.match;
  const people = yoursNow(cards, yours, now, t, mine?.matchId);
  const quizView = unlocks.has('daily_quiz') && quiz.quiz ? quizCard(quiz.quiz, t) : null;
  const todays = tournaments.data ? homeTournaments(tournaments.data.items, cards, meNow?.profile.area_ids ?? [], now, t) : [];
  const strip = tournamentStrip(todays);
  // the sponsor's banner only when the admin has one running (the feed carries it); nothing configured, nothing shown
  const sponsored = cards.find((c) => c.kind === 'sponsored');
  const pro = proState ? proState.pro : null;
  // a new account meets Pro once, softly, right after onboarding (proOnboarding.ts); «Όχι τώρα» lands back here
  useEffect(() => {
    if (focused && takeOnboardingPro(pro)) openProEntry(ONBOARDING_MOMENT);
  }, [pro, focused]);
  /** «Ο αγώνας σου» opens its tournament; a match outside one (or one we cannot place) opens the opponent page */
  const openMine = () => {
    if (!mine) return;
    const card = cards.find((c) => c.kind === 'match' && c.id === mine.matchId);
    const tid = (card?.kind === 'match' ? card.tournamentId : undefined) ?? tournaments.data?.mine?.find((m) => m.match_id === mine.matchId)?.tournament_id;
    const me = meNow?.player?.id;
    // your own match opens your run in that tournament, from this match (not the day's schedule)
    if (tid && me) router.push({ pathname: '/tournament-player', params: { tournament: tid, player: me, match: mine.matchId } });
    else if (tid) router.push(`/tournament/${tid}`);
    else if (proState?.pro) router.push(`/scout/${mine.matchId}`);
    else openProEntry('opponent');
  };

  const hasYours = !!mine || confirmations.items.length > 0 || people.length > 0;
  // the order is homeSections' (layout C, founder 25 Oct); each block is drawn here
  const sections = homeSections({ results: deckOpen || resultsView !== null || deckEnded, yours: hasYours, quiz: quizView !== null, sponsor: sponsored?.kind === 'sponsored' });
  const block = (id: HomeSection, i: number): ReactNode => {
    switch (id) {
      case 'header':
        return (
          <Reveal i={i}>
            <HomeHeader date={todayHeading(now, t)} />
          </Reveal>
        );
      case 'results':
        // a card while they wait; a tap plays them one by one, as before (ResultsDeck)
        return deckOpen ? (
          <ResultsDeck openFull={deckFull} results={results} firstDelay={FIRST_RESULT_DELAY} onDone={onResultDone} onTake={onTake} onTaken={onTaken} />
        ) : resultsView ? (
          <Reveal i={i}>
            <ResultsCard
              view={resultsView}
              onOpen={() => {
                setDeckFull(true);
                setDeckOpen(true);
              }}
            />
          </Reveal>
        ) : (
          <ProLine moment="results_end" label={t.pro.entries.resultsEnd} />
        );
      case 'yours':
        return (
          <Reveal i={i}>
            <YoursBlock>
              {mine ? <MyMatchRow match={mine} onPress={openMine} /> : null}
              {mine ? <ProLine moment="my_match" label={t.pro.entries.opponent} /> : null}
              {confirmations.items.map((item) => (
                <ConfirmRow
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
              {people.map((r) => (
                <YoursRow
                  key={r.matchId}
                  row={r}
                  onPress={
                    r.tournamentId
                      ? () => router.push(r.playerId ? { pathname: '/tournament-player', params: { tournament: r.tournamentId!, player: r.playerId, match: r.matchId } } : `/tournament/${r.tournamentId}`)
                      : undefined
                  }
                />
              ))}
            </YoursBlock>
          </Reveal>
        );
      case 'tournaments':
        // today's tournaments as a strip you swipe, right under «Οι δικοί σου»; «+ Ματς» stays beside the heading
        return (
          <>
            <Reveal i={i}>
              <View style={styles.h2Row}>
                <Text style={[styles.h2, styles.h2Flex]}>{t.home.tournaments.title}</Text>
                <AddMatchPill />
              </View>
            </Reveal>
            {strip.length > 0 ? (
              <Reveal i={i + 1}>
                <TournamentStrip items={strip} firstRef={tourTournament} onAll={() => router.push('/tournaments')} />
              </Reveal>
            ) : tournaments.data ? (
              <Text style={styles.end}>{t.home.tournaments.none}</Text>
            ) : null}
          </>
        );
      case 'pro':
        return <ProCard pro={pro} myMatch={mine} />;
      case 'quiz':
        return quizView ? (
          <Reveal i={i}>
            <QuizCard view={quizView} onPress={() => router.push('/quiz')} />
          </Reveal>
        ) : null;
      case 'vote':
        return (
          <>
            <Reveal i={i}>
              <Text style={styles.h2}>{votes.mode === 'tomorrow' ? t.home.vote.tomorrow : t.home.vote.title}</Text>
            </Reveal>
            {shownVotes.map((g, gi) => (
              <View key={g.key} style={styles.voteGroup}>
                <VoteGroupHeading
                  title={g.title ?? t.home.vote.friendlies}
                  count={fmt(g.count === 1 ? t.home.vote.count.one : t.home.vote.count.many, { n: g.count })}
                  onPress={g.tournamentId ? () => router.push(`/tournament/${g.tournamentId}`) : undefined}
                />
                {g.rows.map((m, ri) => (
                  <View key={m.id} ref={gi === 0 && ri === 0 ? tourVote : undefined} collapsable={false}>
                    <VoteRow match={m} where={m.category ?? ''} onVote={onVote} onLongPress={onCardLongPress} index={ri} />
                  </View>
                ))}
              </View>
            ))}
            {hasMoreVotes(votes.groups) ? <QuietLink label={t.home.vote.more} onPress={() => router.push('/all-matches')} /> : null}
            {votes.mode === 'none' && !loading ? error && empty ? <Text style={styles.end}>{t.feed.error}</Text> : <BallerNote line={t.home.vote.empty} /> : null}
          </>
        );
      case 'sponsor':
        return sponsored?.kind === 'sponsored' ? <SponsoredCard card={sponsored} /> : null;
      case 'links':
        return (
          <View style={styles.links}>
            <QuietLink label={t.home.tournaments.all} onPress={() => router.push('/tournaments')} />
            <QuietLink label={t.home.tournaments.search} onPress={() => router.push('/players?focus=1')} />
          </View>
        );
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scroller}
        onScroll={onScrolled}
        onScrollBeginDrag={onScrolled}
        scrollEventThrottle={250}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading && cards.length > 0} onRefresh={onPull} tintColor={colors.ink} />}
      >
        {sections.map((id, i) => (
          <Fragment key={id}>{block(id, i)}</Fragment>
        ))}
      </ScrollView>
      {note?.item.kind === 'toast' ? <Toast key={note.n} text={note.item.text} /> : null}
      <SafetySheet
        target={safety}
        onClose={(msg) => {
          setSafety(null);
          if (msg) toast(msg);
        }}
      />
      {celebrating ? <Celebration key={celebrating.map((c) => c.id).join()} items={celebrating} onDone={() => onCelebrated(celebrating)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  scroll: { paddingTop: 12, paddingHorizontal: 16, paddingBottom: 32, gap: 14 },
  h2: { fontFamily: fonts.displayHeavy, fontSize: 26, lineHeight: 28, paddingTop: 10, marginTop: -6, paddingBottom: 6, marginBottom: -6, color: colors.ink },
  h2Row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  h2Flex: { flex: 1 },
  voteGroup: { gap: 8 },
  links: { gap: 0 },
  end: { ...text.meta, paddingHorizontal: 4 },
});
