'use server';
import { revalidatePath } from 'next/cache';
import { createV2ServerClient, getStaff } from '@/lib/v2/server';
import type { Confidence, DupPage, MergePair, MergeResult } from './Duplicates';

type Rpc = (fn: string, args: object) => Promise<{ data: unknown; error: { message: string } | null }>;

async function staffRpc(): Promise<Rpc> {
  const client = await createV2ServerClient();
  if (!(await getStaff(client))) throw new Error('forbidden');
  return client.rpc.bind(client) as unknown as Rpc;
}

/** counts and one page of pairs for a tab (api.admin_duplicates) */
export async function loadDuplicates(confidence: Confidence, limit: number, offset: number): Promise<DupPage> {
  const { data, error } = await (await staffRpc())('admin_duplicates', { p_confidence: confidence, p_limit: limit, p_offset: offset });
  if (error) throw new Error(error.message);
  return data as DupPage;
}

/** every pair of a tab, for the bulk merge (api.admin_duplicate_pairs) */
export async function loadPairs(confidence: Confidence): Promise<MergePair[]> {
  const { data, error } = await (await staffRpc())('admin_duplicate_pairs', { p_confidence: confidence });
  if (error) throw new Error(error.message);
  return (data ?? []) as MergePair[];
}

/** merge pairs, each on its own (api.admin_merge_duplicates); sure pairs are checked again on the server */
export async function mergePairs(pairs: MergePair[], confidence: Confidence): Promise<MergeResult> {
  try {
    const { data, error } = await (await staffRpc())('admin_merge_duplicates', { p_pairs: pairs, p_confidence: confidence });
    if (error) return { ok: false, merged: 0, skipped: [], message: error.message };
    revalidatePath('/v2/players');
    const d = data as { merged: number; skipped?: (MergePair & { reason: string })[] };
    return { ok: true, merged: d.merged, skipped: d.skipped ?? [], message: `Merged ${d.merged}` };
  } catch (e) {
    return { ok: false, merged: 0, skipped: [], message: e instanceof Error ? e.message : 'failed' };
  }
}

/** «Not the same person»: the pair leaves the list (api.admin_dismiss_duplicate) */
export async function dismissPair(a: string, b: string): Promise<{ ok: boolean; message: string }> {
  try {
    const { error } = await (await staffRpc())('admin_dismiss_duplicate', { p_a: a, p_b: b });
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: 'Kept apart' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'failed' };
  }
}
