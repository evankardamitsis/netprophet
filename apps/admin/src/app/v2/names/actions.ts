'use server';
import { revalidatePath } from 'next/cache';
import { createV2ServerClient, getStaff } from '@/lib/v2/server';
import type { Confidence, NamePass } from './Names';

export interface ActionResult {
  ok: boolean;
  message: string;
  /** names «Fix» could not change (renamed since): fix those by hand */
  skipped?: string[];
}

async function act(fn: string, args: object, done: string): Promise<ActionResult> {
  try {
    const { error } = await (await staffRpc())(fn, args);
    if (error) return { ok: false, message: error.message };
    revalidatePath('/v2/names');
    return { ok: true, message: done };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'failed' };
  }
}

/** rename one player by hand, any letters; the old name stays an alias (api.admin_rename_player) */
export async function renamePlayer(playerId: string, first: string, surname: string): Promise<ActionResult> {
  return act('admin_rename_player', { p_player_id: playerId, p_first: first, p_surname: surname }, `Renamed to ${[first, surname].filter(Boolean).join(' ')}`);
}

/** leave a name as it is: it leaves the list (api.admin_dismiss_name) */
export async function dismissName(playerId: string, name: string): Promise<ActionResult> {
  return act('admin_dismiss_name', { p_player_id: playerId }, `${name} left as it is`);
}

/** remove a wrong word from the dictionary (api.admin_forget_spelling) */
export async function forgetSpelling(kind: 'first' | 'surname', word: string): Promise<ActionResult> {
  return act('admin_forget_spelling', { p_kind: kind, p_word: word }, `${word} removed`);
}

type Rpc = (fn: string, args: object) => Promise<{ data: unknown; error: { message: string } | null }>;

async function staffRpc(): Promise<Rpc> {
  const client = await createV2ServerClient();
  if (!(await getStaff(client))) throw new Error('forbidden');
  return client.rpc.bind(client) as unknown as Rpc;
}

/** counts, one page of rows and the words to fix for a tab (api.admin_name_pass) */
export async function loadPass(confidence: Confidence, limit: number, offset: number): Promise<NamePass> {
  const { data, error } = await (await staffRpc())('admin_name_pass', {
    p_confidence: confidence,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw new Error(error.message);
  return data as NamePass;
}

/** rename players to their proposals (api.admin_apply_names); null ids = every sure proposal */
export async function applyNames(ids: string[] | null): Promise<ActionResult> {
  try {
    const { data, error } = await (await staffRpc())('admin_apply_names', { p_player_ids: ids, p_confidence: 'high' });
    if (error) return { ok: false, message: error.message };
    revalidatePath('/v2/names');
    const d = data as { applied: number; skipped?: { player_id: string; name: string }[] };
    const skipped = d.skipped ?? [];
    return {
      ok: true,
      message: `Applied ${d.applied} names`,
      skipped: skipped.map((s) => s.name),
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'failed' };
  }
}

/** approve the spelling of one word (api.admin_save_spelling) */
export async function saveSpelling(kind: 'first' | 'surname', word: string, spelling: string): Promise<ActionResult> {
  try {
    const { error } = await (await staffRpc())('admin_save_spelling', { p_kind: kind, p_word: word, p_spelling: spelling });
    if (error) {
      return {
        ok: false,
        message: error.message.includes('not_same_letters')
          ? 'A word only changes case and accents. To fix a typo, use Edit on the name below.'
          : error.message,
      };
    }
    revalidatePath('/v2/names');
    return { ok: true, message: `Saved ${spelling}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'failed' };
  }
}
