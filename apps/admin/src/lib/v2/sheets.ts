import { createSign } from 'node:crypto';
import { levelFromDraws, parseAthensTennis, parseDraws, parseSheet, type Draw } from '@netprophet/ingest';
import { runRows } from './ingestRows';

/**
 * Reads an organiser's Google Sheet with the Sheets API v4. Two ways in, server only:
 * - GOOGLE_SERVICE_ACCOUNT_JSON (preferred): NetProphet's service account; organisers share the sheet with its email
 *   like with a person, so private sheets work too (the match data brief's "NetProphet Google account").
 * - GOOGLE_SHEETS_API_KEY: only for sheets shared with anyone who has the link.
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

const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64url');

let cached: { token: string; until: number } | null = null;

/**
 * an OAuth access token for the service account (JWT bearer grant), reused for an hour. One scope for everything: the
 * full Sheets scope, because the records sheet is written; organisers' sheets stay read-only through their sharing
 * (Viewer), not through the scope.
 */
async function serviceToken(json: string): Promise<string> {
  if (cached && cached.until > Date.now() + 60_000) return cached.token;
  let sa: { client_email?: string; private_key?: string };
  try {
    sa = JSON.parse(json) as { client_email?: string; private_key?: string };
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON');
  }
  if (!sa.client_email || !sa.private_key) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON has no client_email or private_key');
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
  const signature = createSign('RSA-SHA256').update(`${head}.${claim}`).sign(sa.private_key.replace(/\\n/g, '\n'));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claim}.${b64url(signature)}` }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Google sign-in for the service account failed (${res.status})`);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: body.access_token, until: Date.now() + body.expires_in * 1000 };
  return body.access_token;
}

/** the service account as a bearer token, for writing (an API key cannot write); null when it is not set */
export async function serviceAccess(): Promise<{ headers: Record<string, string>; email: string } | null> {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!json) return null;
  let email = 'the service account';
  try {
    email = (JSON.parse(json) as { client_email?: string }).client_email ?? email;
  } catch {
    // serviceToken says what is wrong with it
  }
  return { headers: { authorization: `Bearer ${await serviceToken(json)}` }, email };
}

/** how this server reads sheets: a bearer token (service account) or an API key query parameter */
async function access(): Promise<{ headers: Record<string, string>; query: string; who: string }> {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (json) {
    const email = (JSON.parse(json) as { client_email?: string }).client_email ?? 'the service account';
    return { headers: { authorization: `Bearer ${await serviceToken(json)}` }, query: '', who: email };
  }
  const key = process.env.GOOGLE_SHEETS_API_KEY;
  if (key) return { headers: {}, query: `key=${encodeURIComponent(key)}`, who: 'anyone who has the link' };
  throw new Error('neither GOOGLE_SERVICE_ACCOUNT_JSON nor GOOGLE_SHEETS_API_KEY is set');
}

async function getJson(url: string, a: { headers: Record<string, string>; query: string; who: string }): Promise<unknown> {
  const res = await fetch(a.query ? `${url}${url.includes('?') ? '&' : '?'}${a.query}` : url, { headers: a.headers, cache: 'no-store' });
  if (res.ok) return res.json();
  if (res.status === 403 || res.status === 404) throw new Error(`the sheet is not shared with ${a.who}`);
  let detail = '';
  try {
    detail = ((await res.json()) as { error?: { message?: string } }).error?.message ?? '';
  } catch {
    // no body
  }
  throw new Error(`Google Sheets answered ${res.status}${detail ? `: ${detail}` : ''}`);
}

export async function fetchSheetTabs(url: string): Promise<SheetTab[]> {
  const a = await access();
  const id = spreadsheetId(url);
  const meta = (await getJson(`${API}/${id}?fields=sheets.properties.title`, a)) as {
    sheets?: { properties: { title: string } }[];
  };
  const titles = (meta.sheets ?? []).map((s) => s.properties.title);
  if (titles.length === 0) return [];
  const ranges = titles.map((t) => `ranges=${encodeURIComponent(`'${t.replace(/'/g, "''")}'`)}`).join('&');
  const data = (await getJson(`${API}/${id}/values:batchGet?${ranges}&valueRenderOption=FORMATTED_VALUE`, a)) as {
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

/**
 * fetch, parse and build the rows of one tournament's run (people unresolved, walkovers queued for staff). With a draw
 * sheet, a doubles row the organiser labelled as singles takes its category from the draw that lists the pair
 * (levelFromDraws); pass `draws` when they are already read, else they are read here (a draw sheet that cannot be read
 * leaves the rows as the schedule says).
 */
export async function rowsForTournament(
  t: { source_url: string | null; draw_url?: string | null; season_start_year: number | null },
  draws?: Draw[] | null,
) {
  if (!t.source_url) throw new Error('this tournament has no source URL');
  if (isAthensTennis(t.source_url)) return runRows(parseAthensTennis(await fetchSite(t.source_url)));
  const tabs = await fetchSheetTabs(t.source_url);
  let known = draws ?? null;
  if (!known && t.draw_url) known = await drawsForTournament({ draw_url: t.draw_url, season_start_year: t.season_start_year }).catch(() => null);
  const matches = parseSheet(tabs, season(t));
  return runRows(known ? levelFromDraws(matches, known) : matches);
}

/** fetch and parse one tournament's draw sheet (one bracket per category tab) */
export async function drawsForTournament(t: { draw_url: string | null; season_start_year: number | null }) {
  if (!t.draw_url) throw new Error('this tournament has no draw sheet');
  return parseDraws(await fetchSheetTabs(t.draw_url), season(t));
}

/** athenstennis.gr's schedule page (the league's next days and the season's results), founder 14 Oct */
export function isAthensTennis(url: string): boolean {
  return /^https?:\/\/(www\.)?athenstennis\.gr\//i.test(url.trim());
}

/** the source kind a link means: an organiser's site page, else a Google Sheet */
export function sourceKind(url: string): 'site' | 'sheet' {
  return isAthensTennis(url) ? 'site' : 'sheet';
}

async function fetchSite(url: string): Promise<string> {
  const res = await fetch(url.trim(), { headers: { 'user-agent': 'NetProphet/2 (+https://netprophetapp.com)', accept: 'text/html' }, cache: 'no-store' });
  if (!res.ok) throw new Error(`the page answered ${res.status}`);
  return res.text();
}
