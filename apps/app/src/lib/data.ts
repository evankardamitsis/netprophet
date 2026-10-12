import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RpcError, type ConfirmationAnswer, type LinkKudo, type MatchLink, type MatchLinkView, type PendingConfirmation, type LogMatchInput, type MatchFormat, type MyMatchCandidate, type PlayerCard, type ProState, type PublicTournament, type Ladder, type LadderScope, type MeResult, type PlayerProfile, type ResultRow } from '@netprophet/db';
import { mockLadder } from '../mock/ladder';
import { mockMe } from '../mock/me';
import { mockScout } from '../mock/scout';
import { MOCK_MATCHES } from '../mock/matches';
import { MOCK_AREAS, mockFindPlayers, mockPlayer, mockPlayersHome } from '../mock/players';
import { mockResults } from '../mock/results';
import { useCopy } from '../i18n';
import { useAuth } from './auth';
import type { Area } from './onboarding';
import { thousands, toPlayerRow, toProfile, type PlayerRow, type ProfileView } from './players';
import { toMeView, type MeView } from './me';
import { askForPushOnce } from './push';
import { MOCK_TOKEN, mockLinkView } from './link';
import { track } from './analytics';
import { toScoutView, type ScoutView } from './scout';
import { winLossRows, type WinLossRow } from './winLoss';
import { when } from './feed';
import { groupResults, type ResultGroup } from './results';
import { api as liveApi, supabase } from './supabase';
import {
  fromFeedCard,
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
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
  vote: (matchId: string, side: Side) => Promise<CardPct>;
}

export function useFeed(onVoteError?: (kind: VoteErrorKind) => void): FeedState {
  const t = useCopy();
  const api = useApi();
  const [cards, setCards] = useState<FeedCard[]>(() => (api ? [] : MOCK_MATCHES.map((m) => fromMock(m, t))));
  const [results, setResults] = useState<CardResult[]>([]);
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
      setCards(
        feed.items.flatMap((it): FeedCard[] =>
          it.kind === 'match' ? [fromFeedCard(it, areas, t, now)] : it.kind === 'sponsored' ? [fromSponsored(it)] : [],
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

  return { cards, results, dismissResult, loading, error, refresh, vote };
}

export interface MeSummary {
  streak: number;
  points: number;
  initials: string;
}

const MOCK_ME: MeSummary = { streak: 5, points: 340, initials: 'ΒΚ' };

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
    me: raw ? { streak: raw.game.streak, points: raw.game.total_points, initials: meInitials(raw, email) } : null,
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

/** Αποτελέσματα: finished matches of the last two weeks, grouped by day and event. */
export function useResults(): ResultsState {
  const t = useCopy();
  const api = useApi();
  const [rows, setRows] = useState<ResultRow[]>(() => (api ? [] : mockResults(new Date())));
  const [loading, setLoading] = useState(api !== null);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    if (!api) {
      setRows(mockResults(new Date()));
      return;
    }
    setLoading(true);
    try {
      setRows(await api.getResults(14, 60));
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

  const groups = useMemo(() => groupResults(rows, t, new Date()), [rows, t]);
  return { groups, loading, error, refresh };
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
            sub: [p.area_id ? areas[p.area_id] : null, p.level_tier != null ? `${t.level.label} ${p.level_tier}` : null].filter(Boolean).join(' · '),
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
            sub: [r.area_id ? areas[r.area_id] : null, c?.level_tier != null ? `${t.level.label} ${c.level_tier}` : null].filter(Boolean).join(' · '),
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
