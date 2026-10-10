import { useCallback, useEffect, useRef, useState } from 'react';
import type { MeResult } from '@netprophet/db';
import { MOCK_MATCHES } from '../mock/matches';
import { useCopy } from '../i18n';
import { useAuth } from './auth';
import { api as liveApi, supabase } from './supabase';

/** The RPC client, or null for mock data: no backend, or the dev-only guest. */
function useApi() {
  const { guest } = useAuth();
  return guest ? null : liveApi;
}
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
