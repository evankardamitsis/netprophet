import AsyncStorage from '@react-native-async-storage/async-storage';
import { levelNumber, matchesLoosely } from '@netprophet/copy';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { RpcError, type BlockedUser, type Celebration, type GetBadgesResult, type GetLookResult, type GetMyLevelResult, type LookCategory, type GetQuestsResult, type GetQuizResult, type AnswerCardResult, type ConfirmationAnswer, type ReportReason, type KudoOption, type Reactions, type ReceivedKudo, type LinkKudo, type MatchLink, type MatchLinkView, type PendingConfirmation, type LogMatchInput, type MatchFormat, type MyMatchCandidate, type PlayerCard, type ProState, type PublicTournament, type Ladder, type LadderScope, type MeResult, type GetTournamentResult, type GetTournamentsResult, type PlayerProfile, type PlayerTraits, type MyTraits, type ResultRow, type ResultsTournament, type UpcomingTournamentsResult, type MySeason, type WinCard } from '@netprophet/db';
import { mockLadder } from '../mock/ladder';
import { mockMe } from '../mock/me';
import { mockBadges } from '../mock/badges';
import { mockLook } from '../mock/look';
import { withWorn } from './look';
import { mockQuests } from '../mock/quests';
import { mockAnswer, mockQuiz } from '../mock/quiz';
import { withAnswer, withoutAnswer } from './quiz';
import { mockScout } from '../mock/scout';
import { mockTournament, mockTournaments, mockUpcoming } from '../mock/tournaments';
import { MOCK_MATCHES, mockPostponed } from '../mock/matches';
import { MOCK_AREAS, mockFindPlayers, mockPlayer, mockPlayersHome } from '../mock/players';
import { MOCK_ME_PLAYER, mockResults } from '../mock/results';
import { mockSeason, mockWinCard } from '../mock/season';
import { withMockAds } from '../mock/sponsored';
import { useCopy } from '../i18n';
import { useAuth } from './auth';
import type { Area } from './onboarding';
import { thousands, toPlayerRow, toProfile, type PlayerRow, type ProfileView } from './players';
import { toMeView, type MeView } from './me';
import { askForPushOnce } from './push';
import { MOCK_TOKEN, mockLinkView } from './link';
import { hasMoment } from './unlockLadder';
import { hydrateNewPlayer, isNewPlayerOn, recordMockVote } from './newPlayer';
import { track } from './analytics';
import { toScoutView, type ScoutView } from './scout';
import { myMatchOf, type MyMatchView } from './myMatch';
import { avatarByKey, defaultAvatarFor, playerAvatar, type AvatarLook, type DefaultAvatar } from './avatar';
import { applyTraitVote, cleanLabel, mockMyTraits, mockPlayerTraits, traitErrorKind, type TraitErrorKind } from './traits';
import { winLossRows, type WinLossRow } from './winLoss';
import { when } from './feed';
import { groupResults, type ResultGroup } from './results';
import { api as liveApi, supabase } from './supabase';
import {
  fromFeedCard,
  fromPostponedCard,
  postponedLast,
  fromMock,
  fromResultCard,
  fromSponsored,
  initials,
  mockVote,
  toDbSide,
  toPct,
  voteErrorKind,
  type CardPct,
  type CardResult,
  type FeedCard,
  type VoteErrorKind,
} from './feed';
import type { Side } from './votes';

/** The RPC client, or null for mock data: no backend, or the dev-only guest. */
export function useApi() {
  const { guest } = useAuth();
  return guest ? null : liveApi;
}

export type { VoteErrorKind } from './feed';

let areaCache: Record<string, string> | null = null;

async function loadAreas(): Promise<Record<string, string>> {
  if (areaCache || !supabase) return areaCache ?? {};
  const { data, error } = await supabase.from('areas').select('id, name_el');
  if (error) throw error;
  areaCache = Object.fromEntries((data ?? []).map((a) => [a.id as string, a.name_el as string]));
  return areaCache;
}

interface FeedState {
  cards: FeedCard[];
  /** unseen results, oldest first; they play one by one at the top of the feed */
  results: CardResult[];
  /** the viewer closed a result card: mark it seen and drop it */
  dismissResult: (id: string) => void;
  /** σερί milestones waiting to play after the result cards */
  celebrations: Celebration[];
  /** the viewer pressed «Συνέχεια» on a (grouped) celebration: mark all of them seen */
  dismissCelebration: (ids: string[]) => void;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
  vote: (matchId: string, side: Side) => Promise<CardPct>;
}

export function useFeed(onVoteError?: (kind: VoteErrorKind) => void): FeedState {
  const t = useCopy();
  const api = useApi();
  const [cards, setCards] = useState<FeedCard[]>(() =>
    api ? [] : postponedLast([...withMockAds(MOCK_MATCHES.map((m) => fromMock(m, t))), fromPostponedCard(mockPostponed(), {}, t)]),
  );
  const [results, setResults] = useState<CardResult[]>([]);
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  useEffect(() => {
    if (api) return;
    let live = true;
    mockCelebrations().then((c) => live && setCelebrations(c));
    return () => {
      live = false;
    };
  }, [api]);
  const [loading, setLoading] = useState(api !== null);
  const [error, setError] = useState(false);
  const onError = useRef(onVoteError);
  onError.current = onVoteError;

  const refresh = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      // area names are a nicety: without them the cards still show, just without the area
      const [feed, areas] = await Promise.all([api.getFeed(30), loadAreas().catch(() => ({}))]);
      const now = new Date();
      setResults(feed.items.flatMap((it) => (it.kind === 'result' ? [fromResultCard(it, t)] : [])));
      setCelebrations(feed.celebrations ?? []);
      setCards(
        postponedLast(
          feed.items.flatMap((it): FeedCard[] =>
            it.kind === 'match'
              ? [fromFeedCard(it, areas, t, now)]
              : it.kind === 'postponed'
                ? [fromPostponedCard(it, areas, t)]
                : it.kind === 'sponsored'
                  ? [fromSponsored(it)]
                  : [],
          ),
        ),
      );
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [t, api]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const vote = useCallback(async (matchId: string, side: Side): Promise<CardPct> => {
    if (!api) {
      const m = MOCK_MATCHES.find((x) => x.id === matchId);
      mockQuestVote();
      mockBadgeVote();
      // the dev «Νέος παίκτης»: a vote that opens a step queues its moment, a beat after the reveal
      const opened = recordMockVote().filter(hasMoment);
      if (opened.length > 0) {
        setTimeout(
          () => setCelebrations((c) => c.concat(opened.map((key) => ({ id: `mock-unlock-${key}`, created_at: new Date().toISOString(), payload: { type: 'unlock' as const, key } })))),
          MOCK_UNLOCK_DELAY_MS,
        );
      }
      return m ? mockVote(m, side) : { pctA: 50, pctB: 50 };
    }
    try {
      const res = await api.castVote(matchId, toDbSide(side));
      track('vote_cast', { match_id: matchId, side: toDbSide(side) });
      void askForPushOnce(api);
      return toPct(res.split);
    } catch (err) {
      onError.current?.(voteErrorKind(err));
      throw err;
    }
  }, [api]);

  const dismissResult = useCallback((id: string) => {
    setResults((r) => {
      const card = r.find((x) => x.id === id);
      if (card) track('result_card_seen', { outcome: card.ok ? 'correct' : 'wrong', points: card.points });
      return r.filter((x) => x.id !== id);
    });
    api?.markInboxSeen([id]).catch(() => undefined);
  }, [api]);

  const dismissCelebration = useCallback((ids: string[]) => {
    setCelebrations((c) => c.filter((x) => !ids.includes(x.id)));
    if (api) api.markInboxSeen(ids).catch(() => undefined);
    else if (ids.includes('mock-cel')) AsyncStorage.setItem(MOCK_CELEBRATION_KEY, '1').catch(() => undefined);
  }, [api]);

  return { cards, results, dismissResult, celebrations, dismissCelebration, loading, error, refresh, vote };
}

