import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RpcError, type MeResult, type PlayerProfile, type ResultRow } from '@netprophet/db';
import { MOCK_MATCHES } from '../mock/matches';
import { MOCK_AREAS, mockFindPlayers, mockPlayer, mockPlayersHome } from '../mock/players';
import { mockResults } from '../mock/results';
import { useCopy } from '../i18n';
import { useAuth } from './auth';
import { thousands, toPlayerRow, toProfile, type PlayerRow, type ProfileView } from './players';
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
function useApi() {
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
      return toPct(res.split);
    } catch (err) {
      onError.current?.(voteErrorKind(err));
      throw err;
    }
  }, [api]);

  const dismissResult = useCallback((id: string) => {
    setResults((r) => r.filter((x) => x.id !== id));
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
