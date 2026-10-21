import type { Copy } from '@netprophet/copy';
import { fmt } from './votes';
import { SHARE_URL } from './ballerShare';
import { dayLong, type ScheduleRow, type ScheduleSide } from './tournaments';

export const SCHEDULE_RATIO = 560 / 360;

/** A person, short: «Ροδίτης Ν.»; just the surname when there is no first name (no stray dot or space) */
export function shortName(p: { first: string; surname: string }): string {
  const surname = p.surname.trim();
  const initial = [...p.first.trim()][0];
  return initial ? `${surname} ${initial}.` : surname;
}

/** a side, short: «Ροδίτης Ν.» or «Ροδίτης Ν. & Δεσύπρης Γ.»; «–» when nobody is named (minors and hidden players never are) */
export function sideName(side: ScheduleSide, dash: string): string {
  if (side.people.length === 0) return dash;
  return side.people.map(shortName).join(' & ');
}

export interface ShareRow {
  id: string;
  time: string;
  /** «Court 1 PRC · PRC (Μαρούσι)» */
  place: string;
  /** «Μ 40+ · Απλό», as the Πρόγραμμα rows show it */
  meta: string;
  a: string;
  b: string;
  /** a doubles match: each side goes on its own line */
  double: boolean;
}

export interface ShareView {
  rows: ShareRow[];
  /** matches that did not fit */
  more: number;
}

/* The picture is drawn on a 360 x 560 grid (the card scales it to 1080 px wide). These are the heights, in that grid,
   of what sits on it. Text is never cut, so a long line wraps: the estimates assume a wrap when a line is long. */
export const SHARE_GRID = { height: 560, pad: 22 } as const;
const HEAD_LINE = 27;
const HEAD_GAP = 3;
const DAY_LINE = 20;
/** the list's title: the space above, its line, the space below */
const KICKER = 14 + 20 + 8;
const FOOT = 18 + 4 + 16;
const FOOT_GAP = 16;
const MORE = 6 + 17;
const NAME_LINE = 18;
const META_LINE = 15;
const ROW_PAD = 8;
const ROW_GAP = 9;
/** characters that fit a line of names (14 px bold) and of place and category (11 px) next to the time */
const NAME_CHARS = 30;
const META_CHARS = 42;
const TITLE_CHARS = 26;

const lines = (text: string, per: number): number => Math.max(1, Math.ceil([...text].length / per));

/** how tall a match is on the picture */
export function shareRowHeight(r: Pick<ShareRow, 'place' | 'meta' | 'a' | 'b' | 'double'>): number {
  const names = r.double ? lines(r.a, NAME_CHARS) + lines(r.b, NAME_CHARS) : lines(`${r.a} vs ${r.b}`, NAME_CHARS);
  const meta = [r.place, r.meta].filter(Boolean).join(' · ');
  return names * NAME_LINE + (meta ? lines(meta, META_CHARS) * META_LINE : 0) + ROW_PAD + ROW_GAP;
}

/** the room the matches have: the card less the head (the tournament's name and the day), the list's title and the footer */
export function shareRoom(title: string): number {
  const head = Math.min(2, lines(title, TITLE_CHARS)) * HEAD_LINE + HEAD_GAP + DAY_LINE;
  return SHARE_GRID.height - SHARE_GRID.pad * 2 - head - KICKER - FOOT - FOOT_GAP;
}

const NOBODY: ScheduleSide = { people: [], winner: false };

/**
 * what fits on the picture: the first matches of the day, by time, as many as the room above the footer holds
 * (leaving room for «+N ακόμα» when some are left out), and how many are left out. Always at least one.
 */
export function shareView(rows: ScheduleRow[], dash: string, title: string = ''): ShareView {
  const all: ShareRow[] = rows.map((r) => {
    const sides = [r.sides[0] ?? NOBODY, r.sides[1] ?? NOBODY];
    return {
      id: r.id,
      time: r.time,
      place: r.place ?? '',
      meta: r.meta,
      a: sideName(sides[0]!, dash),
      b: sideName(sides[1]!, dash),
      double: sides.some((x) => x.people.length > 1),
    };
  });
  const room = shareRoom(title);
  let used = 0;
  let n = 0;
  for (const r of all) {
    const h = shareRowHeight(r);
    const left = all.length - (n + 1);
    if (n > 0 && used + h + (left > 0 ? MORE : 0) > room) break;
    used += h;
    n += 1;
  }
  return { rows: all.slice(0, n), more: all.length - n };
}

/** the words that travel with the picture (and go alone on the web) */
export function scheduleMessage(t: Copy, name: string, day: string): string {
  return fmt(t.tournaments.detail.share.message, { name, day: dayLong(day, t), url: SHARE_URL });
}
