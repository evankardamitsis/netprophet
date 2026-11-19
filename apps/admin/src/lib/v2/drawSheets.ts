import type { Draw } from '@netprophet/ingest';

/**
 * A tournament's draw sheets (founder, 19 Nov 2026: TAF keeps the doubles draws in a separate file from the singles
 * ones). The database keeps the first link in draw_url and sends the whole list as draw_urls; each draw is stored with
 * the link it came from (`sheet`), so core.ingest_draws replaces only the sheets that were read and two files may
 * use the same tab name («40+») without one draw replacing the other.
 */

/** a draw as sent to the database: with the link of the sheet it came from */
export type SheetDraw = Draw & { sheet: string };

export interface FailedSheet {
  url: string;
  error: string;
}

/** the spreadsheet id of a Google Sheets link, else the link as written (the database does the same: core.sheet_id) */
export function sheetKey(url: string): string {
  const u = url.trim();
  return /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/.exec(u)?.[1] ?? u;
}

/**
 * every draw link to read, first one first: draw_urls when the database sends it, else draw_url; blanks dropped and
 * one link per spreadsheet (a read takes the whole file, whatever tab the link points at)
 */
export function drawLinks(t: { draw_url?: string | null; draw_urls?: string[] | null }): string[] {
  const all = t.draw_urls && t.draw_urls.length > 0 ? t.draw_urls : t.draw_url ? [t.draw_url] : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of all) {
    const u = (raw ?? '').trim();
    if (!u || seen.has(sheetKey(u))) continue;
    seen.add(sheetKey(u));
    out.push(u);
  }
  return out;
}

/** the outcome of reading one draw sheet */
export type SheetRead = { url: string; draws: Draw[] } | { url: string; error: string };

/** every sheet's draws in the order of the links, each tagged with its sheet; the sheets that failed apart */
export function mergeDrawSheets(reads: SheetRead[]): {
  draws: SheetDraw[];
  failed: FailedSheet[];
} {
  const draws: SheetDraw[] = [];
  const failed: FailedSheet[] = [];
  for (const r of reads) {
    if ('error' in r) failed.push({ url: r.url, error: r.error });
    else for (const d of r.draws) draws.push({ ...d, sheet: r.url });
  }
  return { draws, failed };
}

/** read every link (one at a time, Google rate limits), never throwing for one sheet */
export async function readDrawSheets(links: string[], read: (url: string) => Promise<Draw[]>): Promise<{ draws: SheetDraw[]; failed: FailedSheet[] }> {
  const reads: SheetRead[] = [];
  for (const url of links) {
    try {
      reads.push({ url, draws: await read(url) });
    } catch (e) {
      reads.push({
        url,
        error: e instanceof Error ? e.message : 'draw read failed',
      });
    }
  }
  return mergeDrawSheets(reads);
}

/** one line for the run log and the admin: which draw sheets could not be read, and why */
export function failedSheetsMessage(failed: FailedSheet[], total: number): string {
  if (failed.length === 0) return '';
  const each = failed.map((f) => `${f.url}: ${f.error}`).join('; ');
  if (total <= 1) return failed[0]!.error;
  return `${failed.length} of ${total} draw sheets could not be read (${each})`;
}
