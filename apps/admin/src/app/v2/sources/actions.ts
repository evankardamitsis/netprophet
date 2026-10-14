'use server';
import { createV2ServerClient, getStaff } from '@/lib/v2/server';
import { drawsForTournament, rowsForTournament } from '@/lib/v2/sheets';
import type { DrawCounts, IngestCounts, ReviewItem, SourceTournament } from './types';

type Rpc = (fn: string, args: object) => Promise<{ data: unknown; error: { message: string } | null }>;

async function staffRpc(): Promise<Rpc> {
  const client = await createV2ServerClient();
  if (!(await getStaff(client))) throw new Error('forbidden');
  return client.rpc.bind(client) as unknown as Rpc;
}

async function call(rpc: Rpc, fn: string, args: object): Promise<unknown> {
  const { data, error } = await rpc(fn, args);
  if (error) throw new Error(error.message);
  return data;
}

export interface ActionResult<T = undefined> {
  ok: boolean;
  message: string;
  data?: T;
}

const fail = (e: unknown): ActionResult<never> => ({ ok: false, message: e instanceof Error ? e.message : 'failed' });

export async function loadTournaments(): Promise<SourceTournament[]> {
  return (await call(await staffRpc(), 'admin_tournaments', {})) as SourceTournament[];
}

export async function loadReviews(): Promise<ReviewItem[]> {
  return (await call(await staffRpc(), 'admin_ingest_reviews', { p_tournament_id: null })) as ReviewItem[];
}

export interface SourcePatch {
  name?: string;
  surface?: string;
  source_kind?: string;
  source_url?: string;
  draw_url?: string;
  ongoing?: boolean;
  season_start_year?: number | null;
}

/** Add a tournament from the three things that matter: name, surface and the links. Dates fill themselves from the sheet. */
export async function createTournament(input: { name: string; surface: string; source_url: string; draw_url: string }): Promise<ActionResult<{ id: string }>> {
  try {
    const id = (await call(await staffRpc(), 'admin_save_tournament', {
      p: {
        name: input.name.trim(),
        surface: input.surface,
        source_url: input.source_url.trim(),
        draw_url: input.draw_url.trim(),
        source_kind: 'sheet',
        ongoing: true,
      },
    })) as string;
    return { ok: true, message: 'Saved', data: { id } };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Save the source fields. admin_save_tournament's update branch rewrites name, venue, area, surface and dates from
 * the payload, so they go back unchanged (read fresh, not from the page).
 */
export async function saveSource(id: string, patch: SourcePatch): Promise<ActionResult> {
  try {
    const rpc = await staffRpc();
    const t = ((await call(rpc, 'admin_tournaments', {})) as SourceTournament[]).find((x) => x.id === id);
    if (!t) return { ok: false, message: 'tournament not found' };
    await call(rpc, 'admin_save_tournament', {
      p: {
        id: t.id,
        name: t.name,
        venue: t.venue ?? '',
        area_id: t.area_id ?? '',
        surface: t.surface ?? '',
        starts_on: t.starts_on ?? '',
        ends_on: t.ends_on ?? '',
        ...patch,
      },
    });
    return { ok: true, message: 'Saved' };
  } catch (e) {
    return fail(e);
  }
}

/** «Δοκιμή τώρα» (dry) and «Τρέξε τώρα»: fetch the sheet here, parse, send the rows to the database */
export async function runNow(id: string, dry: boolean): Promise<ActionResult<IngestCounts>> {
  try {
    const rpc = await staffRpc();
    const t = ((await call(rpc, 'admin_tournaments', {})) as SourceTournament[]).find((x) => x.id === id);
    if (!t) return { ok: false, message: 'tournament not found' };
    const rows = await rowsForTournament(t);
    const data = (await call(rpc, 'admin_ingest_run', { p_tournament_id: id, p_rows: rows, p_dry: dry })) as IngestCounts;
    return { ok: true, message: dry ? 'Dry run, nothing saved' : 'Run saved', data };
  } catch (e) {
    return fail(e);
  }
}

/** read the draw sheet now: dry shows what it would store, else it stores every category's bracket */
export async function readDraws(id: string, dry: boolean): Promise<ActionResult<DrawCounts>> {
  try {
    const rpc = await staffRpc();
    const t = ((await call(rpc, 'admin_tournaments', {})) as SourceTournament[]).find((x) => x.id === id);
    if (!t) return { ok: false, message: 'tournament not found' };
    const draws = await drawsForTournament(t);
    const data = (await call(rpc, 'admin_ingest_draws', { p_tournament_id: id, p_draws: draws, p_dry: dry })) as DrawCounts;
    return { ok: true, message: dry ? 'Draws read, nothing saved' : 'Draws saved', data };
  } catch (e) {
    return fail(e);
  }
}

export type ReviewDecision =
  | { decisions: ({ raw: string; player_id: string } | { raw: string; new: true })[] }
  | { winner_side: 1 | 2 }
  | { dismiss: true };

export async function resolveReview(id: string, decision: ReviewDecision): Promise<ActionResult> {
  try {
    await call(await staffRpc(), 'admin_resolve_ingest_review', { p_id: id, p: decision });
    return { ok: true, message: 'Done' };
  } catch (e) {
    return fail(e);
  }
}

/** two roster entries that are the same person (a typo): keep one, the other's matches, follows and claim move to it */
export async function mergePlayers(dropId: string, keepId: string): Promise<ActionResult> {
  try {
    await call(await staffRpc(), 'admin_decide_player', { p_player_id: dropId, p_action: 'merge', p_target: keepId });
    return { ok: true, message: 'Merged' };
  } catch (e) {
    const m = e instanceof Error ? e.message : 'failed';
    if (m.includes('both_claimed')) return { ok: false, message: 'Both have their own account, so they cannot be merged here.' };
    if (m.includes('same_match')) return { ok: false, message: 'They played each other, so they are two different people.' };
    return { ok: false, message: m };
  }
}

/** «Βροχή»: call off a day's matches still without a result (dry: how many it would be) */
export async function rainDay(id: string, day: string, dry: boolean): Promise<ActionResult<{ matches: number }>> {
  try {
    const n = (await call(await staffRpc(), 'admin_rain_day', { p_tournament_id: id, p_day: day, p_dry: dry })) as number;
    return { ok: true, message: dry ? 'Counted' : 'Called off', data: { matches: n } };
  } catch (e) {
    return fail(e);
  }
}
