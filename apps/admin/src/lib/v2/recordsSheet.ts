import { NOT_CONFIGURED, recordsSheetId, sheetUrl, writeRecords, type Cell, type RecordsResult, type Rpc, type SheetsApi, type SheetTabInfo } from './records';
import { serviceAccess } from './sheets';

/**
 * The records sheet on the real Sheets API v4, as NetProphet's service account. The founder owns the spreadsheet
 * (a service account has no Drive storage, so it never creates one) and shares it with the account as Editor;
 * RECORDS_SHEET_ID holds its link or id. Server only.
 */

const API = 'https://sheets.googleapis.com/v4/spreadsheets';

export function googleSheetsApi(headers: Record<string, string>, email: string): SheetsApi {
  const call = async (url: string, init?: { method: string; body: unknown }): Promise<unknown> => {
    const res = await fetch(url, {
      method: init?.method ?? 'GET',
      headers: { ...headers, ...(init ? { 'content-type': 'application/json' } : {}) },
      body: init ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
    });
    if (res.ok) return res.json();
    if (res.status === 403 || res.status === 404) throw new Error(`the records sheet is not shared with ${email} as Editor (or RECORDS_SHEET_ID is wrong)`);
    let detail = '';
    try {
      detail = ((await res.json()) as { error?: { message?: string } }).error?.message ?? '';
    } catch {
      // no body
    }
    throw new Error(`Google Sheets answered ${res.status}${detail ? `: ${detail}` : ''}`);
  };
  return {
    async tabs(id) {
      const meta = (await call(`${API}/${id}?fields=sheets.properties(sheetId,title,gridProperties(rowCount,columnCount))`)) as {
        sheets?: { properties: { sheetId: number; title: string; gridProperties?: { rowCount?: number; columnCount?: number } } }[];
      };
      return (meta.sheets ?? []).map(
        (s): SheetTabInfo => ({
          sheetId: s.properties.sheetId,
          title: s.properties.title,
          rowCount: s.properties.gridProperties?.rowCount ?? 0,
          columnCount: s.properties.gridProperties?.columnCount ?? 0,
        }),
      );
    },
    async readColumn(id, range) {
      const body = (await call(`${API}/${id}/values/${encodeURIComponent(range)}?majorDimension=COLUMNS&valueRenderOption=FORMATTED_VALUE`)) as {
        values?: unknown[][];
      };
      return (body.values?.[0] ?? []).map((c) => (c == null ? '' : String(c)));
    },
    async batchUpdate(id, requests) {
      await call(`${API}/${id}:batchUpdate`, { method: 'POST', body: { requests } });
    },
    async batchClear(id, ranges) {
      await call(`${API}/${id}/values:batchClear`, { method: 'POST', body: { ranges } });
    },
    async batchWrite(id, data: { range: string; values: Cell[][] }[]) {
      await call(`${API}/${id}/values:batchUpdate`, { method: 'POST', body: { valueInputOption: 'RAW', data } });
    },
    async append(id, range, values) {
      await call(`${API}/${id}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
        method: 'POST',
        body: { values },
      });
    },
  };
}

/**
 * Write the records sheet now. Never throws: an unset RECORDS_SHEET_ID (or no service account) is "not configured",
 * anything else comes back as the problem in words, so a caller (the 3-a-day run) never fails because of it.
 */
export async function writeRecordsSheet(rpc: Rpc): Promise<RecordsResult> {
  const id = recordsSheetId(process.env.RECORDS_SHEET_ID);
  if (!id) {
    const set = (process.env.RECORDS_SHEET_ID ?? '').trim() !== '';
    return { ok: false, configured: false, message: set ? 'RECORDS_SHEET_ID is not a Google Sheets link or id.' : NOT_CONFIGURED };
  }
  try {
    const access = await serviceAccess();
    if (!access) return { ok: false, configured: false, message: 'Not configured: GOOGLE_SERVICE_ACCOUNT_JSON is not set, so the sheet cannot be written.', url: sheetUrl(id) };
    return await writeRecords({ rpc, sheets: googleSheetsApi(access.headers, access.email), spreadsheetId: id });
  } catch (e) {
    return { ok: false, configured: true, message: e instanceof Error ? e.message : 'the records sheet could not be written', url: sheetUrl(id) };
  }
}
