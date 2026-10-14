import { describe, expect, it } from 'vitest';
import {
  CHANGES,
  CHANGES_HEADER,
  MATCH_HEADER,
  OVERVIEW,
  OVERVIEW_HEADER,
  athensTime,
  changeRows,
  lastWrittenAt,
  matchRows,
  overviewRows,
  rangeOf,
  recordsSheetId,
  sanitizeTitle,
  scoreText,
  tabTitles,
  writeRecords,
  type Cell,
  type RecordsData,
  type RecordsMatch,
  type RecordsTournament,
  type SheetsApi,
  type SheetTabInfo,
} from './records';

const tournament = (over: Partial<RecordsTournament> = {}): RecordsTournament => ({
  id: 't1',
  name: 'TAF RACE 2026-2027',
  source_kind: 'sheet',
  source_url: 'https://docs.google.com/spreadsheets/d/abc',
  venue: 'TAF',
  starts_on: '2026-10-01',
  ends_on: '2026-10-30',
  ongoing: true,
  active: true,
  last_run_at: '2026-10-14T12:00:05Z',
  matches: 2,
  results: 1,
  players: 4,
  new_players: 1,
  open_reviews: 2,
  ...over,
});

const match = (over: Partial<RecordsMatch> = {}): RecordsMatch => ({
  match_id: 'm1',
  tournament_id: 't1',
  source: 'import',
  source_ref: 'fp-1',
  tab: 'ΣΑΒ 18/10',
  row: 7,
  starts_at: '2026-10-18T15:30:00Z',
  venue: 'TAF',
  club: null,
  court: null,
  category_raw: 'ΑΝΔΡΕΣ Β',
  level: 'Β',
  discipline: 'MS',
  format: 'singles',
  round: null,
  side1: [{ id: 'p1', name: 'Βαγγέλης Καρδαμίτσης' }],
  side2: [{ id: 'p2', name: 'Γιώργος Παπαδόπουλος' }],
  status: 'confirmed',
  postponed: false,
  winner_side: 1,
  sets: [{ w: 6, l: 3 }, { w: 6, l: 7, tb: [5, 7] }, { w: 10, l: 8, stb: true }],
  sets_won: null,
  sets_lost: null,
  retired: false,
  walkover: false,
  result_source: 'sheet',
  player_logged: false,
  first_seen: '2026-10-13T05:00:01Z',
  last_updated: '2026-10-14T19:00:02Z',
  ...over,
});

describe('recordsSheetId', () => {
  it('takes a full link or a bare id', () => {
    expect(recordsSheetId('https://docs.google.com/spreadsheets/d/1AbC-dEf_123456789/edit#gid=0')).toBe('1AbC-dEf_123456789');
    expect(recordsSheetId('  1AbC-dEf_123456789 ')).toBe('1AbC-dEf_123456789');
  });
  it('is null when unset or not an id', () => {
    expect(recordsSheetId(undefined)).toBeNull();
    expect(recordsSheetId('')).toBeNull();
    expect(recordsSheetId('https://drive.google.com/drive/folders/x y')).toBeNull();
  });
});

