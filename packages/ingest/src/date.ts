import { fold } from './text';

/**
 * The day of a tab: «ΣΑΒ 18/10», «Σάββατο 18.10», «18-10». The season runs Aug to Jul: Aug to Dec belong
 * to the season's first year, Jan to Jul to the second. The Greek weekday prefix, when there is one, must
 * agree with the date (`weekdayOk` false flags a typo in the sheet).
 */
const WEEKDAYS = ['κυρ', 'δευ', 'τρι', 'τετ', 'πεμ', 'παρ', 'σαβ'];

export interface TabDate {
  /** «2026-10-18» */
  date: string;
  /** null when the tab has no weekday */
  weekdayOk: boolean | null;
}

export function dateFromTab(tab: string, seasonStartYear: number): TabDate | null {
  const m = tab.match(/(\d{1,2})\s*[./-]\s*(\d{1,2})/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const year = month >= 8 ? seasonStartYear : seasonStartYear + 1;
  const utc = Date.UTC(year, month - 1, day);
  const d = new Date(utc);
  if (d.getUTCMonth() !== month - 1) return null;
  const prefix = fold(tab.slice(0, m.index ?? 0)).replace(/[^α-ω]/g, '').slice(0, 3);
  const weekdayOk = prefix.length === 3 && WEEKDAYS.includes(prefix) ? WEEKDAYS[d.getUTCDay()] === prefix : null;
  return { date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, weekdayOk };
}
