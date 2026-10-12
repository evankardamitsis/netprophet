'use server';
import { revalidatePath } from 'next/cache';
import { createV2ServerClient, getStaff } from '@/lib/v2/server';

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

async function act(fn: string, args: object, ok: (data: unknown) => string): Promise<ActionResult> {
  try {
    const rpc = await staffRpc();
    const { data, error } = await rpc(fn, args);
    if (error) return { ok: false, message: error.message };
    revalidatePath('/v2/moderation');
    return { ok: true, message: ok(data) };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'failed' };
  }
}

const DECISIONS = { keep: 'Kept as logged', flip: 'Turned round', void: 'Voided' } as const;

export async function resolveDispute(matchId: string, decision: keyof typeof DECISIONS): Promise<ActionResult> {
  return act('admin_resolve_dispute', { p_match_id: matchId, p_decision: decision }, (d) => {
    const pts = (d as { points: number }).points;
    return `${DECISIONS[decision]}.${pts ? ` ${pts} points given back or awarded.` : ''}`;
  });
}

export async function approvePlayer(playerId: string, first: string, surname: string): Promise<ActionResult> {
  return act('admin_decide_player', { p_player_id: playerId, p_action: 'approve', p_first: first, p_surname: surname }, () => 'Approved.');
}

export async function mergePlayer(playerId: string, targetId: string): Promise<ActionResult> {
  return act('admin_decide_player', { p_player_id: playerId, p_action: 'merge', p_target: targetId }, () => 'Merged.');
}

export async function linkSuggestion(text: string, tournamentId: string | null): Promise<ActionResult> {
  return act('admin_tournament_suggestion', { p_text: text, p_tournament_id: tournamentId }, (d) => {
    const n = (d as { matches: number }).matches;
    return tournamentId ? `${n} match${n === 1 ? '' : 'es'} linked.` : `${n} match${n === 1 ? '' : 'es'} kept as friendlies.`;
  });
}

export async function closeReport(reportId: string, hide: boolean): Promise<ActionResult> {
  return act('admin_close_report', { p_report_id: reportId, p_hide: hide }, () => (hide ? 'Hidden. Reports closed.' : 'Dismissed.'));
}

export interface FoundPlayer {
  id: string;
  name: string;
  sub: string;
}

/** roster search for a merge target */
export async function searchPlayers(q: string): Promise<FoundPlayer[]> {
  if (q.trim().length < 2) return [];
  const rpc = await staffRpc();
  const { data } = await rpc('find_players', { p_query: q, p_limit: 8 });
  return ((data ?? []) as { id: string; first_name: string; surname: string; area_id: string | null }[]).map((p) => ({
    id: p.id,
    name: `${p.first_name} ${p.surname}`,
    sub: p.area_id ?? '',
  }));
}
