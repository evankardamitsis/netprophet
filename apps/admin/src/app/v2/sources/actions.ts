'use server';
import { createV2ServerClient, getStaff } from '@/lib/v2/server';
import { isLogoKind, logoPath, logoProblem, sniffLogo, type LogoKind } from '@/lib/v2/logos';
import type { RecordsResult } from '@/lib/v2/records';
import { writeRecordsSheet } from '@/lib/v2/recordsSheet';
import { drawsForTournament, rowsForTournament, sourceKind } from '@/lib/v2/sheets';
import type { ReviewAnswer } from '@/lib/v2/ingestRows';
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
  /** yyyy-mm-dd, or '' to clear */
  entry_deadline?: string;
  /** '' clears */
  entry_link?: string;
  /** HH:MM: matches with no start time close for votes at this Athens time on their day */
  untimed_lock_time?: string;
}

const ENTRY_LINK_INVALID = 'The entry link must be a web address (https://...).';
const entryFail = (e: unknown): ActionResult<never> =>
  e instanceof Error && e.message.includes('entry_link_invalid') ? { ok: false, message: ENTRY_LINK_INVALID } : fail(e);

/** Add a tournament from the three things that matter: name, surface and the links. Dates fill themselves from the sheet. */
export async function createTournament(input: {
  name: string;
  surface: string;
  source_url: string;
  draw_url: string;
  entry_deadline?: string;
  entry_link?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const id = (await call(await staffRpc(), 'admin_save_tournament', {
      p: {
        name: input.name.trim(),
        surface: input.surface,
        source_url: input.source_url.trim(),
        draw_url: input.draw_url.trim(),
        source_kind: sourceKind(input.source_url),
        ongoing: true,
        entry_deadline: input.entry_deadline ?? '',
        entry_link: (input.entry_link ?? '').trim(),
      },
    })) as string;
    return { ok: true, message: 'Saved', data: { id } };
  } catch (e) {
    return entryFail(e);
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
        // a sheet link or an organiser's site page (athenstennis.gr)
        ...(patch.source_url ? { source_kind: sourceKind(patch.source_url) } : {}),
        ...(patch.entry_link !== undefined ? { entry_link: patch.entry_link.trim() } : {}),
      },
    });
    return { ok: true, message: 'Saved' };
  } catch (e) {
    return entryFail(e);
  }
}

/** «Δοκιμή τώρα» (dry) and «Τρέξε τώρα»: fetch the sheet here, parse, send the rows to the database */
const SIDES_INCOMPLETE = 'A doubles match on the sheet has one name on a side. Fix the sheet (the next update picks it up) or skip this match.';

