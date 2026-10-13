'use server';
import { revalidatePath } from 'next/cache';
import { createV2ServerClient, getStaff } from '@/lib/v2/server';
import type { GameConfig, LeaguePreview } from './Game';

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

export async function loadConfig(): Promise<GameConfig> {
  const { data, error } = await (await staffRpc())('admin_game_config', {});
  if (error) throw new Error(error.message);
  return data as GameConfig;
}

/** what closing a month would do; writes nothing (api.admin_league_preview) */
export async function leaguePreview(month: string): Promise<LeaguePreview> {
  const { data, error } = await (await staffRpc())('admin_league_preview', { p_month: month || null });
  if (error) throw new Error(error.message);
  return data as LeaguePreview;
}

/** close this month's leagues now (api.admin_league_close): promotions, relegations, awards and the celebrations. Irreversible for the month. */
export async function closeMonth(): Promise<ActionResult> {
  try {
    const { data, error } = await (await staffRpc())('admin_league_close', { p_month: null });
    if (error) return { ok: false, message: error.message };
    revalidatePath('/v2/game');
    return { ok: true, message: `Closed: ${(data as { closed_players: number }).closed_players} players` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'failed' };
  }
}
