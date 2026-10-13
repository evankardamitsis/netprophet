'use server';
import { revalidatePath } from 'next/cache';
import { createV2ServerClient, getStaff } from '@/lib/v2/server';
import type { Confidence, NamePass } from './Names';

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
    return { ok: true, message: `Applied ${(data as { applied: number }).applied} names` };
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
        message: error.message.includes('not_same_letters') ? 'Not the same letters: only case and accents may differ' : error.message,
      };
    }
    revalidatePath('/v2/names');
    return { ok: true, message: `Saved ${spelling}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'failed' };
  }
}
