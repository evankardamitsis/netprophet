import { createClient, type SupabaseClient, type SupabaseClientOptions } from '@supabase/supabase-js';
import type { Database } from './types';
import type {
  CastVoteResult,
  GetFeedResult,
  MeResult,
  ResolveMatchResult,
  SetScore,
  Side,
} from './rpc';

export const API_SCHEMA = 'api' as const;

/** A Supabase client bound to the `api` schema (the only schema exposed to clients). */
export type NetprophetClient = SupabaseClient<Database, typeof API_SCHEMA>;

export type ClientOptions = Omit<SupabaseClientOptions<typeof API_SCHEMA>, 'db'>;

/** Public client: anon key, user JWT after sign-in. Used by apps/app and apps/site. */
export function createNetprophetClient(url: string, anonKey: string, options: ClientOptions = {}): NetprophetClient {
  return createClient<Database, typeof API_SCHEMA>(url, anonKey, { ...options, db: { schema: API_SCHEMA } });
}

/** Service-role client for edge functions and the admin server actions. Never ship the key to a browser or app. */
export function createServiceClient(url: string, serviceRoleKey: string, options: ClientOptions = {}): NetprophetClient {
  return createNetprophetClient(url, serviceRoleKey, {
    ...options,
    auth: { persistSession: false, autoRefreshToken: false, ...options.auth },
  });
}

export class RpcError extends Error {
  constructor(
    public readonly fn: string,
    /** the machine code raised by the SQL function, e.g. voting_closed, already_voted, forbidden */
    public readonly code: string,
    public readonly sqlState: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = 'RpcError';
  }
}

async function call<T>(client: NetprophetClient, fn: keyof Database['api']['Functions'], args: object): Promise<T> {
  // supabase-js types rpc args per function; the typed wrappers below pin them
  const { data, error } = await (client.rpc as unknown as (f: string, a: object) => Promise<{ data: unknown; error: { code?: string; message: string } | null }>)(
    fn,
    args,
  );
  if (error) {
    const code = error.message.split(/[:\s]/)[0] ?? 'error';
    throw new RpcError(fn, code, error.code, error.message);
  }
  return data as T;
}

/** Typed wrappers for the game RPCs. Rules live in the database; these only move data. */
export function rpc(client: NetprophetClient) {
  return {
    castVote: (matchId: string, side: Side, clientEventId?: string) =>
      call<CastVoteResult>(client, 'cast_vote', { p_match_id: matchId, p_side: side, p_client_event_id: clientEventId }),
    getFeed: (limit = 20) => call<GetFeedResult>(client, 'get_feed', { p_limit: limit }),
    getMe: () => call<MeResult>(client, 'get_me', {}),
    markInboxSeen: (ids: string[]) => call<number>(client, 'mark_inbox_seen', { p_ids: ids }),
    claimPlayer: (playerId: string) => call<{ player_id: string; claimed: boolean; replayed: boolean }>(client, 'claim_player', { p_player_id: playerId }),
    followPlayer: (playerId: string, relation: 'known' | 'friend' = 'known', source: 'onboarding' | 'profile' | 'card' | 'invite' = 'profile') =>
      call<void>(client, 'follow_player', { p_player_id: playerId, p_relation: relation, p_source: source }),
    unfollowPlayer: (playerId: string) => call<void>(client, 'unfollow_player', { p_player_id: playerId }),
    updateProfile: (patch: Record<string, unknown>) => call<{ user_id: string }>(client, 'update_profile', { p_patch: patch }),
    /** admin / service only */
    resolveMatch: (matchId: string) => call<ResolveMatchResult>(client, 'resolve_match', { p_match_id: matchId }),
    /** admin / editor / service only */
    adminSetResult: (matchId: string, winnerSide: Side, sets: SetScore[], opts: { retired?: boolean; walkover?: boolean } = {}) =>
      call<{ match_id: string; result_version: number }>(client, 'admin_set_result', {
        p_match_id: matchId,
        p_winner_side: winnerSide,
        p_sets: sets,
        p_retired: opts.retired ?? false,
        p_walkover: opts.walkover ?? false,
      }),
  };
}
