import type { Copy } from '@netprophet/copy';
import type { MedalPlace, MonthMedal } from '@netprophet/db';
import { cosmetics } from '@netprophet/tokens';
import { monthName } from './season';
import { fmt } from './votes';

/**
 * Month medals (founder, 2 Nov 2026): the top 3 of each Κατηγορία group when the month closes win gold, silver or
 * bronze, with the month on it. The server awards them; these only name and colour them.
 */

/** «Χρυσό μετάλλιο» */
export function medalName(place: MedalPlace, t: Copy): string {
  return t.ladder.medals.names[place - 1] ?? '';
}

/** the two lines under a medal on the shelf: «Οκτώβριος», «2026» */
export function monthLabel(key: string, t: Copy): { month: string; year: string } {
  return { month: monthName(key, t), year: key.slice(0, 4) };
}

/** «Οκτώβριος 2026» */
export function medalMonth(key: string, t: Copy): string {
  const l = monthLabel(key, t);
  return `${l.month} ${l.year}`;
}

/** what a screen reader says: «Χρυσό μετάλλιο, Οκτώβριος 2026, Χάλκινη» */
export function medalAria(m: MonthMedal, t: Copy): string {
  return fmt(t.ladder.medals.aria, { medal: medalName(m.place, t), month: medalMonth(m.month, t), tier: t.ladder.tiers[m.tier] });
}

/** the face and rim of a medal, from the tokens */
export function medalTone(place: MedalPlace): { face: string; rim: string } {
  const c = cosmetics.medal;
  if (place === 1) return { face: c.gold, rim: c.goldRim };
  if (place === 2) return { face: c.silver, rim: c.silverRim };
  return { face: c.bronze, rim: c.bronzeRim };
}

/** the shelf: newest month first (one medal a month at most); anything malformed is dropped */
export function shelfOf(rows: MonthMedal[] | null | undefined): MonthMedal[] {
  return (rows ?? [])
    .filter((m) => /^\d{4}-\d{2}$/.test(m.month) && (m.place === 1 || m.place === 2 || m.place === 3))
    .sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0));
}
