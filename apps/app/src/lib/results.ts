import { dayKey, formatWinnerSets, localParts } from '@netprophet/core';
import { greekCaps, type Copy } from '@netprophet/copy';
import type { FeedPlayer, ResultRow, Side } from '@netprophet/db';
import { fmt } from './votes';

/**
 * Αποτελέσματα (prototype V2, isRes): finished matches grouped by day and event, newest first.
 * Pure mapping from api.get_results rows; the screen only lays these out.
 */

export interface ResultName {
  first: string;
  surname: string;
}

export interface ResultItem {
  id: string;
  /** the dark card: the winner had under the upset share of enough votes */
  upset: boolean;
  /** «Ανατροπή» on upsets, in capitals */
  tag: string | null;
  /** «Το 69% έλεγε Πράτσας»; null when nobody voted */
  line: string | null;
  /** «Το ’πες · +10» when the viewer called it */
  calledIt: string | null;
  winner: ResultName[];
  loser: ResultName[];
  /** sets won, the big numbers; empty for a walkover */
  winnerSets: string;
  loserSets: string;
  /** «6-4, 3-6, 7-5» winner first, «απ.» / «w/o» */
  score: string;
}

export interface ResultGroup {
  key: string;
  /** «ΧΘΕΣ · OPEN ΓΛΥΦΑΔΑΣ · ΠΡΟΗΜΙΤΕΛΙΚΑ», already in capitals without accents */
  title: string;
  items: ResultItem[];
}

const ROUND_KEYS = ['round64', 'round32', 'round16', 'quarter', 'semi', 'final'] as const;
type RoundKey = (typeof ROUND_KEYS)[number];
const isRoundKey = (r: string): r is RoundKey => (ROUND_KEYS as readonly string[]).includes(r);

const DAY_MS = 86_400_000;

/** Days between two Athens day keys (YYYY-MM-DD). */
function daysBetween(from: string, to: string): number {
  const ms = (k: string) => Date.UTC(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, Number(k.slice(8, 10)));
  return Math.round((ms(to) - ms(from)) / DAY_MS);
}

/** «Σήμερα», «Χθες», «Προχθές», «Την Κυριακή» within a week, else «12/10». */
export function dayLabel(startsAt: string, now: Date, t: Copy): string {
  const ago = daysBetween(dayKey(startsAt), dayKey(now.toISOString()));
  if (ago <= 0) return t.match.today;
  if (ago === 1) return t.results.yesterday;
  if (ago === 2) return t.results.dayBefore;
  const p = localParts(startsAt);
  if (ago < 7) return t.results.weekdaysOn[new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()]!;
  return `${p.day}/${p.month}`;
}

/** «Open Γλυφάδας · Προημιτελικά», or «Φιλικά» («Φιλικά · Διπλό» for doubles). */
export function eventLabel(row: Pick<ResultRow, 'tournament' | 'round' | 'format'>, t: Copy): string {
  if (!row.tournament) {
    return row.format === 'singles' ? t.results.friendlies : `${t.results.friendlies} · ${t.match.formats[row.format]}`;
  }
  const round = row.round ? (isRoundKey(row.round) ? t.results.rounds[row.round] : row.round) : null;
  return [row.tournament, round].filter(Boolean).join(' · ');
}

const names = (players: FeedPlayer[]): ResultName[] => players.map((p) => ({ first: p.first_name, surname: p.surname }));
const playersOf = (row: ResultRow, side: Side) => row.sides.find((s) => s.side === side)?.players ?? [];

export function toResultItem(row: ResultRow, t: Copy): ResultItem {
  const win = row.winner_side;
  const lose: Side = win === 1 ? 2 : 1;
  const wonSets = row.sets.filter((s) => s.w > s.l).length;
  const lostSets = row.sets.filter((s) => s.l > s.w).length;

  let line: string | null = null;
  if (row.split && row.split.total > 0) {
    const fav: Side = row.split.side1 >= row.split.side2 ? 1 : 2;
    const pct = Math.round(((fav === 1 ? row.split.side1 : row.split.side2) / row.split.total) * 100);
    const name = playersOf(row, fav)
      .map((p) => p.surname)
      .join(' & ');
    line = fmt(t.results.line, { pct, name });
  }

  return {
    id: row.match_id,
    upset: row.upset,
    tag: row.upset ? greekCaps(t.results.upset) : null,
    line,
    calledIt: row.my?.outcome === 'correct' ? fmt(t.results.calledIt, { points: row.my.points }) : null,
    winner: names(playersOf(row, win)),
    loser: names(playersOf(row, lose)),
    winnerSets: row.walkover ? '' : String(wonSets),
    loserSets: row.walkover ? '' : String(lostSets),
    score: formatWinnerSets(row.sets, { retired: row.retired, walkover: row.walkover }, t.results),
  };
}

/** Rows (newest first) into groups by day and event, in the order they come. */
export function groupResults(rows: ResultRow[], t: Copy, now: Date): ResultGroup[] {
  const groups: ResultGroup[] = [];
  const byKey = new Map<string, ResultGroup>();
  for (const row of rows) {
    const day = dayLabel(row.starts_at, now, t);
    const event = eventLabel(row, t);
    const key = `${dayKey(row.starts_at)}|${event}`;
    let g = byKey.get(key);
    if (!g) {
      g = { key, title: greekCaps(`${day} · ${event}`), items: [] };
      byKey.set(key, g);
      groups.push(g);
    }
    g.items.push(toResultItem(row, t));
  }
  return groups;
}
