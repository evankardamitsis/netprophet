'use server';
import { revalidatePath } from 'next/cache';
import { createV2ServerClient, getStaff } from '@/lib/v2/server';
import type { QuizTemplate, DayPreview } from './Quiz';

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

export async function listTemplates(): Promise<QuizTemplate[]> {
  const { data, error } = await (await staffRpc())('admin_quiz_templates', {});
  if (error) throw new Error(error.message);
  return (data ?? []) as QuizTemplate[];
}

/** add (id null) or edit a template (api.admin_save_quiz_template) */
export async function saveTemplate(id: string | null, p: Record<string, unknown>): Promise<ActionResult> {
  try {
    const { error } = await (await staffRpc())('admin_save_quiz_template', { p_id: id, p });
    if (error) return { ok: false, message: error.message };
    revalidatePath('/v2/quiz');
    return { ok: true, message: 'Saved.' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'failed' };
  }
}

/** the day's cards for one account (api.admin_quiz_preview) */
export async function previewDay(email: string, day: string, pro: boolean): Promise<DayPreview | null> {
  const { data, error } = await (await staffRpc())('admin_quiz_preview', { p_email: email, p_day: day || null, p_pro: pro });
  if (error) throw new Error(error.message);
  return (data ?? null) as DayPreview | null;
}
