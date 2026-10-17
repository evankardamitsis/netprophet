import { dayKey, formatWinnerSets, localParts } from '@netprophet/core';
import { greekCaps, withArticleAccusative, type Copy } from '@netprophet/copy';
import type { FeedPlayer, Reactions, ResultRow, Side } from '@netprophet/db';
import { fmt } from './votes';
import { categoryLabel } from './category';

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
  /** the two chips; null when the server sent none */
  reactions: Reactions | null;
  /** «Πες κάτι στον Νίκο ›» and who it goes to */
  thank: { label: string; playerId: string; first: string; gender: 'm' | 'f' | null } | null;
  /** your own win (not a walkover): «Μοιράσου τη νίκη ›» */
  myWin: boolean;
}

/**
 * One event on one day (founder, 16 Oct: hierarchically clear): the day once as a small label over its first event,
 * the tournament as the event's heading, the category and round under it.
 */
export interface ResultGroup {
  key: string;
  /** «ΧΘΕΣ», already in capitals without accents */
  day: string;
  /** true on the first group of its day, so the day label shows once */
  firstOfDay: boolean;
  /** «Open Γλυφάδας», or «Φιλικά» */
  title: string;
  /** «Μ 40+ · Απλό · Προημιτελικά»; null when there is nothing to add */
  detail: string | null;
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

/** «Open Γλυφάδας · Μ 40+ · Απλό · Προημιτελικά», or «Φιλικά» («Φιλικά · Διπλό» for doubles). */
export function eventLabel(row: Pick<ResultRow, 'tournament' | 'round' | 'format' | 'level' | 'discipline'>, t: Copy): string {
  if (!row.tournament) {
    return row.format === 'singles' ? t.results.friendlies : `${t.results.friendlies} · ${t.match.formats[row.format]}`;
  }
  const round = row.round ? (isRoundKey(row.round) ? t.results.rounds[row.round] : row.round) : null;
  return [row.tournament, categoryLabel(row.level, row.discipline, t), round].filter(Boolean).join(' · ');
}

/** «Open Γλυφάδας» and «Μ 40+ · Απλό · Προημιτελικά» apart, for the event heading and the line under it. */
export function eventParts(row: Pick<ResultRow, 'tournament' | 'round' | 'format' | 'level' | 'discipline'>, t: Copy): { title: string; detail: string | null } {
  if (!row.tournament) return { title: t.results.friendlies, detail: row.format === 'singles' ? null : t.match.formats[row.format] };
  const round = row.round ? (isRoundKey(row.round) ? t.results.rounds[row.round] : row.round) : null;
  const detail = [categoryLabel(row.level, row.discipline, t), round].filter(Boolean).join(' · ');
  return { title: row.tournament, detail: detail || null };
}

const names = (players: FeedPlayer[]): ResultName[] => players.map((p) => ({ first: p.first_name, surname: p.surname }));
const playersOf = (row: ResultRow, side: Side) => row.sides.find((s) => s.side === side)?.players ?? [];

/** a result you won yourself (your claimed player on the winning side), and not a walkover: it can have a card */
export function isMyWin(row: Pick<ResultRow, 'sides' | 'winner_side' | 'walkover'>, myPlayerId: string | null | undefined): boolean {
  if (!myPlayerId || row.walkover) return false;
  return row.sides.some((s) => s.side === row.winner_side && s.players.some((p) => p.id === myPlayerId));
}

export function toResultItem(row: ResultRow, t: Copy, myPlayerId: string | null = null): ResultItem {
  const win = row.winner_side;
  const lose: Side = win === 1 ? 2 : 1;
  // a player-logged result knows only the sets («2-1»), not the games
  const summary = row.sets.length === 0 && row.score_summary ? row.score_summary.split('-').map(Number) : null;
  const wonSets = summary ? summary[0] ?? 0 : row.sets.filter((s) => s.w > s.l).length;
  const lostSets = summary ? summary[1] ?? 0 : row.sets.filter((s) => s.l > s.w).length;

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
    score: summary ? '' : formatWinnerSets(row.sets, { retired: row.retired, walkover: row.walkover }, t.results),
    reactions: row.reactions && row.reactions.options.length > 0 ? row.reactions : null,
    thank: row.kudo_to
      ? {
          label: fmt(t.kudos.prompt, { to: withArticleAccusative(row.kudo_to.first_name, '', row.kudo_to.gender).trim() }),
          playerId: row.kudo_to.player_id,
          first: row.kudo_to.first_name,
          gender: row.kudo_to.gender,
        }
      : null,
    myWin: isMyWin(row, myPlayerId),
  };
}

/** Rows (newest first) into groups by day and event, in the order they come. */
export function groupResults(rows: ResultRow[], t: Copy, now: Date, myPlayerId: string | null = null): ResultGroup[] {
  const groups: ResultGroup[] = [];
  const byKey = new Map<string, ResultGroup>();
  const days = new Set<string>();
  for (const row of rows) {
    const dk = dayKey(row.starts_at);
    const key = `${dk}|${eventLabel(row, t)}`;
    let g = byKey.get(key);
    if (!g) {
      g = { key, day: greekCaps(dayLabel(row.starts_at, now, t)), firstOfDay: !days.has(dk), ...eventParts(row, t), items: [] };
      days.add(dk);
      byKey.set(key, g);
      groups.push(g);
    }
    g.items.push(toResultItem(row, t, myPlayerId));
  }
  return groups;
}
