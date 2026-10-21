import type { Copy } from '@netprophet/copy';
import { fmt } from './votes';
import { SHARE_URL } from './ballerShare';
import { dayLong, type ScheduleRow, type ScheduleSide } from './tournaments';

/** the picture is 2:3 and fits this many matches; a longer day ends in «+N ακόμα» */
export const SHARE_MAX_ROWS = 9;
export const SCHEDULE_RATIO = 560 / 360;

/** a side, short: «Ροδίτης Ν.» or «Ροδίτης Ν. & Δεσύπρης Γ.»; «–» when nobody is named (minors and hidden players never are) */
export function sideName(side: ScheduleSide, dash: string): string {
  if (side.people.length === 0) return dash;
  return side.people.map((p) => `${p.surname} ${[...p.first.trim()][0] ?? ''}.`).join(' & ');
}

export interface ShareRow {
  id: string;
  time: string;
  /** «Court 1 PRC · PRC (Μαρούσι)» */
  place: string;
  /** «Μ 40+ · Απλό» */
  meta: string;
  a: string;
  b: string;
}

export interface ShareView {
  rows: ShareRow[];
  /** matches that did not fit */
  more: number;
}

const NOBODY: ScheduleSide = { people: [], winner: false };

/** what fits on the picture: the first matches of the day, by time, and how many are left out */
export function shareView(rows: ScheduleRow[], dash: string, max: number = SHARE_MAX_ROWS): ShareView {
  const shown = rows.slice(0, max).map((r) => ({
    id: r.id,
    time: r.time,
    place: r.place ?? '',
    meta: r.meta,
    a: sideName(r.sides[0] ?? NOBODY, dash),
    b: sideName(r.sides[1] ?? NOBODY, dash),
  }));
  return { rows: shown, more: Math.max(0, rows.length - shown.length) };
}

/** the words that travel with the picture (and go alone on the web) */
export function scheduleMessage(t: Copy, name: string, day: string): string {
  return fmt(t.tournaments.detail.share.message, { name, day: dayLong(day, t), url: SHARE_URL });
}
