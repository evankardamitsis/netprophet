'use server';
import { revalidatePath } from 'next/cache';
import type { ResolveMatchResult, SetScore, Side } from '@netprophet/db';
import { createV2ServerClient, getStaff } from '@/lib/v2/server';

export interface ActionResult {
  ok: boolean;
  message: string;
}

type Rpc = (fn: string, args: object) => Promise<{ data: unknown; error: { message: string } | null }>;

async function staffClient() {
  const client = await createV2ServerClient();
  const staff = await getStaff(client);
  if (!staff) throw new Error('forbidden');
  return { rpc: client.rpc.bind(client) as unknown as Rpc, staff };
}

/** Resolve now (admins); editors leave it to the outbox worker, which runs every minute. */
async function resolve(rpc: Rpc, admin: boolean, matchId: string): Promise<string> {
  if (!admin) return 'Votes resolve within a minute.';
  const { data, error } = await rpc('resolve_match', { p_match_id: matchId });
  if (error) return `Saved. Resolving failed: ${error.message}`;
  const r = data as ResolveMatchResult;
  if (r.voided) return `${r.voided} votes closed with no points.`;
  return `${r.resolved} votes resolved: ${r.correct} right, ${r.wrong} wrong, ${r.points_awarded} points${r.upset ? ', upset' : ''}.`;
}

export async function saveResult(input: {
  matchId: string;
  winnerSide: Side;
  sets: SetScore[];
  retired: boolean;
  walkover: boolean;
}): Promise<ActionResult> {
  try {
    const { rpc, staff } = await staffClient();
    const { error } = await rpc('admin_set_result', {
      p_match_id: input.matchId,
      p_winner_side: input.winnerSide,
      p_sets: input.sets,
      p_retired: input.retired,
      p_walkover: input.walkover,
    });
    if (error) return { ok: false, message: error.message };
    const message = await resolve(rpc, staff.role === 'admin', input.matchId);
    revalidatePath('/v2/results');
    return { ok: true, message: `Saved. ${message}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'failed' };
  }
}

export async function voidMatch(matchId: string): Promise<ActionResult> {
  try {
    const { rpc, staff } = await staffClient();
    const { error } = await rpc('admin_void_match', { p_match_id: matchId });
    if (error) return { ok: false, message: error.message };
    const message = await resolve(rpc, staff.role === 'admin', matchId);
    revalidatePath('/v2/results');
    return { ok: true, message: `Voided. ${message}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'failed' };
  }
}

export async function resolveNow(matchId: string): Promise<ActionResult> {
  try {
    const { rpc, staff } = await staffClient();
    const message = await resolve(rpc, staff.role === 'admin', matchId);
    revalidatePath('/v2/results');
    return { ok: true, message };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'failed' };
  }
}
