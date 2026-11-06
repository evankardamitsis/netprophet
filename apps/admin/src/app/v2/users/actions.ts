'use server';
import { revalidatePath } from 'next/cache';
import { createV2ServerClient, getStaff } from '@/lib/v2/server';
import type { UsersPage } from './Users';

export interface ActionResult {
  ok: boolean;
  message: string;
}

type Rpc = (fn: string, args: object) => Promise<{ data: unknown; error: { message: string } | null }>;

async function adminRpc(): Promise<Rpc> {
  const client = await createV2ServerClient();
  const staff = await getStaff(client);
  if (!staff || staff.role !== 'admin') throw new Error('forbidden');
  return client.rpc.bind(client) as unknown as Rpc;
}

async function act(fn: string, args: object, ok: string): Promise<ActionResult> {
  try {
    const { error } = await (await adminRpc())(fn, args);
    if (error) return { ok: false, message: error.message };
    revalidatePath('/v2/users');
    return { ok: true, message: ok };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'failed' };
  }
}

export async function loadUsers(query: string, filter: string): Promise<UsersPage> {
  const { data, error } = await (await adminRpc())('admin_users', { p_query: query || null, p_filter: filter, p_limit: 500 });
  if (error) throw new Error(error.message);
  return data as UsersPage;
}

export async function givePro(userId: string, days: number): Promise<ActionResult> {
  return act('admin_grant_pro', { p_user_id: userId, p_days: days }, `Pro for ${days} days.`);
}

export async function endGivenPro(userId: string): Promise<ActionResult> {
  try {
    const { data, error } = await (await adminRpc())('admin_revoke_pro', { p_user_id: userId });
    if (error) return { ok: false, message: error.message };
    revalidatePath('/v2/users');
    const r = data as { still_pro: boolean };
    return { ok: true, message: r.still_pro ? 'The given Pro ended. They still have Pro from a paid subscription.' : 'Pro ended.' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'failed' };
  }
}

export async function setHidden(userId: string, hidden: boolean): Promise<ActionResult> {
  return act('admin_set_user_hidden', { p_user_id: userId, p_hidden: hidden }, hidden ? 'Hidden from the Ladder.' : 'Back on the Ladder.');
}

export async function resetBallerName(userId: string): Promise<ActionResult> {
  return act('admin_reset_baller_name', { p_user: userId }, 'Baller name reset.');
}

export async function releasePlayer(playerId: string): Promise<ActionResult> {
  return act('admin_unclaim', { p_player_id: playerId }, 'Player released.');
}
