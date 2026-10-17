import type { Copy } from '@netprophet/copy';
import type { UpcomingTournament, UpcomingTournamentsResult } from '@netprophet/db';
import { ddmm } from './tournaments';
import { fmt } from './votes';

/**
 * «Το επόμενο τουρνουά για σένα» (Pro, 17 Oct 2026): pure mapping from api.upcoming_tournaments. The server already
 * splits free and Pro (free gets the first row and a count); this only words the rows and the line under them.
 */

export interface NextRow {
  key: string;
  name: string;
  /** «Γλυφάδα · 25/10 έως 27/10 · Χώμα» */
  where: string;
  /** «Μ 40+ · MEDIUM», or null */
  categories: string | null;
  /** «Δηλώσεις έως Πεμ 23/10», «Οι δηλώσεις έκλεισαν», or null without a deadline */
  deadline: string | null;
  /** where «Δήλωση ›» goes; null when entries are closed or there is no link */
  link: string | null;
  played: boolean;
}

const weekday = (key: string) => new Date(Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)))).getUTCDay();

/** «Δηλώσεις έως Πεμ 23/10» from «2026-10-23» */
export function deadlineLine(item: Pick<UpcomingTournament, 'entry_deadline' | 'entry_open'>, t: Copy): string | null {
  const n = t.tournaments.next;
  if (!item.entry_deadline) return null;
  if (!item.entry_open) return n.closed;
  return fmt(n.deadline, { day: t.tournaments.weekdaysShort[weekday(item.entry_deadline)] ?? '', date: ddmm(item.entry_deadline) });
}

export function nextRow(item: UpcomingTournament, t: Copy): NextRow {
  const from = item.starts_on ?? item.ends_on;
  const to = item.ends_on ?? item.starts_on;
  const dates = from && to ? (from === to ? ddmm(from) : fmt(t.tournaments.subDates, { from: ddmm(from), to: ddmm(to) })) : null;
  const surface = item.surface ? t.match.surfaces[item.surface] ?? null : null;
  return {
    key: item.id,
    name: item.name,
    where: [item.area ?? item.venue, dates, surface].filter(Boolean).join(' · '),
    categories: item.categories.length > 0 ? item.categories.join(' · ') : null,
    deadline: deadlineLine(item, t),
    link: item.entry_open !== false && item.entry_link ? item.entry_link : null,
    played: item.played_before,
  };
}

/** the line under the rows: free gets the way to the rest (or to the reminder), Pro the reminder is on */
export function nextFooter(data: Pick<UpcomingTournamentsResult, 'pro' | 'more'>, t: Copy): { text: string; locked: boolean } {
  const n = t.tournaments.next;
  if (data.pro) return { text: n.remindOn, locked: false };
  if (data.more === 1) return { text: n.moreOne, locked: true };
  if (data.more > 1) return { text: fmt(n.moreMany, { n: data.more }), locked: true };
  return { text: n.remind, locked: true };
}