describe('tab titles', () => {
  it('drops the characters Sheets refuses and keeps 100 characters', () => {
    expect(sanitizeTitle("  Open: A/B [2026]? *x* \\ 'q' ")).toBe("Open A B 2026 x 'q");
    expect(Array.from(sanitizeTitle('Α'.repeat(150)))).toHaveLength(100);
    expect(sanitizeTitle('///')).toBe('Tournament');
  });
  it('keeps titles unique without regard to case, in id order, and never Overview or Changes', () => {
    const titles = tabTitles([
      { id: 'b', name: 'Kifisia Open' },
      { id: 'a', name: 'kifisia open' },
      { id: 'c', name: 'Kifisia Open' },
      { id: 'd', name: 'overview' },
      { id: 'e', name: 'Changes' },
    ]);
    expect(titles.get('a')).toBe('kifisia open');
    expect(titles.get('b')).toBe('Kifisia Open (2)');
    expect(titles.get('c')).toBe('Kifisia Open (3)');
    expect(titles.get('d')).toBe('overview (2)');
    expect(titles.get('e')).toBe('Changes (2)');
  });
  it('a suffix still fits in 100 characters', () => {
    const long = 'Χ'.repeat(120);
    const titles = tabTitles([
      { id: '1', name: long },
      { id: '2', name: long },
    ]);
    const second = titles.get('2')!;
    expect(Array.from(second)).toHaveLength(100);
    expect(second.endsWith(' (2)')).toBe(true);
  });
  it('quotes a title in a range', () => {
    expect(rangeOf("Kid's Cup", 'A1')).toBe("'Kid''s Cup'!A1");
    expect(rangeOf('Overview')).toBe("'Overview'");
  });
});

describe('rows', () => {
  it('the score, winner first', () => {
    expect(scoreText(match())).toBe('6-3, 6-7(5), 10-8');
    expect(scoreText(match({ winner_side: null, sets: null }))).toBe('');
    expect(scoreText(match({ sets: [], walkover: true }))).toBe('w/o');
    expect(scoreText(match({ sets: [{ w: 6, l: 2 }, { w: 3, l: 1 }], retired: true }))).toBe('6-2, 3-1 ret.');
    expect(scoreText(match({ sets: [], sets_won: 2, sets_lost: 1 }))).toBe('2-1 sets');
  });

  it('a blank time is stored as 00:00 Athens and stays blank', () => {
    expect(athensTime('2026-10-17T21:00:00Z')).toBe('');
    expect(athensTime('2026-10-18T15:30:00Z')).toBe('18:30');
  });

  it('a match row in header order, in Athens time', () => {
    const [header, row] = matchRows(tournament(), [match()]);
    expect(header).toEqual(MATCH_HEADER);
    const at = (k: string) => row![MATCH_HEADER.indexOf(k)];
    expect(row).toHaveLength(MATCH_HEADER.length);
    expect(at('match_id')).toBe('m1');
    expect(at('tournament')).toBe('TAF RACE 2026-2027');
    expect(at('source')).toBe('sheet');
    expect(at('source_ref')).toBe('ΣΑΒ 18/10 row 7');
    expect(at('date')).toBe('2026-10-18');
    expect(at('time')).toBe('18:30');
    expect(at('venue/club')).toBe('TAF');
    expect(at('side1 names')).toBe('Βαγγέλης Καρδαμίτσης');
    expect(at('side2 player_ids')).toBe('p2');
    expect(at('score (winner first)')).toBe('6-3, 6-7(5), 10-8');
    expect(at('winner_side')).toBe(1);
    expect(at('player_logged')).toBe('');
    expect(at('first_seen')).toBe('2026-10-13 08:00');
    expect(at('last_updated')).toBe('2026-10-14 22:00');
  });

  it('doubles, a player-logged match, a postponed one, blanks where nothing is known', () => {
    const [, row] = matchRows(tournament(), [
      match({
        source: 'user',
        source_ref: null,
        tab: null,
        row: null,
        format: 'doubles',
        side1: [
          { id: 'a', name: 'Α Α' },
          { id: 'b', name: 'Β Β' },
        ],
        status: 'scheduled',
        postponed: true,
        winner_side: null,
        sets: null,
        result_source: null,
        player_logged: true,
        club: 'Κηφισιά',
        court: '3',
        category_raw: null,
      }),
    ]);
    const at = (k: string) => row![MATCH_HEADER.indexOf(k)];
    expect(at('source')).toBe('player');
    expect(at('source_ref')).toBe('');
    expect(at('side1 names')).toBe('Α Α / Β Β');
    expect(at('side1 player_ids')).toBe('a / b');
    expect(at('status')).toBe('postponed');
    expect(at('venue/club')).toBe('Κηφισιά');
    expect(at('court')).toBe('3');
    expect(at('category_raw')).toBe('');
    expect(at('winner_side')).toBe('');
    expect(at('result_source')).toBe('');
    expect(at('player_logged')).toBe('yes');
  });

  it('an overview row with its totals', () => {
    const t = tournament();
    const rows = overviewRows([t, tournament({ id: 't2', name: 'Old', ongoing: false, ends_on: '2026-01-01', players: 0, new_players: 0, last_run_at: null })], new Map([['t1', 'TAF'], ['t2', 'Old']]), '2026-10-14T19:00:00Z');
    expect(rows[0]).toEqual(OVERVIEW_HEADER);
    const at = (r: Cell[], k: string) => r[OVERVIEW_HEADER.indexOf(k)];
    expect(at(rows[1]!, 'tab')).toBe('TAF');
    expect(at(rows[1]!, 'status')).toBe('ongoing');
    expect(at(rows[1]!, 'linked names %')).toBe(75);
    expect(at(rows[1]!, 'pending decisions')).toBe(2);
    expect(at(rows[1]!, 'last run')).toBe('2026-10-14 15:00');
    expect(at(rows[2]!, 'status')).toBe('finished');
    expect(at(rows[2]!, 'linked names %')).toBe('');
    expect(at(rows[2]!, 'last run')).toBe('');
  });

  it('change rows carry the write time first', () => {
    const data = { as_of: '2026-10-14T19:00:09.123456+00:00', since: null, tournaments: [tournament()], matches: [match()], changes: [{ match_id: 'm1', kind: 'new' as const, changed_at: '2026-10-14T19:00:02Z' }, { match_id: 'gone', kind: 'updated' as const, changed_at: '2026-10-14T19:00:02Z' }] };
    const rows = changeRows(data, new Map([['t1', tournament()]]), new Map([['m1', match()]]));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveLength(CHANGES_HEADER.length);
    expect(rows[0]![0]).toBe('2026-10-14T19:00:09.123456+00:00');
    expect(rows[0]![3]).toBe('new match');
  });

  it('the last write time is the last ISO value of column A', () => {
    expect(lastWrittenAt(['written_at', '2026-10-13T05:00:00.1+00:00', '2026-10-14T19:00:09.123456+00:00', ''])).toBe('2026-10-14T19:00:09.123456+00:00');
    expect(lastWrittenAt(['written_at'])).toBeNull();
    expect(lastWrittenAt([])).toBeNull();
  });
});

