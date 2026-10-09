import { useCallback, useEffect, useRef, useState } from 'react';
import type { MeResult } from '@netprophet/db';
import { MOCK_MATCHES } from '../mock/matches';
import { useCopy } from '../i18n';
import { api, supabase } from './supabase';
import { fromFeedCard, fromMock, mockVote, toDbSide, toPct, voteErrorKind, type CardMatch, type CardPct, type VoteErrorKind } from './feed';
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
  cards: CardMatch[];
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
  vote: (matchId: string, side: Side) => Promise<CardPct>;
}

export function useFeed(onVoteError?: (kind: VoteErrorKind) => void): FeedState {
  const t = useCopy();
  const [cards, setCards] = useState<CardMatch[]>(() => (api ? [] : MOCK_MATCHES.map((m) => fromMock(m, t))));
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
      setCards(feed.items.flatMap((it) => (it.kind === 'match' ? [fromFeedCard(it, areas, t, now)] : [])));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [t]);

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
  }, []);

  return { cards, loading, error, refresh, vote };
}

export interface MeSummary {
  streak: number;
  points: number;
}

const MOCK_ME: MeSummary = { streak: 7, points: 240 };

/** Streak and total points for the header. Null while loading in live mode. */
export function useMe(): { me: MeSummary | null; raw: MeResult | null; refresh: () => Promise<void> } {
  const [raw, setRaw] = useState<MeResult | null>(null);
  const refresh = useCallback(async () => {
    if (!api) return;
    try {
      setRaw(await api.getMe());
    } catch {
      // the header keeps the last value; the feed shows its own error
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  if (!api) return { me: MOCK_ME, raw: null, refresh };
  return { me: raw ? { streak: raw.game.streak, points: raw.game.total_points } : null, raw, refresh };
}
