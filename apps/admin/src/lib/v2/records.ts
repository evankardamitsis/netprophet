import { formatWinnerSets, type WinnerFirstSet } from '@netprophet/core';

/**
 * The records sheet (match-data-automation.md, "Records sheet"): after every run the database's tournament matches are
 * mirrored into one Google Sheet the founder owns and shares with the service account as Editor.
 * - "Overview": one row per tournament with its totals, rewritten in full.
 * - one tab per tournament, one row per match (start time, then match id), rewritten in full.
 * - "Changes": append-only, one row per match changed since the last write. Column A holds the database time of the
 *   write (as_of), so the last row says where the next write starts; the sheet is never diffed.
 * Pure building plus a writer that talks to Sheets through `SheetsApi`, so tests run on a fake with no network.
 */

export const OVERVIEW = 'Overview';
export const CHANGES = 'Changes';
const MAX_TITLE = 100;

export interface RecordsPlayer {
  id: string;
  name: string;
}

export interface RecordsMatch {
  match_id: string;
  tournament_id: string;
  source: string;
  source_ref: string | null;
  tab: string | null;
  row: number | string | null;
  starts_at: string | null;
  venue: string | null;
  club: string | null;
  court: string | null;
  category_raw: string | null;
  level: string | null;
  discipline: string | null;
  format: string;
  round: string | null;
  side1: RecordsPlayer[];
  side2: RecordsPlayer[];
  status: string;
  postponed: boolean;
  winner_side: 1 | 2 | null;
  sets: WinnerFirstSet[] | null;
  sets_won: number | null;
  sets_lost: number | null;
  retired: boolean | null;
  walkover: boolean | null;
  result_source: string | null;
  player_logged: boolean;
  first_seen: string;
  last_updated: string;
}

export interface RecordsTournament {
  id: string;
  name: string;
  source_kind: string | null;
  source_url: string | null;
  venue: string | null;
  starts_on: string | null;
  ends_on: string | null;
  ongoing: boolean;
  active: boolean;
  last_run_at: string | null;
  matches: number;
  results: number;
  players: number;
  new_players: number;
  open_reviews: number;
}

export interface RecordsChange {
  match_id: string;
  kind: 'new' | 'updated';
  changed_at: string;
}

/** api.records_sheet */
export interface RecordsData {
  as_of: string;
  since: string | null;
  tournaments: RecordsTournament[];
  matches: RecordsMatch[];
  changes: RecordsChange[];
}

export type Cell = string | number;

/** RECORDS_SHEET_ID as the founder pastes it: the sheet's full link or its bare id; null when unset or not an id */
export function recordsSheetId(value: string | undefined | null): string | null {
  const v = (value ?? '').trim();
  if (!v) return null;
  const m = /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/.exec(v);
  if (m) return m[1]!;
  return /^[a-zA-Z0-9_-]{10,}$/.test(v) ? v : null;
}

export const sheetUrl = (id: string) => `https://docs.google.com/spreadsheets/d/${id}/edit`;

/** a tab title Google Sheets accepts: no : \ / ? * [ ], no quote at either end, one line, at most 100 characters */
export function sanitizeTitle(name: string): string {
  const clean = name
    .replace(/[:\\/?*[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^'+|'+$/g, '')
    .trim();
  const chars = Array.from(clean || 'Tournament');
  return chars.slice(0, MAX_TITLE).join('').trim();
}

/**
 * Each tournament's tab title: its name, sanitised, unique without regard to case, never "Overview" or "Changes".
 * Same names get « (2)», « (3)» in id order, so a tournament keeps its tab from one run to the next.
 */
export function tabTitles(tournaments: { id: string; name: string }[]): Map<string, string> {
  const taken = new Set([OVERVIEW.toLowerCase(), CHANGES.toLowerCase()]);
  const out = new Map<string, string>();
  for (const t of [...tournaments].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    const base = sanitizeTitle(t.name);
    let title = base;
    for (let n = 2; taken.has(title.toLowerCase()); n += 1) {
      const suffix = ` (${n})`;
      title = Array.from(base).slice(0, MAX_TITLE - suffix.length).join('').trimEnd() + suffix;
    }
    taken.add(title.toLowerCase());
    out.set(t.id, title);
  }
  return out;
}

/** a range on a tab: the title quoted, quotes doubled; without cells, the whole tab */
export const rangeOf = (title: string, cells?: string) => `'${title.replace(/'/g, "''")}'${cells ? `!${cells}` : ''}`;

/* ---------- Athens time ---------- */

const parts = (iso: string) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  ) as Record<string, string>;
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
};
/** the match day in Athens */
export const athensDate = (iso: string | null) => (iso ? parts(iso).date : '');
/** the start time in Athens; blank at 00:00, which is how a sheet row with no time is stored */
export const athensTime = (iso: string | null) => {
  if (!iso) return '';
  const t = parts(iso).time;
  return t === '00:00' ? '' : t;
};
/** a moment as «2026-10-14 15:02» in Athens */
export const athensStamp = (iso: string | null) => (iso ? `${parts(iso).date} ${parts(iso).time}` : '');