/* ---------- the writer on a fake Sheets ---------- */

class FakeSheets implements SheetsApi {
  tabsList: SheetTabInfo[];
  cells = new Map<string, Cell[][]>();
  calls: string[] = [];
  private next = 100;
  constructor(tabs: SheetTabInfo[]) {
    this.tabsList = tabs;
  }
  private tabOf(range: string) {
    return range.replace(/!.*$/, '').replace(/^'|'$/g, '').replace(/''/g, "'");
  }
  async tabs() {
    this.calls.push('tabs');
    return this.tabsList.map((t) => ({ ...t }));
  }
  async readColumn(_id: string, range: string) {
    this.calls.push(`read ${range}`);
    return (this.cells.get(this.tabOf(range)) ?? []).map((r) => String(r[0] ?? ''));
  }
  async batchUpdate(_id: string, requests: object[]) {
    this.calls.push(`batchUpdate ${requests.length}`);
    for (const r of requests as { addSheet?: { properties: { title: string } }; updateSheetProperties?: { properties: { sheetId: number; title?: string } } }[]) {
      if (r.addSheet) this.tabsList.push({ sheetId: this.next++, title: r.addSheet.properties.title, rowCount: 100, columnCount: 26 });
      const u = r.updateSheetProperties?.properties;
      if (u?.title) {
        const t = this.tabsList.find((x) => x.sheetId === u.sheetId)!;
        this.cells.set(u.title, this.cells.get(t.title) ?? []);
        this.cells.delete(t.title);
        t.title = u.title;
      }
    }
  }
  async batchClear(_id: string, ranges: string[]) {
    this.calls.push(`batchClear ${ranges.length}`);
    for (const r of ranges) this.cells.set(this.tabOf(r), []);
  }
  async batchWrite(_id: string, data: { range: string; values: Cell[][] }[]) {
    this.calls.push(`batchWrite ${data.length}`);
    for (const d of data) {
      if (!this.tabsList.some((t) => t.title === this.tabOf(d.range))) throw new Error(`no tab ${d.range}`);
      this.cells.set(this.tabOf(d.range), d.values);
    }
  }
  async append(_id: string, range: string, values: Cell[][]) {
    this.calls.push(`append ${values.length}`);
    this.cells.set(this.tabOf(range), [...(this.cells.get(this.tabOf(range)) ?? []), ...values]);
  }
}

