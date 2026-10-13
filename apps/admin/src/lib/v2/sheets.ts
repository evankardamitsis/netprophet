import { parseSheet } from '@netprophet/ingest';
import { runRows } from './ingestRows';

/**
 * Reads an organiser's Google Sheet with the Sheets API v4 and an API key (the sheet must be shared with anyone
 * who has the link). Server only: GOOGLE_SHEETS_API_KEY never reaches a client.
 */
export interface SheetTab {
  name: string;
  rows: string[][];
}

const API = 'https://sheets.googleapis.com/v4/spreadsheets';

export function spreadsheetId(url: string): string {
  const m = /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/.exec(url);
  if (!m) throw new Error('the source URL is not a Google Sheets link (docs.google.com/spreadsheets/d/...)');
  return m[1];
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: 'no-store' });
  if (res.ok) return res.json();
  if (res.status === 403 || res.status === 404) throw new Error('the sheet is not shared with anyone who has the link');
  let detail = '';
  try {
    detail = ((await res.json()) as { error?: { message?: string } }).error?.message ?? '';
  } catch {
    // no body
  }
  throw new Error(`Google Sheets answered ${res.status}${detail ? `: ${detail}` : ''}`);
}

export async function fetchSheetTabs(url: string): Promise<SheetTab[]> {
  const key = process.env.GOOGLE_SHEETS_API_KEY;
  if (!key) throw new Error('GOOGLE_SHEETS_API_KEY is not set');
  const id = spreadsheetId(url);
  const meta = (await getJson(`${API}/${id}?fields=sheets.properties.title&key=${encodeURIComponent(key)}`)) as {
    sheets?: { properties: { title: string } }[];
  };
  const titles = (meta.sheets ?? []).map((s) => s.properties.title);
  if (titles.length === 0) return [];
  const ranges = titles.map((t) => `ranges=${encodeURIComponent(`'${t.replace(/'/g, "''")}'`)}`).join('&');
  const data = (await getJson(`${API}/${id}/values:batchGet?${ranges}&valueRenderOption=FORMATTED_VALUE&key=${encodeURIComponent(key)}`)) as {
    valueRanges?: { values?: unknown[][] }[];
  };
  return titles.map((name, i) => ({
    name,
    rows: (data.valueRanges?.[i]?.values ?? []).map((r) => r.map((c) => (c == null ? '' : String(c)))),
  }));
}

/** the season a tournament's tab dates belong to: its own start year, else this season (starts in August) */
export function season(t: { season_start_year: number | null }, now: Date = new Date()): number {
  if (t.season_start_year) return t.season_start_year;
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
}

/** fetch, parse and build the rows of one tournament's run (people unresolved, walkovers queued for staff) */
export async function rowsForTournament(t: { source_url: string | null; season_start_year: number | null }) {
  if (!t.source_url) throw new Error('this tournament has no source URL');
  const tabs = await fetchSheetTabs(t.source_url);
  return runRows(parseSheet(tabs, season(t)));
}