/* ---------- rows ---------- */

export const OVERVIEW_HEADER = [
  'tournament', 'tab', 'source', 'source_url', 'venue/club', 'starts_on', 'ends_on', 'status',
  'matches', 'results', 'players', 'linked names %', 'new players', 'pending decisions', 'last run', 'tournament_id',
];

export const MATCH_HEADER = [
  'match_id', 'tournament', 'source', 'source_ref', 'date', 'time', 'venue/club', 'court', 'category_raw', 'level',
  'format', 'round', 'side1 names', 'side1 player_ids', 'side2 names', 'side2 player_ids', 'score (winner first)',
  'winner_side', 'status', 'result_source', 'player_logged', 'first_seen', 'last_updated',
];

export const CHANGES_HEADER = [
  'written_at', 'match_id', 'tournament', 'change', 'date', 'time', 'side1 names', 'side2 names', 'status', 'score (winner first)', 'changed_at',
];

function tournamentStatus(t: RecordsTournament, today: string): string {
  if (t.ongoing) return 'ongoing';
  if (t.ends_on && t.ends_on < today) return 'finished';
  return 'paused';
}

export function overviewRows(tournaments: RecordsTournament[], titles: Map<string, string>, asOf: string): Cell[][] {
  const today = athensDate(asOf);
  return [
    OVERVIEW_HEADER,
    ...tournaments.map((t) => [
      t.name,
      titles.get(t.id) ?? '',
      t.source_kind ?? '',
      t.source_url ?? '',
      t.venue ?? '',
      t.starts_on ?? '',
      t.ends_on ?? '',
      tournamentStatus(t, today),
      t.matches,
      t.results,
      t.players,
      t.players > 0 ? Math.round(((t.players - t.new_players) / t.players) * 100) : '',
      t.new_players,
      t.open_reviews,
      athensStamp(t.last_run_at),
      t.id,
    ]),
  ];
}

const names = (side: RecordsPlayer[]) => side.map((p) => p.name).join(' / ');
const ids = (side: RecordsPlayer[]) => side.map((p) => p.id).join(' / ');

/** the score as the scoreboard writes it, winner first; sets only when a player logged no games */
export function scoreText(m: Pick<RecordsMatch, 'winner_side' | 'sets' | 'sets_won' | 'sets_lost' | 'retired' | 'walkover'>): string {
  if (m.winner_side == null) return '';
  if ((!m.sets || m.sets.length === 0) && !m.walkover && m.sets_won != null) return `${m.sets_won}-${m.sets_lost ?? 0} sets`;
  return formatWinnerSets(m.sets ?? [], { retired: m.retired ?? false, walkover: m.walkover ?? false }, { retired: 'ret.', walkover: 'w/o' });
}

const sourceWord = (m: RecordsMatch, t: RecordsTournament | undefined) =>
  m.source === 'import' ? (t?.source_kind ?? 'import') : m.source === 'user' ? 'player' : m.source;
const sourceRef = (m: RecordsMatch) => (m.tab ? `${m.tab}${m.row != null && m.row !== '' ? ` row ${m.row}` : ''}` : (m.source_ref ?? ''));
const statusWord = (m: RecordsMatch) => (m.postponed && !['void', 'cancelled'].includes(m.status) ? 'postponed' : m.status);