function fakeDb(data: (since: string | null) => RecordsData) {
  const seen: (string | null)[] = [];
  const rpc = async (fn: string, args: object) => {
    expect(fn).toBe('records_sheet');
    const since = (args as { p_since: string | null }).p_since;
    seen.push(since);
    return { data: data(since), error: null };
  };
  return { rpc, seen };
}

const T2 = tournament({ id: 't2', name: 'Kifisia: Open', matches: 1, results: 0 });

describe('writeRecords', () => {
  it('fills a fresh spreadsheet: its lone tab becomes Overview, one tab per tournament, Changes with a header', async () => {
    const sheets = new FakeSheets([{ sheetId: 0, title: 'Sheet1', rowCount: 1000, columnCount: 26 }]);
    const db = fakeDb(() => ({
      as_of: '2026-10-14T19:00:09.5+00:00',
      since: null,
      tournaments: [tournament(), T2],
      matches: [match(), match({ match_id: 'm2', starts_at: '2026-10-19T15:30:00Z' }), match({ match_id: 'm3', tournament_id: 't2' })],
      changes: [
        { match_id: 'm1', kind: 'new', changed_at: '2026-10-14T19:00:02Z' },
        { match_id: 'm2', kind: 'new', changed_at: '2026-10-14T19:00:02Z' },
        { match_id: 'm3', kind: 'new', changed_at: '2026-10-14T19:00:02Z' },
      ],
    }));
    const res = await writeRecords({ rpc: db.rpc, sheets, spreadsheetId: 'SHEET123456' });

    expect(res).toMatchObject({ ok: true, configured: true, tournaments: 2, matches: 3, changes: 3, tabsAdded: 3 });
    expect(res.url).toBe('https://docs.google.com/spreadsheets/d/SHEET123456/edit');
    expect(db.seen).toEqual([null]);
    expect(sheets.tabsList.map((t) => t.title)).toEqual([OVERVIEW, 'TAF RACE 2026-2027', 'Kifisia Open', CHANGES]);
    expect(sheets.cells.get(OVERVIEW)).toHaveLength(3);
    expect(sheets.cells.get('TAF RACE 2026-2027')!.map((r) => r[0])).toEqual(['match_id', 'm1', 'm2']);
    expect(sheets.cells.get('Kifisia Open')!.map((r) => r[0])).toEqual(['match_id', 'm3']);
    expect(sheets.cells.get(CHANGES)![0]).toEqual(CHANGES_HEADER);
    expect(sheets.cells.get(CHANGES)!.slice(1).map((r) => r[1])).toEqual(['m1', 'm2', 'm3']);
    // batched: tabs, one batchUpdate, one clear, one write, one append
    expect(sheets.calls).toEqual(['tabs', 'batchUpdate 4', 'batchClear 3', 'batchWrite 3', 'append 4']);
  });

  it('the next write starts after the last one, rewrites the tabs and appends only the changes', async () => {
    const sheets = new FakeSheets([{ sheetId: 0, title: 'Sheet1', rowCount: 1000, columnCount: 26 }]);
    let call = 0;
    const db = fakeDb((since) => {
      call += 1;
      return {
        as_of: call === 1 ? '2026-10-14T19:00:09.5+00:00' : '2026-10-15T05:00:03.25+00:00',
        since,
        tournaments: [tournament()],
        matches: call === 1 ? [match()] : [match({ status: 'scheduled', winner_side: null, sets: null }), match({ match_id: 'm9', starts_at: '2026-10-17T07:00:00Z' })],
        changes: call === 1 ? [{ match_id: 'm1', kind: 'new', changed_at: '2026-10-14T19:00:02Z' }] : [{ match_id: 'm9', kind: 'new', changed_at: '2026-10-15T05:00:01Z' }],
      };
    });
    await writeRecords({ rpc: db.rpc, sheets, spreadsheetId: 'SHEET123456' });
    sheets.calls = [];
    const res = await writeRecords({ rpc: db.rpc, sheets, spreadsheetId: 'SHEET123456' });

    expect(db.seen).toEqual([null, '2026-10-14T19:00:09.5+00:00']);
    expect(res.changes).toBe(1);
    expect(sheets.cells.get('TAF RACE 2026-2027')!.map((r) => r[0])).toEqual(['match_id', 'm1', 'm9']);
    const changes = sheets.cells.get(CHANGES)!;
    expect(changes.map((r) => r[1])).toEqual(['match_id', 'm1', 'm9']);
    expect(changes[2]![0]).toBe('2026-10-15T05:00:03.25+00:00');
    // nothing to add, so no batchUpdate
    expect(sheets.calls).toEqual(['tabs', "read 'Changes'!A:A", 'batchClear 2', 'batchWrite 2', 'append 1']);
  });

  it('grows a grid too small for the rows and appends nothing when nothing changed', async () => {
    const sheets = new FakeSheets([
      { sheetId: 1, title: OVERVIEW, rowCount: 1000, columnCount: 26 },
      { sheetId: 2, title: 'TAF RACE 2026-2027', rowCount: 2, columnCount: 26 },
      { sheetId: 3, title: CHANGES, rowCount: 1000, columnCount: 26 },
      { sheetId: 4, title: 'Notes', rowCount: 1000, columnCount: 26 },
    ]);
    sheets.cells.set(CHANGES, [CHANGES_HEADER, ['2026-10-14T19:00:09.5+00:00', 'm1']]);
    const requests: object[][] = [];
    const batchUpdate = sheets.batchUpdate.bind(sheets);
    sheets.batchUpdate = async (id, r) => {
      requests.push(r);
      return batchUpdate(id, r);
    };
    const db = fakeDb((since) => ({
      as_of: '2026-10-15T05:00:00+00:00',
      since,
      tournaments: [tournament()],
      matches: [match(), match({ match_id: 'm2' }), match({ match_id: 'm3' })],
      changes: [],
    }));
    const res = await writeRecords({ rpc: db.rpc, sheets, spreadsheetId: 'SHEET123456' });
    expect(res).toMatchObject({ ok: true, changes: 0, tabsAdded: 0 });
    expect(requests).toEqual([
      [{ updateSheetProperties: { properties: { sheetId: 2, gridProperties: { rowCount: 100, columnCount: 26 } }, fields: 'gridProperties.rowCount,gridProperties.columnCount' } }],
    ]);
    expect(sheets.calls.filter((c) => c.startsWith('append'))).toEqual([]);
    expect(sheets.tabsList.map((t) => t.title)).toContain('Notes');
  });

  it('a database error stops before anything is written', async () => {
    const sheets = new FakeSheets([]);
    const rpc = async () => ({ data: null, error: { message: 'forbidden' } });
    await expect(writeRecords({ rpc, sheets, spreadsheetId: 'SHEET123456' })).rejects.toThrow('forbidden');
    expect(sheets.calls).toEqual(['tabs']);
  });
});