/* mock mode and the dev guest: the σερί 5 moment, once per device (founder, 13 Oct) */
const MOCK_CELEBRATION_KEY = 'np.mock.celebrationSeen';
const MOCK_UNLOCK_DELAY_MS = 1400;
async function mockCelebrations(): Promise<Celebration[]> {
  // a new player has no σερί 5 yet
  await hydrateNewPlayer();
  if (isNewPlayerOn()) return [];
  if ((await AsyncStorage.getItem(MOCK_CELEBRATION_KEY).catch(() => null)) === '1') return [];
  return [{ id: 'mock-cel', created_at: new Date().toISOString(), payload: { type: 'streak_milestone', streak: 5, match_id: 'mock', reward: { freeze: false, frame: null } } }];
}

/* quests in mock mode: a new player's list; a vote moves both vote quests, like the server */
let mockQuestState: GetQuestsResult = mockQuests();
function mockQuestVote() {
  const bump = (q: GetQuestsResult['daily'][number]) =>
    (q.key === 'daily_vote_3_cards' || q.key === 'daily_vote_2_matches') && !q.done ? { ...q, progress: q.progress + 1, done: q.progress + 1 >= q.target } : q;
  mockQuestState = { daily: mockQuestState.daily.map(bump), weekly: mockQuestState.weekly };
}

/* badges in mock mode: a returning player's; a vote counts toward «Πολλά τα ψηφαλάκια» like the server */
let mockBadgeState: GetBadgesResult = mockBadges();
function mockBadgeVote() {
  mockBadgeState = {
    ...mockBadgeState,
    badges: mockBadgeState.badges.map((b) => {
      if (b.key !== 'many_votes') return b;
      const counter = b.counter + 1;
      return { ...b, counter, tier: (counter >= b.thresholds[2] ? 3 : counter >= b.thresholds[1] ? 2 : counter >= b.thresholds[0] ? 1 : 0) as 0 | 1 | 2 | 3 };
    }),
  };
}