/** one tournament's tab: the header, then its matches by start time and id (the order the database gives) */
export function matchRows(t: RecordsTournament, matches: RecordsMatch[]): Cell[][] {
  return [
    MATCH_HEADER,
    ...matches.map((m) => [
      m.match_id,
      t.name,
      sourceWord(m, t),
      sourceRef(m),
      athensDate(m.starts_at),
      athensTime(m.starts_at),
      m.club ?? m.venue ?? '',
      m.court ?? '',
      m.category_raw ?? '',
      m.level ?? '',
      m.format,
      m.round ?? '',
      names(m.side1),
      ids(m.side1),
      names(m.side2),
      ids(m.side2),
      scoreText(m),
      m.winner_side ?? '',
      statusWord(m),
      m.result_source ?? '',
      m.player_logged ? 'yes' : '',
      athensStamp(m.first_seen),
      athensStamp(m.last_updated),
    ]),
  ];
}

/** the Changes rows of this write; column A is the write's database time */
export function changeRows(data: RecordsData, tournaments: Map<string, RecordsTournament>, matches: Map<string, RecordsMatch>): Cell[][] {
  const out: Cell[][] = [];
  for (const c of data.changes) {
    const m = matches.get(c.match_id);
    if (!m) continue;
    out.push([
      data.as_of,
      m.match_id,
      tournaments.get(m.tournament_id)?.name ?? '',
      c.kind === 'new' ? 'new match' : 'updated',
      athensDate(m.starts_at),
      athensTime(m.starts_at),
      names(m.side1),
      names(m.side2),
      statusWord(m),
      scoreText(m),
      athensStamp(c.changed_at),
    ]);
  }
  return out;
}

/* ---------- the writer ---------- */

export interface SheetTabInfo {
  sheetId: number;
  title: string;
  rowCount: number;
  columnCount: number;
}

/** the few Sheets API v4 calls the writer makes; values are always written RAW (no «6-4» turning into a date) */
export interface SheetsApi {
  tabs(spreadsheetId: string): Promise<SheetTabInfo[]>;
  /** column A of a tab, top to bottom */
  readColumn(spreadsheetId: string, range: string): Promise<string[]>;
  batchUpdate(spreadsheetId: string, requests: object[]): Promise<void>;
  batchClear(spreadsheetId: string, ranges: string[]): Promise<void>;
  batchWrite(spreadsheetId: string, data: { range: string; values: Cell[][] }[]): Promise<void>;
  append(spreadsheetId: string, range: string, values: Cell[][]): Promise<void>;
}

export type Rpc = (fn: string, args: object) => Promise<{ data: unknown; error: { message: string } | null }>;

export interface RecordsResult {
  ok: boolean;
  configured: boolean;
  message: string;
  url?: string;
  tournaments?: number;
  matches?: number;
  changes?: number;
  tabsAdded?: number;
}

export const NOT_CONFIGURED =
  'Not configured: share the «NetProphet Records» sheet with netprophet-sheets@netprophet-466714.iam.gserviceaccount.com as Editor and set RECORDS_SHEET_ID.';

/** the last write's database time: the last ISO value in Changes column A (the header and blanks skipped) */
export function lastWrittenAt(column: string[]): string | null {
  for (let i = column.length - 1; i >= 0; i -= 1) {
    const v = (column[i] ?? '').trim();
    if (v && /^\d{4}-\d{2}-\d{2}T/.test(v) && !Number.isNaN(Date.parse(v))) return v;
  }
  return null;
}

const DEFAULT_COLS = 26;

/**
 * One write, about six requests whatever the number of tournaments: read the tabs, read Changes column A, the
 * database read, one batchUpdate (add missing tabs, grow small grids), one batchClear, one values batchUpdate, one
 * append. A fresh spreadsheet's only tab becomes Overview.
 */
