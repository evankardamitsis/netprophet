/**
 * Store downloads for the Numbers desk (founder, 25 Nov 2026): reading Apple's daily sales summary and Play's monthly
 * install overview. Pure functions only; the fetching lives in storeFetch.ts.
 */

/** Apple product types that are a first-time download of the app (iPhone, universal, iPad, Mac); updates, re-downloads and in-app purchases are not */
const APPLE_DOWNLOAD_TYPES = new Set(['1', '1F', '1T', 'F1']);

/** first-time downloads in one of Apple's daily SALES / SUMMARY reports (tab separated, header first) */
export function appleDownloads(tsv: string): number {
  const lines = tsv.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) return 0;
  const head = lines[0].split('\t');
  const type = head.indexOf('Product Type Identifier');
  const units = head.indexOf('Units');
  if (type < 0 || units < 0) throw new Error('Apple report without Product Type Identifier or Units');
  let n = 0;
  for (const line of lines.slice(1)) {
    const cells = line.split('\t');
    if (APPLE_DOWNLOAD_TYPES.has(cells[type]?.trim())) n += Math.max(0, Number(cells[units]) || 0);
  }
  return n;
}

/** Play's report files are UTF-16 with a byte order mark; older ones are UTF-8 */
export function decodeReport(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  return new TextDecoder('utf-8').decode(bytes).replace(/^﻿/, '');
}

/** one CSV line, with quoted cells */
function csvCells(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export interface StoreDay {
  day: string;
  downloads: number;
}

/** the days in a Play installs overview CSV: «Daily User Installs» is first-time installs per person, like Apple's downloads */
export function playDownloads(csv: string): StoreDay[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) return [];
  const head = csvCells(lines[0]);
  const date = head.indexOf('Date');
  const users = head.indexOf('Daily User Installs');
  if (date < 0 || users < 0) throw new Error('Play report without Date or Daily User Installs');
  const out: StoreDay[] = [];
  for (const line of lines.slice(1)) {
    const cells = csvCells(line);
    const day = cells[date];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    out.push({ day, downloads: Math.max(0, Number(cells[users]) || 0) });
  }
  return out;
}

/** «2026-11-23» for a date in UTC */
export const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/**
 * The Apple days to ask for: every day from `from` to `to` not stored yet, plus the last `refresh` days again (a late
 * report can still change), oldest first and at most `max` of them so one run stays short.
 */
export function appleDaysToFetch(have: ReadonlySet<string>, from: string, to: string, refresh = 3, max = 40): string[] {
  const days: string[] = [];
  const end = new Date(`${to}T00:00:00Z`);
  for (let d = new Date(`${from}T00:00:00Z`); d <= end; d.setUTCDate(d.getUTCDate() + 1)) days.push(isoDay(d));
  const recent = new Set(days.slice(-refresh));
  return days.filter((d) => !have.has(d) || recent.has(d)).slice(0, max);
}

/** «202611» for this month and the one before: Play keeps one installs file per month */
export function playMonths(today: string): string[] {
  const [y, m] = today.split('-').map(Number);
  const prev = m === 1 ? [y - 1, 12] : [y, m - 1];
  return [`${prev[0]}${String(prev[1]).padStart(2, '0')}`, `${y}${String(m).padStart(2, '0')}`];
}