/** «Αποστολές»: today's and this week's quests with progress; refresh after a vote or when a screen focuses */
export function useQuests(): { quests: GetQuestsResult | null; refresh: () => Promise<GetQuestsResult | null> } {
  const api = useApi();
  const [quests, setQuests] = useState<GetQuestsResult | null>(api ? null : mockQuestState);
  const refresh = useCallback(async () => {
    if (!api) {
      setQuests(mockQuestState);
      return mockQuestState;
    }
    try {
      const q = await api.getQuests();
      setQuests(q);
      return q;
    } catch {
      return null;
    }
  }, [api]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { quests, refresh };
}

export type QuizErrorKind = 'failed' | 'expired';

interface QuizStore {
  quiz: GetQuizResult | null;
  loading: boolean;
  error: boolean;
}

/** one copy of today's cards for the feed strip and the game screen (the game is its own route) */
let quizStore: QuizStore = { quiz: null, loading: false, error: false };
let quizMode: 'live' | 'mock' | null = null;
let quizFlight: Promise<GetQuizResult | null> | null = null;
const quizListeners = new Set<() => void>();
const quizSubscribe = (l: () => void) => {
  quizListeners.add(l);
  return () => quizListeners.delete(l);
};
function setQuizStore(patch: Partial<QuizStore>) {
  quizStore = { ...quizStore, ...patch };
  quizListeners.forEach((l) => l());
}

export interface QuizState {
  quiz: GetQuizResult | null;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<GetQuizResult | null>;
  /** optimistic: the pick shows at once; on an error it is taken back and `onError` says why. Null when it failed. */
  answer: (cardId: string, option: number) => Promise<AnswerCardResult | null>;
}

/** «Οι ερωτήσεις της ημέρας» (api.get_quiz / api.answer_card). Mock mode and the dev guest play the prototype's day-0 cards. */
export function useQuiz(onError?: (kind: QuizErrorKind) => void): QuizState {
  const api = useApi();
  const store = useSyncExternalStore(quizSubscribe, () => quizStore, () => quizStore);
  const onErr = useRef(onError);
  onErr.current = onError;

  const refresh = useCallback(async (): Promise<GetQuizResult | null> => {
    const mode = api ? 'live' : 'mock';
    if (quizMode !== mode) {
      quizMode = mode;
      setQuizStore({ quiz: api ? null : mockQuiz(), loading: false, error: false });
    }
    if (!api) return mockQuiz();
    // the strip and the game screen can both ask at once: one request
    quizFlight ??= (async () => {
      setQuizStore({ loading: true });
      try {
        const quiz = await api.getQuiz();
        setQuizStore({ quiz, loading: false, error: false });
        return quiz;
      } catch {
        setQuizStore({ loading: false, error: true });
        return null;
      } finally {
        quizFlight = null;
      }
    })();
    return quizFlight;
  }, [api]);

  useEffect(() => {
    if (quizMode !== (api ? 'live' : 'mock')) void refresh();
  }, [api, refresh]);

  const answer = useCallback(
    async (cardId: string, option: number): Promise<AnswerCardResult | null> => {
      const before = quizStore.quiz;
      if (!before) return null;
      setQuizStore({ quiz: withAnswer(before, cardId, option) });
      try {
        const res = api ? await api.answerCard(cardId, option) : mockAnswer(cardId, option);
        if (quizStore.quiz) setQuizStore({ quiz: withAnswer(quizStore.quiz, cardId, option, res) });
        return res;
      } catch (err) {
        if (quizStore.quiz) setQuizStore({ quiz: withoutAnswer(quizStore.quiz, cardId) });
        const code = err instanceof RpcError ? err.code : '';
        if (code === 'already_answered' || code === 'card_expired') void refresh();
        onErr.current?.(code === 'card_expired' ? 'expired' : 'failed');
        return null;
      }
    },
    [api, refresh],
  );

  return { quiz: store.quiz, loading: store.loading, error: store.error, refresh, answer };
}

/**
 * «Badges»: all 16 with their tier and counter, and the one worn on the card. `wear` updates the card at once and
 * gives back the toast text (null when it failed, and the old badge is back).
 */
export function useBadges(): { badges: GetBadgesResult | null; refresh: () => Promise<GetBadgesResult | null>; wear: (key: string | null) => Promise<string | null> } {
  const api = useApi();
  const t = useCopy();
  const [badges, setBadges] = useState<GetBadgesResult | null>(api ? null : mockBadgeState);
  const refresh = useCallback(async () => {
    if (!api) {
      setBadges(mockBadgeState);
      return mockBadgeState;
    }
    try {
      const b = await api.getBadges();
      setBadges(b);
      return b;
    } catch {
      return null;
    }
  }, [api]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const wear = useCallback(
    async (key: string | null) => {
      const prev = badges;
      setBadges((b) => (b ? { ...b, worn: key } : b));
      if (!api) {
        if (prev) mockBadgeState = { ...mockBadgeState, worn: key };
        return t.badges.wornToast;
      }
      try {
        const r = await api.wearBadge(key);
        setBadges((b) => (b ? { ...b, worn: r.worn } : b));
        return t.badges.wornToast;
      } catch {
        setBadges(prev);
        return null;
      }
    },
    [api, badges, t],
  );
  return { badges, refresh, wear };
}

/* Εμφάνιση: what the guest owns and wears lives here for the session (mock mode and the dev guest) */
let mockLookState: GetLookResult = mockLook();

export interface LookState {
  look: GetLookResult | null;
  refresh: () => Promise<GetLookResult | null>;
  /** wear an item (null: take the frame or background off); on screen at once, undone if the server refuses. True when it stuck. */
  equip: (category: LookCategory, key: string | null) => Promise<boolean>;
}

export function useLook(): LookState {
  const api = useApi();
  const [look, setLook] = useState<GetLookResult | null>(api ? null : mockLookState);
  const refresh = useCallback(async (): Promise<GetLookResult | null> => {
    if (!api) {
      setLook(mockLookState);
      return mockLookState;
    }
    try {
      const fresh = await api.getLook();
      setLook(fresh);
      return fresh;
    } catch {
      // keep what is on screen
      return null;
    }
  }, [api]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const equip = useCallback(
    async (category: LookCategory, key: string | null) => {
      const prev = look;
      if (!prev) return false;
      setLook(withWorn(prev, category, key));
      if (!api) {
        mockLookState = withWorn(mockLookState, category, key);
        return true;
      }
      try {
        setLook(await api.equipItem(category, key));
        return true;
      } catch {
        setLook(prev);
        return false;
      }
    },
    [api, look],
  );
  return { look, refresh, equip };
}

/** the back of the Εγώ card (get_my_level); the guest gets a sample, with the Pro numbers only if the mock has Pro */
export function useMyLevel(): { level: GetMyLevelResult | null; refresh: () => Promise<void> } {
  const api = useApi();
  const [level, setLevel] = useState<GetMyLevelResult | null>(null);
  const refresh = useCallback(async () => {
    if (!api) {
      const pro = mockPro.pro;
      setLevel({
        claimed: true,
        pro,
        status: 'active',
        tier: 4,
        direction: 'up',
        matches: 7,
        votes: 23,
        value: pro ? 4.23 : null,
        week_ago: pro ? 4.1 : null,
        to_next: pro ? 0.27 : null,
        next_tier: 4.5,
      });
      return;
    }
    try {
      setLevel(await api.getMyLevel());
    } catch {
      setLevel(null);
    }
  }, [api]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { level, refresh };
}

export interface MeSummary {
  streak: number;
  points: number;
  initials: string;
  /** the sport the header's ball shows (founder, 14 Oct: the account button is the sport's ball) */
  sport: string;
}

const MOCK_ME: MeSummary = { streak: 5, points: 340, initials: 'ΒΚ', sport: 'tennis' };

function meInitials(raw: MeResult, email: string | undefined): string {
  const p = raw.profile;
  if (p.first_name || p.surname) return initials(p.first_name, p.surname);
  if (p.display_name) return initials(p.display_name);
  return initials(email);
}

/** Streak and total points for the header. Null while loading in live mode. */
export function useMe(email?: string): { me: MeSummary | null; raw: MeResult | null; refresh: () => Promise<void> } {
  const api = useApi();
  const [raw, setRaw] = useState<MeResult | null>(null);
  const refresh = useCallback(async () => {
    if (!api) return;
    try {
      setRaw(await api.getMe());
    } catch {
      // the header keeps the last value; the feed shows its own error
    }
  }, [api]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  if (!api) return { me: MOCK_ME, raw: null, refresh };
  return {
    me: raw ? { streak: raw.game.streak, points: raw.game.total_points, initials: meInitials(raw, email), sport: raw.profile.primary_sport } : null,
    raw,
    refresh,
  };
}

export interface ResultsState {
  groups: ResultGroup[];
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
}

/** the filter on Αποτελέσματα: one tournament (all of its results) and a player's name */
export interface ResultsFilter {
  tournament: string | null;
  query: string;
}

/** sample mode: the filter applied to the sample rows (a sample tournament's id is its name) */
function filterSample(rows: ResultRow[], f: ResultsFilter): ResultRow[] {
  const q = f.query.trim();
  return rows.filter(
    (r) =>
      (!f.tournament || (r.tournament_id ?? r.tournament) === f.tournament) &&
      (!q || r.sides.some((s) => s.players.some((p) => matchesLoosely(`${p.first_name} ${p.surname}`, q) || matchesLoosely(`${p.surname} ${p.first_name}`, q)))),
  );
}

/** Αποτελέσματα: finished matches of the last two weeks, grouped by day and event; or one tournament's, or a name's. */
export function useResults(filter: ResultsFilter = { tournament: null, query: '' }): ResultsState {
  const t = useCopy();
  const api = useApi();
  const [rows, setRows] = useState<ResultRow[]>(() => (api ? [] : filterSample(mockResults(new Date()), filter)));
  const [loading, setLoading] = useState(api !== null);
  const [error, setError] = useState(false);
  const { tournament, query } = filter;

  const refresh = useCallback(async () => {
    if (!api) {
      setRows(filterSample(mockResults(new Date()), { tournament, query }));
      return;
    }
    setLoading(true);
    try {
      const q = query.trim();
      setRows(await api.getResults(14, tournament || q ? 200 : 60, tournament, q.length >= 2 ? q : null));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [api, tournament, query]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const myPlayer = useMyPlayerId();
  const groups = useMemo(() => groupResults(rows, t, new Date(), myPlayer), [rows, t, myPlayer]);
  return { groups, loading, error, refresh };
}

/** your claimed player's id (null without one), asked once per account; the guest's sample player in mock mode */
let myPlayerCache: { user: string; id: string | null } | null = null;
export function useMyPlayerId(): string | null {
  const api = useApi();
  const user = useAuth().session?.user.id ?? '';
  const cached = myPlayerCache && myPlayerCache.user === user ? myPlayerCache.id : null;
  const [id, setId] = useState<string | null>(() => (api ? cached : MOCK_ME_PLAYER));
  useEffect(() => {
    if (!api) {
      setId(MOCK_ME_PLAYER);
      return;
    }
    if (myPlayerCache && myPlayerCache.user === user) {
      setId(myPlayerCache.id);
      return;
    }
    api
      .getMe()
      .then((me) => {
        const found = me.player?.id ?? null;
        // only a claimed player is kept: someone without one may claim later in the session
        if (found) myPlayerCache = { user, id: found };
        setId(found);
      })
      .catch(() => undefined);
  }, [api, user]);
  return id;
}

export interface SeasonState {
  season: MySeason | null;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
}

/** «Η σεζόν σου» for a month ('2026-10', or the current one): the teaser without Pro, the whole recap with it */
export function useSeason(month: string | null): SeasonState {
  const api = useApi();
  const [season, setSeason] = useState<MySeason | null>(() => (api ? null : mockSeason(new Date(), mockPro.pro, month)));
  const [loading, setLoading] = useState(api !== null);
  const [error, setError] = useState(false);
  const refresh = useCallback(async () => {
    if (!api) {
      setSeason(mockSeason(new Date(), mockPro.pro, month));
      return;
    }
    setLoading(true);
    try {
      setSeason(await api.mySeason(month));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [api, month]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { season, loading, error, refresh };
}

export type WinCardError = 'pro_required' | 'not_your_win' | 'not_shareable' | 'failed';

/** the facts for a share card of one of your own wins; Pro for every win, the month's first win free */
export function useWinCard(matchId: string): { card: WinCard | null; loading: boolean; error: WinCardError | null } {
  const api = useApi();
  const [state, setState] = useState<{ card: WinCard | null; loading: boolean; error: WinCardError | null }>({ card: null, loading: true, error: null });
  useEffect(() => {
    let live = true;
    if (!api) {
      const card = mockWinCard(matchId, new Date(), mockPro.pro);
      setState({ card, loading: false, error: card ? null : 'pro_required' });
      return undefined;
    }
    setState((s) => ({ ...s, loading: true }));
    api
      .winCard(matchId)
      .then((card) => live && setState({ card, loading: false, error: null }))
      .catch((err: unknown) => {
        const code = err instanceof RpcError ? err.code : '';
        const error: WinCardError = code === 'pro_required' || code === 'not_your_win' || code === 'not_shareable' ? code : 'failed';
        if (live) setState({ card: null, loading: false, error });
      });
    return () => {
      live = false;
    };
  }, [api, matchId]);
  return state;
}

/** the tournaments with results lately, for the chips on Αποτελέσματα; yours first */
export function useResultsTournaments(): ResultsTournament[] {
  const api = useApi();
  const [list, setList] = useState<ResultsTournament[]>(() => (api ? [] : sampleTournaments()));
  useEffect(() => {
    if (!api) return;
    let live = true;
    api
      .resultsTournaments()
      .then((l) => {
        if (live) setList(l);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [api]);
  return list;
}

function sampleTournaments(): ResultsTournament[] {
  const n = new Map<string, number>();
  for (const r of mockResults(new Date())) if (r.tournament) n.set(r.tournament, (n.get(r.tournament) ?? 0) + 1);
  return [...n].map(([name, results]) => ({ id: name, name, results }));
}

export interface LadderState {
  ladder: Ladder | null;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
}

/** This month's Κατάταξη in one scope; sample data for the guest. */
export function useLadder(scope: LadderScope): LadderState {
  const api = useApi();
  const [ladder, setLadder] = useState<Ladder | null>(() => (api ? null : mockLadder(scope)));
  const [loading, setLoading] = useState(api !== null);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    if (!api) {
      setLadder(mockLadder(scope));
      return;
    }
    setLoading(true);
    try {
      setLadder(await api.getLadder(scope, 20));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [api, scope]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ladder, loading, error, refresh };
}

export interface MePageState {
  view: MeView | null;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
}

/** Εγώ: get_me, get_me_page and your player's profile in one view; sample data for the guest. */
export function useMePage(): MePageState {
  const t = useCopy();
  const api = useApi();
  const [view, setView] = useState<MeView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      if (!api) {
        const m = mockMe(now);
        setView(toMeView(m.me, m.page, m.player, await areasFor(false), t, now));
      } else {
        const [me, page, areas] = await Promise.all([api.getMe(), api.getMePage(), areasFor(true)]);
        const player = me.player ? await api.getPlayer(me.player.id).catch(() => null) : null;
        setView(toMeView(me, page, player, areas, t, now));
      }
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [api, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { view, loading, error, refresh };
}

export type ScoutError = 'pro_required' | 'not_your_match' | 'match_over' | 'failed';

export interface ScoutState {
  /** «Σήμερα 18:00» */
  when: string | null;
  opponents: ScoutView[];
  loading: boolean;
  error: ScoutError | null;
  refresh: () => Promise<void>;
}

/** «Ο αντίπαλος πριν το ματς» for your match; the database refuses anything but your own upcoming match with Pro. */
export function useScout(matchId: string): ScoutState {
  const t = useCopy();
  const api = useApi();
  const [state, setState] = useState<Omit<ScoutState, 'refresh'>>({ when: null, opponents: [], loading: true, error: null });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const now = new Date();
      const [scout, areas] = await Promise.all([api ? api.getScout(matchId) : mockScout(matchId, now), areasFor(api !== null)]);
      setState({
        when: scout.starts_at ? when(scout.starts_at, now, t).label ?? null : null,
        opponents: scout.opponents.map((p) => toScoutView(p, areas, t)),
        loading: false,
        error: null,
      });
    } catch (err) {
      const code = err instanceof RpcError ? err.code : '';
      const error: ScoutError = code === 'pro_required' || code === 'not_your_match' || code === 'match_over' ? code : 'failed';
      setState({ when: null, opponents: [], loading: false, error });
    }
  }, [api, matchId, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, refresh };
}

const MOCK_WIN_LOSS = {
  total: { w: 16, l: 9 },
  rows: [
    { key: 'morning' as const, w: 7, l: 3 },
    { key: 'evening' as const, w: 3, l: 5 },
    { key: 'deciding' as const, w: 5, l: 1 },
    { key: 'lefties' as const, w: 2, l: 4 },
    { key: 'singles' as const, w: 12, l: 7 },
  ],
};

/** «Πού κερδίζεις, πού χάνεις» rows; only asked for with Pro (the database refuses otherwise). */
export function useWinLoss(pro: boolean): { rows: WinLossRow[] | null } {
  const t = useCopy();
  const api = useApi();
  const [rows, setRows] = useState<WinLossRow[] | null>(null);
  useEffect(() => {
    if (!pro) {
      setRows(null);
      return;
    }
    if (!api) {
      setRows(winLossRows(MOCK_WIN_LOSS, t));
      return;
    }
    api
      .getWinLoss()
      .then((d) => setRows(winLossRows(d, t)))
      .catch(() => setRows([]));
  }, [api, pro, t]);
  return { rows };
}

/** the guest's sample: a match Γιάννης Πράτσας logged against them */
let mockConfirmations: PendingConfirmation[] = [
  {
    match_id: 'mock-confirm',
    format: 'singles',
    starts_at: new Date().toISOString(),
    tournament: null,
    sides: [
      { side: 1, players: [{ id: 'pra', first_name: 'Γιάννης', surname: 'Πράτσας', photo_path: null, area_id: 'glyfada', level_tier: 4, level_direction: 'up' }] },
      { side: 2, players: [{ id: 'me', first_name: 'Βαγγέλης', surname: 'Καρδαμίτσης', photo_path: null, area_id: 'glyfada', level_tier: 4, level_direction: 'up' }] },
    ],
    my_side: 2,
    winner_side: 1,
    score: '2-1',
    logged_by: { first_name: 'Γιάννης', surname: 'Πράτσας' },
  },
];

export type ConfirmOutcome = 'confirmed' | 'corrected' | 'disputed' | 'failed';

/** matches others logged against your player, waiting for «Έγινε έτσι;» */
export function useConfirmations(): { items: PendingConfirmation[]; answer: (matchId: string, a: ConfirmationAnswer) => Promise<ConfirmOutcome> } {
  const api = useApi();
  const [items, setItems] = useState<PendingConfirmation[]>(api ? [] : mockConfirmations);
  useEffect(() => {
    if (!api) return;
    api.getConfirmations().then(setItems).catch(() => setItems([]));
  }, [api]);
  const answer = useCallback(
    async (matchId: string, a: ConfirmationAnswer): Promise<ConfirmOutcome> => {
      const drop = () => setItems((xs) => xs.filter((x) => x.match_id !== matchId));
      if (!api) {
        mockConfirmations = mockConfirmations.filter((x) => x.match_id !== matchId);
        drop();
        return a.answer === 'yes' ? 'confirmed' : a.answer === 'not_me' ? 'disputed' : 'corrected';
      }
      try {
        const r = await api.answerConfirmation(matchId, a);
        track('match_confirmed', { outcome: r.outcome });
        drop();
        return r.outcome;
      } catch {
        return 'failed';
      }
    },
    [api],
  );
  return { items, answer };
}

/**
 * The opponent link /m/<token> (prototype isOpv). Works without an account; mock mode and the dev guest get the
 * prototype's match. `view` is null while loading and 'gone' for a wrong or expired link.
 */
export function useMatchLink(token: string) {
  const api = useApi();
  const [view, setView] = useState<MatchLinkView | 'gone' | null>(null);
  useEffect(() => {
    let live = true;
    if (!api) {
      setView(mockLinkView());
      return;
    }
    api
      .getMatchLink(token)
      .then((v) => {
        if (!live) return;
        setView(v);
        track('link_opened', { state: v.state });
      })
      .catch(() => {
        if (!live) return;
        setView('gone');
        track('link_opened', { state: 'gone' });
      });
    return () => {
      live = false;
    };
  }, [api, token]);

  const answer = useCallback(
    async (a: ConfirmationAnswer): Promise<ConfirmOutcome> => {
      if (!api) return a.answer === 'yes' ? 'confirmed' : a.answer === 'not_me' ? 'disputed' : a.fix.winner === 'them' ? 'corrected' : 'disputed';
      try {
        const r = await api.answerLink(token, a);
        track('link_answered', { outcome: r.outcome });
        return r.outcome;
      } catch {
        return 'failed';
      }
    },
    [api, token],
  );
  const kudo = useCallback(async (k: LinkKudo) => {
    if (api) await api.linkKudo(token, k).catch(() => undefined);
  }, [api, token]);
  const hide = useCallback(
    async (hidden: boolean): Promise<boolean> => {
      if (!api) return true;
      try {
        await api.hideViaLink(token, hidden);
        track('link_hidden', { hidden });
        return true;
      } catch {
        return false;
      }
    },
    [api, token],
  );
  return { view, answer, kudo, hide };
}

/** the logger's links for a match just logged: one per opponent not in the app (none in mock mode) */
export function useMatchLinks(matchId: string | null) {
  const api = useApi();
  const [links, setLinks] = useState<MatchLink[]>([]);
  useEffect(() => {
    if (!matchId) return;
    if (!api) {
      setLinks(matchId === 'mock' ? [{ player_id: 'gio', first_name: 'Γιώργος', surname: 'Παπαδάκης', gender: 'm', token: MOCK_TOKEN }] : []);
      return;
    }
    api.matchLinks(matchId).then(setLinks).catch(() => setLinks([]));
  }, [api, matchId]);
  return links;
}

/* the prototype's five-line samples for mock mode and the dev guest */
const MOCK_KUDOS: KudoOption[] = [
  { key: 'strong_serve', forms: { m: 'Δυνατό σερβίς', f: 'Δυνατό σερβίς', plural: 'Δυνατό σερβίς' } },
  { key: 'steady_baseline', forms: { m: 'Σταθερός στη baseline', f: 'Σταθερή στη baseline', plural: 'Σταθεροί στη baseline' } },
  { key: 'got_everything', forms: { m: 'Τα γύρναγε όλα', f: 'Τα γύρναγε όλα', plural: 'Τα γύρναγαν όλα' } },
  { key: 'fair_calls', forms: { m: 'Δίκαιος στα αμφιλεγόμενα', f: 'Δίκαιη στα αμφιλεγόμενα', plural: 'Δίκαιοι στα αμφιλεγόμενα' } },
  { key: 'rematch', forms: { m: 'Πάμε για ρεβάνς', f: 'Πάμε για ρεβάνς', plural: 'Πάμε για ρεβάνς' } },
];

/** «Πες μια καλή κουβέντα»: five lines for a match (one player when `toPlayer` is given), and sending one */
export function useKudos(matchId: string | null, toPlayer?: string) {
  const api = useApi();
  const [options, setOptions] = useState<KudoOption[] | null>(null);
  useEffect(() => {
    if (!matchId) return;
    if (!api) {
      setOptions(MOCK_KUDOS);
      return;
    }
    api.kudosOptions(matchId, toPlayer).then(setOptions).catch(() => setOptions([]));
  }, [api, matchId, toPlayer]);
  const give = useCallback(
    async (key: string, source: 'log' | 'results'): Promise<boolean> => {
      if (!matchId) return false;
      if (!api) return true;
      try {
        await api.giveKudo(matchId, key, toPlayer);
        track('kudo_given', { source });
        return true;
      } catch {
        return false;
      }
    },
    [api, matchId, toPlayer],
  );
  return { options, give };
}

/** a reaction on a result: the chip moves at once, the server's counts follow */
export function useReact() {
  const api = useApi();
  return useCallback(
    async (matchId: string, key: string | null): Promise<Reactions | null> => {
      if (!api) return null;
      try {
        const r = await api.react(matchId, key);
        track('reaction_set', { key });
        return r;
      } catch {
        return null;
      }
    },
    [api],
  );
}

/** «Τι λένε για σένα» */
export function useMyKudos(): ReceivedKudo[] | null {
  const api = useApi();
  const [list, setList] = useState<ReceivedKudo[] | null>(null);
  useEffect(() => {
    if (!api) {
      setList([
        { ...MOCK_KUDOS[0]!, doubles_only: false, n: 4 },
        { ...MOCK_KUDOS[3]!, doubles_only: false, n: 3 },
        { ...MOCK_KUDOS[1]!, doubles_only: false, n: 2 },
        { key: 'quick_feet', forms: { m: 'Γρήγορα πόδια', f: 'Γρήγορα πόδια', plural: 'Γρήγορα πόδια' }, doubles_only: false, n: 1 },
        { key: 'chemistry', forms: { m: 'Ωραία χημεία', f: 'Ωραία χημεία', plural: 'Ωραία χημεία' }, doubles_only: true, n: 1 },
      ]);
      return;
    }
    api.getMyKudos().then(setList).catch(() => setList([]));
  }, [api]);
  return list;
}

export type SafetyTarget = { kind: 'match'; id: string } | { kind: 'player'; id: string };

/** «Αναφορά» and «Μπλοκ»: who would be blocked, and the two actions (mock mode: always fine) */
export function useSafety(target: SafetyTarget | null) {
  const api = useApi();
  const [who, setWho] = useState<{ first_name: string | null; gender: 'm' | 'f' | null; blocked: boolean } | null>(null);
  useEffect(() => {
    setWho(null);
    if (!target) return;
    if (!api) {
      setWho({ first_name: 'Γιάννης', gender: 'm', blocked: false });
      return;
    }
    const by = target.kind === 'match' ? { matchId: target.id } : { playerId: target.id };
    api.blockTarget(by).then(setWho).catch(() => setWho(null));
  }, [api, target]);
  const report = useCallback(
    async (reason: ReportReason, note: string): Promise<boolean> => {
      if (!target) return false;
      if (!api) return true;
      try {
        await api.report(target.kind, target.id, reason, note.trim() || undefined);
        track('report_sent', { kind: target.kind, reason });
        return true;
      } catch {
        return false;
      }
    },
    [api, target],
  );
  const block = useCallback(async (): Promise<boolean> => {
    if (!target) return false;
    if (!api) return true;
    try {
      await api.block(target.kind === 'match' ? { matchId: target.id } : { playerId: target.id });
      track('user_blocked', { from: target.kind });
      return true;
    } catch {
      return false;
    }
  }, [api, target]);
  return { who, report, block };
}

/** Εγώ › «Μπλοκαρισμένοι» */
export function useBlocks() {
  const api = useApi();
  const [list, setList] = useState<BlockedUser[]>([]);
  useEffect(() => {
    if (api) api.getBlocks().then(setList).catch(() => setList([]));
  }, [api]);
  const unblock = useCallback(
    async (userId: string) => {
      setList((l) => l.filter((b) => b.user_id !== userId));
      if (api) await api.unblock(userId).catch(() => undefined);
    },
    [api],
  );
  return { list, unblock };
}

const MOCK_TOURNAMENTS: PublicTournament[] = [
  { id: 'open-glyfadas', name: 'Open Γλυφάδας', venue: null, area_id: 'glyfada', starts_on: null, ends_on: null },
  { id: 'kypello-voulas', name: 'Κύπελλο Βούλας', venue: null, area_id: 'voula', starts_on: null, ends_on: null },
];

export type LogError = 'duplicate' | 'name_required' | 'failed';

export interface LogMatchData {
  tournaments: PublicTournament[];
  /** friends first, then today's players: the quick picks */
  suggestions: PlayerCard[];
  /** «1.632», for «Ψάξε στους … παίκτες» */
  total: string;
  areas: Record<string, string>;
  search: (q: string) => Promise<PlayerCard[]>;
  findMine: (people: string[], date: string, format: MatchFormat) => Promise<MyMatchCandidate[]>;
  submit: (input: LogMatchInput) => Promise<{ ok: true; matchId: string } | { ok: false; error: LogError }>;
}

/** what «+ Ματς» needs: the pickers, search, «Αυτό είναι το ματς σου;» and the submit */
export function useLogMatch(): LogMatchData {
  const api = useApi();
  const [tournaments, setTournaments] = useState<PublicTournament[]>(api ? [] : MOCK_TOURNAMENTS);
  const [suggestions, setSuggestions] = useState<PlayerCard[]>([]);
  const [total, setTotal] = useState('');
  const [areas, setAreas] = useState<Record<string, string>>({});

  useEffect(() => {
    let live = true;
    (async () => {
      const [home, list, a] = await Promise.all([
        api ? api.getPlayersHome(12) : Promise.resolve(mockPlayersHome()),
        api ? api.listTournaments() : Promise.resolve(MOCK_TOURNAMENTS),
        areasFor(api !== null),
      ]).catch(() => [null, null, {}] as const);
      if (!live) return;
      if (home) {
        setSuggestions(home.players.slice(0, 6));
        setTotal(thousands(home.total_players));
      }
      if (list) setTournaments(list);
      setAreas(a ?? {});
    })();
    return () => {
      live = false;
    };
  }, [api]);

  const search = useCallback(async (q: string) => (api ? api.findPlayers(q, 8) : mockFindPlayers(q)), [api]);
  const findMine = useCallback(
    async (people: string[], date: string, format: MatchFormat) => (api && people.length ? api.findMyMatches(people, date, format).catch(() => []) : []),
    [api],
  );
  const submit = useCallback(
    async (input: LogMatchInput) => {
      if (!api) return { ok: true as const, matchId: 'mock' };
      try {
        const r = await api.logMatch(input);
        track('match_logged', { mode: input.mode, format: input.format, attached: !!input.match_id, new_people: (input.opponents ?? []).filter((p) => 'new' in p).length + (input.partner && 'new' in input.partner ? 1 : 0) });
        return { ok: true as const, matchId: r.match_id };
      } catch (err) {
        const code = err instanceof RpcError ? err.code : '';
        return { ok: false as const, error: code === 'duplicate_match' ? 'duplicate' : code === 'name_required' ? 'name_required' : 'failed' } as const;
      }
    },
    [api],
  );

  return { tournaments, suggestions, total, areas, search, findMine, submit };
}

/** The guest's Pro on sample data: off, and «Γίνε μέλος» puts them on the list for this session. */
let mockPro: ProState = { pro: false, current: null, waitlisted: false };

export interface ProHookState {
  state: ProState | null;
  loading: boolean;
  /** «Γίνε μέλος» while checkout is not live: the list; false when it failed */
  join: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

/** Whether you have Pro (api.get_pro); one rule for every Pro gate in the app. */
export function usePro(): ProHookState {
  const api = useApi();
  const [state, setState] = useState<ProState | null>(api ? null : mockPro);
  const [loading, setLoading] = useState(api !== null);

  const refresh = useCallback(async () => {
    if (!api) {
      setState(mockPro);
      return;
    }
    setLoading(true);
    try {
      setState(await api.getPro());
    } catch {
      // keep the last state; the screen treats unknown as no Pro
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const join = useCallback(async () => {
    if (!api) {
      mockPro = { ...mockPro, waitlisted: true };
      setState(mockPro);
      return true;
    }
    try {
      await api.joinProWaitlist();
      setState((s) => (s ? { ...s, waitlisted: true } : s));
      return true;
    } catch {
      return false;
    }
  }, [api]);

  return { state, loading, join, refresh };
}

/** Area names for the guest's sample data or from the database. */
async function areasFor(live: boolean): Promise<Record<string, string>> {
  return live ? loadAreas().catch(() => ({})) : MOCK_AREAS;
}

export interface PlayersHomeState {
  rows: PlayerRow[];
  /** the roster size, «1.632», for the search placeholder */
  total: string;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
}

/** Παίκτες before a search: friends who do not play today, then today's players. */
export function usePlayersHome(): PlayersHomeState {
  const t = useCopy();
  const api = useApi();
  const [rows, setRows] = useState<PlayerRow[]>([]);
  const [total, setTotal] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [home, areas] = await Promise.all([api ? api.getPlayersHome(60) : mockPlayersHome(), areasFor(api !== null)]);
      setRows(home.players.map((p) => toPlayerRow(p, areas, t)));
      setTotal(thousands(home.total_players));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [api, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { rows, total, loading, error, refresh };
}

/** Typing pauses this long before the search goes out. */
const SEARCH_DEBOUNCE_MS = 250;
/** Fewer letters than this keep the home list. */
export const SEARCH_MIN_CHARS = 2;

/** Name search; rows is null while the query is too short to search. */
export function usePlayerSearch(query: string): { rows: PlayerRow[] | null; searching: boolean } {
  const t = useCopy();
  const api = useApi();
  const [rows, setRows] = useState<PlayerRow[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < SEARCH_MIN_CHARS) {
      setRows(null);
      setSearching(false);
      return undefined;
    }
    let live = true;
    setSearching(true);
    const id = setTimeout(async () => {
      try {
        const [found, areas] = await Promise.all([api ? api.findPlayers(q, 30) : mockFindPlayers(q), areasFor(api !== null)]);
        if (live) setRows(found.map((p) => toPlayerRow(p, areas, t)));
      } catch {
        if (live) setRows([]);
      } finally {
        if (live) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [query, api, t]);

  return { rows, searching };
}

export type FollowOutcome = 'followed' | 'unfollowed' | 'failed';

export interface PlayerState {
  profile: ProfileView | null;
  loading: boolean;
  error: boolean;
  /** the player is hidden or gone */
  notFound: boolean;
  refresh: () => Promise<void>;
  /** follows as a friend («✓ Στους φίλους σου»), or unfollows; optimistic, reverts on failure */
  toggleFollow: () => Promise<FollowOutcome>;
}

export function usePlayer(id: string): PlayerState {
  const t = useCopy();
  const api = useApi();
  const [raw, setRaw] = useState<PlayerProfile | null>(null);
  const [areas, setAreas] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [p, a] = await Promise.all([api ? api.getPlayer(id) : mockPlayer(id, new Date()), areasFor(api !== null)]);
      setAreas(a);
      setRaw(p);
      setNotFound(p === null);
      setError(false);
    } catch (err) {
      if (err instanceof RpcError && err.code === 'player_not_found') setNotFound(true);
      else setError(true);
    } finally {
      setLoading(false);
    }
  }, [api, id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleFollow = useCallback(async (): Promise<FollowOutcome> => {
    if (!raw) return 'failed';
    const on = !raw.is_followed;
    setRaw({ ...raw, is_followed: on });
    if (!api) return on ? 'followed' : 'unfollowed';
    try {
      if (on) await api.followPlayer(raw.id, 'friend', 'profile');
      else await api.unfollowPlayer(raw.id);
      return on ? 'followed' : 'unfollowed';
    } catch {
      setRaw((r) => (r ? { ...r, is_followed: !on } : r));
      return 'failed';
    }
  }, [api, raw]);

  const profile = useMemo(() => (raw ? toProfile(raw, areas, t, new Date()) : null), [raw, areas, t]);
  return { profile, loading, error, notFound, refresh, toggleFollow };
}

export interface TraitsState {
  /** null while loading, or when the player is hidden or the call failed (the block stays away) */
  traits: PlayerTraits | null;
  /** tap a phrase on or off; optimistic, reverts and resolves to the error kind when it fails */
  vote: (traitId: string) => Promise<TraitErrorKind | null>;
  /** add my own phrase; resolves to the error kind, or null when it went to review */
  suggest: (label: string) => Promise<TraitErrorKind | null>;
}

/** «Πώς παίζει» for one player; the guest taps on sample chips. */
export function useTraits(playerId: string, gender: 'm' | 'f' | null): TraitsState {
  const api = useApi();
  const [traits, setTraits] = useState<PlayerTraits | null>(null);
  const ref = useRef<PlayerTraits | null>(null);
  const inflight = useRef(0);
  const set = useCallback((p: PlayerTraits | null) => {
    ref.current = p;
    setTraits(p);
  }, []);

  useEffect(() => {
    let live = true;
    set(null);
    if (!api) {
      set(mockPlayerTraits(playerId, gender));
      return undefined;
    }
    api.getTraits(playerId).then((p) => live && set(p)).catch(() => live && set(null));
    return () => {
      live = false;
    };
    // the gender only matters for the guest's sample
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, playerId, set]);

  const vote = useCallback(
    async (traitId: string): Promise<TraitErrorKind | null> => {
      const before = ref.current;
      const row = before?.traits.find((x) => x.id === traitId);
      if (!before || !row || row.pending || !before.can_vote) return null;
      const on = !row.mine;
      set(applyTraitVote(before, traitId, on));
      if (!api) return null;
      inflight.current += 1;
      try {
        const fresh = await api.voteTrait(playerId, traitId, on);
        inflight.current -= 1;
        // a later tap is still on its way: its answer will carry the truth
        if (inflight.current === 0) set(fresh);
        return null;
      } catch (err) {
        inflight.current -= 1;
        set(ref.current ? applyTraitVote(ref.current, traitId, !on) : before);
        return traitErrorKind(err instanceof RpcError ? err.code : 'failed');
      }
    },
    [api, playerId, set],
  );

  const suggest = useCallback(
    async (label: string): Promise<TraitErrorKind | null> => {
      const clean = cleanLabel(label);
      if (!clean) return 'bad_label';
      const before = ref.current;
      if (!before) return 'failed';
      if (!api) {
        const mine = before.traits.filter((x) => x.pending).length;
        if (mine >= 3) return 'too_many_pending';
        set({
          ...before,
          traits: [...before.traits, { id: `mock-new-${before.traits.length}`, label_el: { m: clean, f: clean }, label_en: clean, count: null, mine: true, pending: true }],
        });
        return null;
      }
      try {
        set(await api.suggestTrait(playerId, clean));
        return null;
      } catch (err) {
        return traitErrorKind(err instanceof RpcError ? err.code : 'failed');
      }
    },
    [api, playerId, set],
  );

  return { traits, vote, suggest };
}

/** «Πώς σε βλέπουν» on Εγώ: my top three; the counts are Pro. Sample for the guest. */
export function useMyTraits(): MyTraits | null {
  const api = useApi();
  const [data, setData] = useState<MyTraits | null>(null);
  useEffect(() => {
    if (!api) {
      setData(mockMyTraits());
      return;
    }
    api.getMyTraits().then(setData).catch(() => setData(null));
  }, [api]);
  return data;
}

/* ---------- onboarding ---------- */

const MOCK_REGION_AREAS: Area[] = [
  { id: 'kifisia', region: 'north', name: 'Κηφισιά', sort: 1 },
  { id: 'marousi', region: 'north', name: 'Μαρούσι', sort: 2 },
  { id: 'halandri', region: 'north', name: 'Χαλάνδρι', sort: 3 },
  { id: 'athens', region: 'center', name: 'Αθήνα', sort: 4 },
  { id: 'pagrati', region: 'center', name: 'Παγκράτι', sort: 5 },
  { id: 'psychiko', region: 'center', name: 'Ψυχικό', sort: 6 },
  { id: 'glyfada', region: 'south', name: 'Γλυφάδα', sort: 7 },
  { id: 'voula', region: 'south', name: 'Βούλα', sort: 8 },
  { id: 'palaio_faliro', region: 'south', name: 'Παλαιό Φάληρο', sort: 9 },
];

/** Areas with their region, for the «Πού παίζεις;» step. */
export function useRegionAreas(): Area[] {
  const api = useApi();
  const [areas, setAreas] = useState<Area[]>(api ? [] : MOCK_REGION_AREAS);
  useEffect(() => {
    if (!api || !supabase) {
      setAreas(MOCK_REGION_AREAS);
      return;
    }
    supabase
      .from('areas')
      .select('id, region, name_el, sort')
      .then(({ data }) =>
        setAreas((data ?? []).map((a) => ({ id: a.id as string, region: a.region as Area['region'], name: a.name_el as string, sort: a.sort as number }))),
      );
  }, [api]);
  return areas;
}

export interface ClaimRow {
  id: string;
  name: string;
  /** «Γλυφάδα · level 4» */
  sub: string;
}

/** The onboarding calls, against the database or (mock mode, the dev guest) the sample data. */
export function useOnboardingApi() {
  const api = useApi();
  const t = useCopy();
  return useMemo(
    () => ({
      async me() {
        return api ? api.getMe() : null;
      },
      async rosterSize(): Promise<string> {
        return thousands(api ? (await api.getPlayersHome(1)).total_players : mockPlayersHome().total_players);
      },
      async saveProfile(patch: Record<string, unknown>) {
        if (api) await api.updateProfile(patch);
      },
      async candidates(first: string, surname: string): Promise<ClaimRow[]> {
        const areas = await areasFor(api !== null);
        if (!api) {
          return mockFindPlayers(surname.slice(0, 3)).map((p) => ({
            id: p.id,
            name: `${p.first_name} ${p.surname}`,
            sub: [p.area_id ? areas[p.area_id] : null, p.level_tier != null ? `${t.level.label} ${levelNumber(p.level_tier)}` : null].filter(Boolean).join(' · '),
          }));
        }
        const rows = await api.findMatchingPlayers(first, surname);
        // the level is on the list row; look the candidates up in one search for their cards
        const cards = rows.length ? await api.findPlayers(surname, 50) : [];
        return rows.map((r) => {
          const c = cards.find((x) => x.id === r.id);
          return {
            id: r.id,
            name: `${r.first_name} ${r.surname}`,
            sub: [r.area_id ? areas[r.area_id] : null, c?.level_tier != null ? `${t.level.label} ${levelNumber(c.level_tier)}` : null].filter(Boolean).join(' · '),
          };
        });
      },
      async claim(playerId: string): Promise<'ok' | 'taken' | 'other' | 'failed'> {
        if (!api) return 'ok';
        try {
          await api.claimPlayer(playerId);
          return 'ok';
        } catch (err) {
          if (err instanceof RpcError && err.code === 'player_already_claimed') return 'taken';
          if (err instanceof RpcError && err.code.startsWith('already_claimed')) return 'other';
          return 'failed';
        }
      },
      async setClaimStatus(status: 'skipped' | 'creation_requested') {
        if (api) await api.setClaimStatus(status);
      },
      async suggestions(): Promise<(PlayerRow & { followers: number })[]> {
        const areas = await areasFor(api !== null);
        const list = api ? await api.suggestPlayers(30) : mockPlayersHome().players.map((p, i) => ({ ...p, followers: 140 - i * 17 }));
        return list.map((p) => ({ ...toPlayerRow({ ...p, is_followed: false }, areas, t), followers: p.followers }));
      },
      async search(query: string): Promise<PlayerRow[]> {
        const areas = await areasFor(api !== null);
        const list = api ? await api.findPlayers(query, 30) : mockFindPlayers(query);
        return list.map((p) => toPlayerRow({ ...p, is_followed: false }, areas, t));
      },
      async follow(ids: string[]) {
        if (api && ids.length) await api.followPlayers(ids);
      },
    }),
    [api, t],
  );
}

export interface TournamentsState {
  data: GetTournamentsResult | null;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
}

/** «Τα τουρνουά σου»: the tournaments on, coming and just finished, and (Pro) my next matches in them. The guest gets a sample. */
export function useTournaments(): TournamentsState {
  const api = useApi();
  const [data, setData] = useState<GetTournamentsResult | null>(api ? null : mockTournaments(mockPro.pro));
  const [loading, setLoading] = useState(api !== null);
  const [error, setError] = useState(false);
  const refresh = useCallback(async () => {
    if (!api) {
      setData(mockTournaments(mockPro.pro));
      return;
    }
    setLoading(true);
    try {
      setData(await api.getTournaments());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [api]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { data, loading, error, refresh };
}

export interface UpcomingState {
  data: UpcomingTournamentsResult | null;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
}

/** «Το επόμενο τουρνουά για σένα»: tournaments still to come for you (free: the first and a count; Pro: all). */
export function useUpcomingTournaments(): UpcomingState {
  const api = useApi();
  const [data, setData] = useState<UpcomingTournamentsResult | null>(api ? null : mockUpcoming(mockPro.pro));
  const [loading, setLoading] = useState(api !== null);
  const [error, setError] = useState(false);
  const refresh = useCallback(async () => {
    if (!api) {
      setData(mockUpcoming(mockPro.pro));
      return;
    }
    setLoading(true);
    try {
      setData(await api.upcomingTournaments());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [api]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { data, loading, error, refresh };
}

export interface TournamentState {
  data: GetTournamentResult | null;
  loading: boolean;
  error: boolean;
  notFound: boolean;
  refresh: () => Promise<void>;
}

/** One tournament with its draws and its schedule by day. */
export function useTournament(id: string): TournamentState {
  const api = useApi();
  const [data, setData] = useState<GetTournamentResult | null>(api ? null : mockTournament(id));
  const [loading, setLoading] = useState(api !== null);
  const [error, setError] = useState(false);
  const [notFound, setNotFound] = useState(!api && mockTournament(id) === null);
  const refresh = useCallback(async () => {
    if (!api) {
      const d = mockTournament(id);
      setData(d);
      setNotFound(d === null);
      return;
    }
    setLoading(true);
    try {
      setData(await api.getTournament(id));
      setError(false);
      setNotFound(false);
    } catch (e) {
      if (e instanceof RpcError && (e.code === 'not_found' || e.sqlState === 'P0002')) setNotFound(true);
      else setError(true);
    } finally {
      setLoading(false);
    }
  }, [api, id]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { data, loading, error, notFound, refresh };
}

/** «Το ματς σου» on Σήμερα: your player's match today or tomorrow, with the opponent. Null without one. */
export function useMyMatch(): { match: MyMatchView | null; refresh: () => Promise<void> } {
  const t = useCopy();
  const api = useApi();
  const [match, setMatch] = useState<MyMatchView | null>(null);
  const refresh = useCallback(async () => {
    const now = new Date();
    try {
      if (!api) {
        setMatch(myMatchOf(mockMe(now).player, t, now));
        return;
      }
      const me = await api.getMe();
      const player = me.player ? await api.getPlayer(me.player.id).catch(() => null) : null;
      setMatch(myMatchOf(player, t, now));
    } catch {
      // the card stays as it was; the feed shows its own error
    }
  }, [api, t]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { match, refresh };
}

/** the dev guest's pick, shared by every screen while the app runs */
let MOCK_AVATAR: string | null = null;

/**
 * Your drawn avatar: the one you picked, else the default for your account (by gender, then a hash of your id).
 * `pick` saves a choice; null goes back to the default.
 */
export function useMyAvatar(): {
  avatar: DefaultAvatar | null;
  picked: string | null;
  pick: (key: string | null) => Promise<boolean>;
  refresh: () => Promise<void>;
} {
  const api = useApi();
  const [me, setMe] = useState<MeResult | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [mockPick, setMockPick] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (!api) {
      setMockPick(MOCK_AVATAR);
      return;
    }
    try {
      const m = await api.getMe();
      setMe(m);
      setPicked(m.profile.avatar ?? null);
    } catch {
      // keeps the last one
    }
  }, [api]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const pick = useCallback(
    async (key: string | null) => {
      if (!api) {
        MOCK_AVATAR = key;
        setMockPick(key);
        return true;
      }
      const before = picked;
      setPicked(key);
      try {
        await api.setAvatar(key);
        return true;
      } catch {
        setPicked(before);
        return false;
      }
    },
    [api, picked],
  );
  if (!api) return { avatar: avatarByKey(mockPick) ?? defaultAvatarFor('mock-me', 'm'), picked: mockPick, pick, refresh };
  if (!me) return { avatar: null, picked, pick, refresh };
  const g = me.profile.gender === 'f' || me.profile.gender === 'm' ? me.profile.gender : null;
  // keyed on your player when you have one, so the default matches what everyone else sees in their lists
  return { avatar: avatarByKey(picked) ?? defaultAvatarFor(me.player?.id ?? me.user_id, g), picked, pick, refresh };
}

/** the dev guest's Baller name while the app runs */
let MOCK_BALLER: string | null = null;

export type BallerSave = 'ok' | 'notAllowed' | 'bad' | 'failed';

/**
 * Your Baller's name and whether you have met it (founder, 17 Oct). `save` names it; the server refuses rude words
 * ('notAllowed') and odd shapes ('bad').
 */
export function useBaller(): { name: string | null; met: boolean | null; save: (name: string) => Promise<BallerSave>; refresh: () => Promise<void> } {
  const api = useApi();
  const [name, setName] = useState<string | null>(api ? null : MOCK_BALLER);
  const [met, setMet] = useState<boolean | null>(api ? null : MOCK_BALLER !== null);
  const refresh = useCallback(async () => {
    if (!api) return;
    try {
      const b = await api.getBaller();
      setName(b.name);
      setMet(b.met);
    } catch {
      // keeps the last one; never offer the meeting on a failed read, but let its screen open
      setMet((m) => m ?? true);
    }
  }, [api]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const save = useCallback(
    async (next: string): Promise<BallerSave> => {
      if (!api) {
        MOCK_BALLER = next;
        setName(next);
        setMet(true);
        return 'ok';
      }
      try {
        const r = await api.setBallerName(next);
        setName(r.name);
        setMet(true);
        return 'ok';
      } catch (e) {
        const m = e instanceof Error ? e.message : '';
        return m.includes('name_not_allowed') ? 'notAllowed' : m.includes('bad_name') ? 'bad' : 'failed';
      }
    },
    [api],
  );
  return { name, met, save, refresh };
}

/** your Baller as it looks right now: your style and everything you wear (lime only where earned) */
export function useMyBaller(): { look: AvatarLook | null; kit: string; gear: string | null; frame: string | null; effect: string | null } {
  const my = useMyAvatar();
  const { look } = useLook();
  const eq = look?.equipped;
  return { look: my.avatar?.look ?? null, kit: eq?.kit ?? 'kit_green', gear: eq?.gear ?? null, frame: eq?.frame ?? null, effect: eq?.win_effect ?? null };
}

export interface OtherBaller {
  look: AvatarLook;
  name: string | null;
  kit: string;
  gear: string | null;
}

/** other players' Ballers by user id (the Ladder podium); empty until loaded, and in sample mode */
export function useBallers(ids: string[]): Record<string, OtherBaller> {
  const api = useApi();
  const [map, setMap] = useState<Record<string, OtherBaller>>({});
  const key = ids.join(',');
  useEffect(() => {
    if (!api || !key) return;
    let live = true;
    api
      .getBallers(key.split(','))
      .then((rows) => {
        if (!live) return;
        const next: Record<string, OtherBaller> = {};
        for (const r of rows) {
          const look = playerAvatar(r.user_id, r.gender, r.avatar);
          if (look) next[r.user_id] = { look, name: r.name, kit: r.kit ?? 'kit_green', gear: r.gear };
        }
        setMap(next);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [api, key]);
  return map;
}
