'use server';
import { revalidatePath } from 'next/cache';
import { createV2ServerClient, getStaff } from '@/lib/v2/server';
import type { TimelineItem, UsersPage, UsersQuery } from './Users';

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

/** run an admin change, then refresh that person's summary so the list shows it at once */
async function act(fn: string, args: object, ok: string, userId: string): Promise<ActionResult> {
  try {
    const rpc = await adminRpc();
    const { error } = await rpc(fn, args);
    if (error) return { ok: false, message: error.message };
    await rpc('admin_user_refresh', { p_user: userId });
    revalidatePath('/v2/users');
    return { ok: true, message: ok };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'failed' };
  }
}

/** one page of people, searched, filtered and sorted by the database (api.admin_users_page) */
export async function loadUsers(q: UsersQuery): Promise<UsersPage> {
  const { data, error } = await (await adminRpc())('admin_users_page', {
    p_query: q.query || null,
    p_segment: q.segment,
    p_platform: q.platform || null,
    p_lang: q.lang || null,
    p_sort: q.sort,
    p_desc: q.desc,
    p_page: q.page,
    p_size: q.size,
  });
  if (error) throw new Error(error.message);
  return data as UsersPage;
}

/** one person's story, newest first */
export async function loadTimeline(userId: string): Promise<TimelineItem[]> {
  const { data, error } = await (await adminRpc())('admin_user_timeline', { p_user: userId, p_limit: 80 });
  if (error) throw new Error(error.message);
  return (data ?? []) as TimelineItem[];
}

export async function givePro(userId: string, days: number): Promise<ActionResult> {
  return act('admin_grant_pro', { p_user_id: userId, p_days: days }, `Pro for ${days} days.`, userId);
}

export async function endGivenPro(userId: string): Promise<ActionResult> {
  try {
    const rpc = await adminRpc();
    const { data, error } = await rpc('admin_revoke_pro', { p_user_id: userId });
    if (error) return { ok: false, message: error.message };
    await rpc('admin_user_refresh', { p_user: userId });
    revalidatePath('/v2/users');
    const r = data as { still_pro: boolean };
    return { ok: true, message: r.still_pro ? 'The given Pro ended. They still have Pro from a paid subscription.' : 'Pro ended.' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'failed' };
  }
}

export async function setHidden(userId: string, hidden: boolean): Promise<ActionResult> {
  return act('admin_set_user_hidden', { p_user_id: userId, p_hidden: hidden }, hidden ? 'Hidden from the Ladder.' : 'Back on the Ladder.', userId);
}

export async function resetBallerName(userId: string): Promise<ActionResult> {
  return act('admin_reset_baller_name', { p_user: userId }, 'Baller name reset.', userId);
}

export async function releasePlayer(playerId: string, userId: string): Promise<ActionResult> {
  return act('admin_unclaim', { p_player_id: playerId }, 'Player released.', userId);
}
