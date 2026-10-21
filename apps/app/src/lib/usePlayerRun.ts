import { useMemo, useState } from 'react';
import type { GetTournamentResult } from '@netprophet/db';
import { useCopy } from '../i18n';
import { useTournament } from './data';
import { contextOf } from './playerHold';
import { entriesOf, identityOf, pickEntry, runOf, type Entry, type Identity, type Run } from './playerRun';
import type { PathContext } from './tournamentToday';

/** the route params the three player screens share (a summary, the path, the whole draw) */
export interface PlayerParams {
  tournament: string;
  player: string;
  match?: string;
  slot?: string;
  /** the entry picked on the screen before («MD 40+#3») */
  entry?: string;
}

export interface PlayerRunState {
  data: GetTournamentResult | null;
  loading: boolean;
  me: Identity | null;
  entries: Entry[];
  entry: Entry | null;
  run: Run | null;
  ctx: PathContext;
  pick: (key: string) => void;
}

/** one player in one tournament: who they are, their entries (category, partner), the one shown, and its run */
export function usePlayerRun(p: PlayerParams): PlayerRunState {
  const t = useCopy();
  const { data, loading } = useTournament(p.tournament);
  const ctx = useMemo(() => contextOf(p.match, p.slot), [p.match, p.slot]);
  const me = useMemo(() => (data ? identityOf(data, p.player) : null), [data, p.player]);
  const entries = useMemo(() => (data && me ? entriesOf(data, me, t) : []), [data, me, t]);
  const [picked, setPicked] = useState<string | null>(p.entry ?? null);
  const entry = useMemo(
    () => entries.find((e) => e.key === picked) ?? (data && me ? pickEntry(data, me, entries, ctx, t) : null),
    [entries, picked, data, me, ctx, t],
  );
  // the hold's match speaks only for the entry it belongs to
  const run = useMemo(() => (data && entry ? runOf(data, entry, t, ctx) : null), [data, entry, t, ctx]);
  return { data, loading, me, entries, entry, run, ctx, pick: setPicked };
}

/** the params to carry from one player screen to the next */
export function carry(p: PlayerParams, entry: Entry | null): Record<string, string> {
  const out: Record<string, string> = { tournament: p.tournament, player: p.player };
  if (p.match) out.match = p.match;
  if (p.slot) out.slot = p.slot;
  if (entry) out.entry = entry.key;
  return out;
}