export async function writeRecords({ rpc, sheets, spreadsheetId }: { rpc: Rpc; sheets: SheetsApi; spreadsheetId: string }): Promise<RecordsResult> {
  const url = sheetUrl(spreadsheetId);
  const existing = await sheets.tabs(spreadsheetId);
  const byTitle = new Map(existing.map((s) => [s.title.toLowerCase(), s]));

  const since = byTitle.has(CHANGES.toLowerCase()) ? lastWrittenAt(await sheets.readColumn(spreadsheetId, rangeOf(byTitle.get(CHANGES.toLowerCase())!.title, 'A:A'))) : null;

  const res = await rpc('records_sheet', { p_since: since });
  if (res.error) throw new Error(res.error.message);
  const data = res.data as RecordsData;

  const titles = tabTitles(data.tournaments);
  const tournamentsById = new Map(data.tournaments.map((t) => [t.id, t]));
  const matchesById = new Map(data.matches.map((m) => [m.match_id, m]));
  const perTournament = new Map<string, RecordsMatch[]>();
  for (const m of data.matches) {
    if (!tournamentsById.has(m.tournament_id)) continue;
    const list = perTournament.get(m.tournament_id) ?? [];
    list.push(m);
    perTournament.set(m.tournament_id, list);
  }

  // every tab rewritten in full this time, with its rows
  const full: { title: string; values: Cell[][] }[] = [
    { title: OVERVIEW, values: overviewRows(data.tournaments, titles, data.as_of) },
    ...data.tournaments.map((t) => ({ title: titles.get(t.id)!, values: matchRows(t, perTournament.get(t.id) ?? []) })),
  ];
  const changes = changeRows(data, tournamentsById, matchesById);

  // tabs to add, grids to grow, and a fresh spreadsheet's lone tab renamed to Overview
  const requests: object[] = [];
  let renamed: SheetTabInfo | null = null;
  const ours = new Set([...full.map((f) => f.title.toLowerCase()), CHANGES.toLowerCase()]);
  if (existing.length === 1 && !ours.has(existing[0]!.title.toLowerCase())) {
    renamed = existing[0]!;
    requests.push({ updateSheetProperties: { properties: { sheetId: renamed.sheetId, title: OVERVIEW }, fields: 'title' } });
  }
  let tabsAdded = 0;
  const need = [...full, { title: CHANGES, values: [CHANGES_HEADER] }];
  for (const f of need) {
    const rows = Math.max(f.values.length + 1, 100);
    const cols = Math.max(f.values[0]?.length ?? 1, DEFAULT_COLS);
    const have = f.title === OVERVIEW && renamed ? renamed : byTitle.get(f.title.toLowerCase());
    if (!have) {
      tabsAdded += 1;
      requests.push({ addSheet: { properties: { title: f.title, gridProperties: { rowCount: rows, columnCount: cols, frozenRowCount: 1 } } } });
    } else if (f.title !== CHANGES && (have.rowCount < f.values.length || have.columnCount < (f.values[0]?.length ?? 1))) {
      requests.push({
        updateSheetProperties: {
          properties: { sheetId: have.sheetId, gridProperties: { rowCount: Math.max(have.rowCount, rows), columnCount: Math.max(have.columnCount, cols) } },
          fields: 'gridProperties.rowCount,gridProperties.columnCount',
        },
      });
    }
  }
  if (requests.length) await sheets.batchUpdate(spreadsheetId, requests);

  // a tab's real title (an existing tab may differ in case)
  const actual = (title: string) => (title === OVERVIEW && renamed ? OVERVIEW : (byTitle.get(title.toLowerCase())?.title ?? title));
  await sheets.batchClear(spreadsheetId, full.map((f) => rangeOf(actual(f.title))));
  await sheets.batchWrite(spreadsheetId, full.map((f) => ({ range: rangeOf(actual(f.title), 'A1'), values: f.values })));

  // Changes last: once these rows are in, the next write starts after this one
  const changesTab = actual(CHANGES);
  const fresh = !byTitle.has(CHANGES.toLowerCase());
  const header = fresh || since === null ? await headerNeeded(sheets, spreadsheetId, changesTab, fresh) : false;
  if (changes.length || header) await sheets.append(spreadsheetId, rangeOf(changesTab, 'A1'), header ? [CHANGES_HEADER, ...changes] : changes);

  return {
    ok: true,
    configured: true,
    message: `Wrote ${data.tournaments.length} tournaments, ${data.matches.length} matches and ${changes.length} changes.`,
    url,
    tournaments: data.tournaments.length,
    matches: data.matches.length,
    changes: changes.length,
    tabsAdded,
  };
}

/** Changes gets its header once: when the tab is new, or exists but is still empty */
async function headerNeeded(sheets: SheetsApi, id: string, tab: string, fresh: boolean): Promise<boolean> {
  if (fresh) return true;
  const col = await sheets.readColumn(id, rangeOf(tab, 'A1:A1'));
  return (col[0] ?? '').trim() === '';
}
