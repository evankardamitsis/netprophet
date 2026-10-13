'use server';
import { revalidatePath } from 'next/cache';
import { createV2ServerClient, getStaff } from '@/lib/v2/server';
import type { RosterPlayer } from './Roster';

export interface ActionResult {
  ok: boolean;
  message: string;
}

type Rpc = (fn: string, args: object) => Promise<{ data: unknown; error: { message: string } | null }>;

async function staffRpc(): Promise<Rpc> {
  const client = await createV2ServerClient();
  if (!(await getStaff(client))) throw new Error('forbidden');
  return client.rpc.bind(client) as unknown as Rpc;
}

async function act(fn: string, args: object, ok: string): Promise<ActionResult> {
  try {
    const { error } = await (await staffRpc())(fn, args);
    if (error) return { ok: false, message: error.message };
    revalidatePath('/v2/players');
    return { ok: true, message: ok };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'failed' };
  }
}

export async function searchRoster(query: string, filter: string): Promise<RosterPlayer[]> {
  const { data, error } = await (await staffRpc())('admin_players', { p_query: query || null, p_filter: filter, p_limit: 50 });
  if (error) throw new Error(error.message);
  return (data ?? []) as RosterPlayer[];
}

export async function updatePlayer(playerId: string, patch: Record<string, unknown>): Promise<ActionResult> {
  return act('admin_update_player', { p_player_id: playerId, p: patch }, 'Saved.');
}

export async function unclaimPlayer(playerId: string): Promise<ActionResult> {
  return act('admin_unclaim', { p_player_id: playerId }, 'Claim released.');
}

export async function mergeInto(playerId: string, targetId: string): Promise<ActionResult> {
  return act('admin_decide_player', { p_player_id: playerId, p_action: 'merge', p_target: targetId }, 'Merged.');
}

/** the nightly level run, now (api.admin_recompute_levels) */
export async function recomputeLevels(): Promise<ActionResult> {
  try {
    const { data, error } = await (await staffRpc())('admin_recompute_levels', {});
    if (error) return { ok: false, message: error.message };
    revalidatePath('/v2/players');
    return { ok: true, message: `Levels recomputed for ${(data as { players: number }).players} players.` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'failed' };
  }
}

/** close this month's leagues now (api.admin_league_close): promotions, relegations, awards and the celebrations. Irreversible for the month. */
export async function closeMonth(): Promise<ActionResult> {
  try {
    const { data, error } = await (await staffRpc())('admin_league_close', { p_month: null });
    if (error) return { ok: false, message: error.message };
    revalidatePath('/v2/players');
    return { ok: true, message: `Closed: ${(data as { closed_players: number }).closed_players} players` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'failed' };
  }
}