export async function runNow(id: string, dry: boolean): Promise<ActionResult<IngestCounts>> {
  try {
    const rpc = await staffRpc();
    const t = ((await call(rpc, 'admin_tournaments', {})) as SourceTournament[]).find((x) => x.id === id);
    if (!t) return { ok: false, message: 'tournament not found' };
    const rows = await rowsForTournament(t);
    const data = (await call(rpc, 'admin_ingest_run', { p_tournament_id: id, p_rows: rows, p_dry: dry })) as IngestCounts;
    return { ok: true, message: dry ? 'Dry run, nothing saved' : 'Run saved', data };
  } catch (e) {
    if (e instanceof Error && e.message.includes('match_sides_incomplete')) return { ok: false, message: SIDES_INCOMPLETE };
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
  | { decisions: ReviewAnswer[] }
  | { winner_side: 1 | 2 }
  | { dismiss: true };

export async function resolveReview(id: string, decision: ReviewDecision): Promise<ActionResult> {
  try {
    await call(await staffRpc(), 'admin_resolve_ingest_review', { p_id: id, p: decision });
    return { ok: true, message: 'Done' };
  } catch (e) {
    if (e instanceof Error && e.message.includes('same_player_twice')) {
      return { ok: false, message: 'The same player is picked twice on this match. Give each person their own answer.' };
    }
    if (e instanceof Error && e.message.includes('match_sides_incomplete')) return { ok: false, message: SIDES_INCOMPLETE };
    if (e instanceof Error && e.message.includes('person_unresolved')) {
      return { ok: false, message: 'A place on this match has no name on the sheet. Fix the sheet (the next update picks it up) or skip this match.' };
    }
    return fail(e);
  }
}

/** «Check again»: the decisions waiting go through the name rules again (brothers, a known pair, the category) */
export async function rerunReviews(): Promise<ActionResult<{ checked: number; resolved: number; still_open: number; failed: number }>> {
  try {
    const data = (await call(await staffRpc(), 'admin_rerun_ingest_reviews', { p_tournament_id: null })) as {
      checked: number;
      resolved: number;
      still_open: number;
      failed: number;
    };
    return { ok: true, message: 'Checked', data };
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

export interface Club {
  id: string;
  name: string;
  surface: string | null;
  /** the logo in the `logos` bucket */
  logo_path?: string | null;
  matches: number;
  courts: string[];
}

/** the clubs matches are played at (a source names them); the ones without a surface first */
export async function loadClubs(): Promise<Club[]> {
  return (await call(await staffRpc(), 'admin_clubs', {})) as Club[];
}

export async function saveClub(id: string, surface: string): Promise<ActionResult> {
  try {
    await call(await staffRpc(), 'admin_save_club', { p_id: id, p_surface: surface });
    return { ok: true, message: 'Saved' };
  } catch (e) {
    return fail(e);
  }
}

/** delete a tournament with its matches and draws (admins; refused once people voted on it) */
export async function deleteTournament(id: string): Promise<ActionResult<{ matches: number }>> {
  try {
    const data = (await call(await staffRpc(), 'admin_delete_tournament', { p_id: id })) as { matches: number };
    return { ok: true, message: 'Deleted', data };
  } catch (e) {
    return fail(e);
  }
}

/** «Write records now»: mirror every tournament's matches into the records sheet (the runs do it 3 times a day) */
export async function writeRecordsNow(): Promise<RecordsResult> {
  let rpc: Rpc;
  try {
    rpc = await staffRpc();
  } catch (e) {
    return { ok: false, configured: true, message: e instanceof Error ? e.message : 'failed' };
  }
  return writeRecordsSheet(rpc);
}

/* ---------- logos (18 Oct 2026) ---------- */

const LOGO_ERRORS: Record<string, string> = {
  forbidden: 'Only staff can change logos.',
  not_found: 'It is not there any more. Reload the page.',
  bad_path: 'That file name was refused. Try again.',
};
const logoFail = (e: unknown): ActionResult<never> => {
  const m = e instanceof Error ? e.message : 'failed';
  const known = Object.keys(LOGO_ERRORS).find((k) => m.includes(k));
  return { ok: false, message: known ? LOGO_ERRORS[known]! : m };
};

type LogoRpc = (fn: 'admin_set_logo', args: { p_kind: LogoKind; p_id: string; p_path: string | null }) => Promise<{ data: unknown; error: { message: string } | null }>;

/** set or clear the logo on the row; returns the old path to remove */
async function setLogo(client: Awaited<ReturnType<typeof createV2ServerClient>>, kind: LogoKind, id: string, path: string | null): Promise<string | null> {
  const rpc = client.rpc.bind(client) as unknown as LogoRpc;
  const { data, error } = await rpc('admin_set_logo', { p_kind: kind, p_id: id, p_path: path });
  if (error) throw new Error(error.message);
  return (data as { previous?: string | null } | null)?.previous ?? null;
}

/**
 * Upload a tournament's or club's logo (form: kind, id, file), checked here again (type by its first bytes, size),
 * stored at a new path so caches never show the old one, set on the row, then the old file is removed.
 */
export async function uploadLogo(form: FormData): Promise<ActionResult<{ logo_path: string }>> {
  try {
    const kind = form.get('kind');
    const id = String(form.get('id') ?? '');
    const file = form.get('file');
    if (!isLogoKind(kind) || !/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, message: 'Nothing to put the logo on.' };
    if (!(file instanceof File)) return { ok: false, message: 'Choose an image first.' };
    const declared = logoProblem(file);
    if (declared) return { ok: false, message: declared };
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = sniffLogo(bytes);
    if (!mime) return { ok: false, message: 'Use a PNG, JPG or WebP image.' };

    const client = await createV2ServerClient();
    if (!(await getStaff(client))) throw new Error('forbidden');
    const path = logoPath(kind, id, mime, Date.now().toString(36));
    const up = await client.storage.from('logos').upload(path, bytes, { contentType: mime, cacheControl: '31536000', upsert: false });
    if (up.error) throw new Error(up.error.message);
    let previous: string | null;
    try {
      previous = await setLogo(client, kind, id, path);
    } catch (e) {
      await client.storage.from('logos').remove([path]);
      throw e;
    }
    if (previous) await client.storage.from('logos').remove([previous]);
    return { ok: true, message: 'Logo saved', data: { logo_path: path } };
  } catch (e) {
    return logoFail(e);
  }
}

/** remove a logo: the name's first letter shows in its place */
export async function removeLogo(kind: LogoKind, id: string): Promise<ActionResult> {
  try {
    if (!isLogoKind(kind)) return { ok: false, message: 'Nothing to remove.' };
    const client = await createV2ServerClient();
    if (!(await getStaff(client))) throw new Error('forbidden');
    const previous = await setLogo(client, kind, id, null);
    if (previous) await client.storage.from('logos').remove([previous]);
    return { ok: true, message: 'Logo removed' };
  } catch (e) {
    return logoFail(e);
  }
}
