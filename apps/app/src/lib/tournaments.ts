import { dayKey, formatWinnerSets, localParts } from '@netprophet/core';
import { stripAccents, type Copy } from '@netprophet/copy';
import type { DrawMatchRow, GetTournamentResult, GetTournamentsResult, TournamentDraw, TournamentItem, TournamentMatch } from '@netprophet/db';
import { fmt } from './votes';

/**
 * «Τα τουρνουά σου» (prototype V2, isTour): the list of tournaments that are on, coming or just finished, and one
 * tournament with its schedule by day and its draws. Pure mapping from api.get_tournaments and api.get_tournament;
 * the screens only lay these out. Days are Athens day keys («2026-10-17»).
 */

const DAY_MS = 86_400_000;

const keyMs = (k: string) => Date.UTC(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, Number(k.slice(8, 10)));

/** whole days from one day key to another (negative when `to` is earlier) */
export function daysBetween(from: string, to: string): number {
  return Math.round((keyMs(to) - keyMs(from)) / DAY_MS);
}

/** «17/10» from «2026-10-17» */
export function ddmm(key: string): string {
  return `${Number(key.slice(8, 10))}/${Number(key.slice(5, 7))}`;
}

/** «10:00», Athens time */
export function timeOf(iso: string): string {
  const p = localParts(iso);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

const weekdayOf = (key: string) => new Date(keyMs(key)).getUTCDay();

/** the Athens day key of today */
export const todayKey = (now: Date = new Date()): string => dayKey(now.toISOString());

/* ================= the list ================= */

/** tournaments still to come or on: what the count on Εγώ and the feed link show */
export function openCount(items: TournamentItem[] | null | undefined): number {
  return (items ?? []).filter((i) => i.state !== 'done').length;
}

export interface Chip {
  text: string;
  /** lime: you are in it */
  hot: boolean;
}

export function chipOf(item: TournamentItem, today: string, t: Copy): Chip {
  const c = t.tournaments;
  if (item.in_it) return { text: c.chipIn, hot: true };
  if (item.state === 'ongoing') return { text: c.chipOngoing, hot: false };
  if (item.state === 'done') return { text: c.chipDone, hot: false };
  if (!item.starts_on) return { text: c.chipSoon, hot: false };
  const n = daysBetween(today, item.starts_on);
  return { text: n <= 1 ? c.chipTomorrow : fmt(c.chipInDays, { n }), hot: false };
}

/** «Γήπεδα Γλυφάδας · 17/10 έως 18/10» (parts that are missing are left out) */
export function subLine(item: Pick<TournamentItem, 'venue' | 'starts_on' | 'ends_on'>, t: Copy): string {
  const c = t.tournaments;
  const from = item.starts_on ?? item.ends_on;
  const to = item.ends_on ?? item.starts_on;
  const dates = from && to ? fmt(c.subDates, { from: ddmm(from), to: ddmm(to) }) : null;
  return [item.venue, dates].filter(Boolean).join(' · ');
}

/** «3 ταμπλό · 12 ματς σήμερα»; null when there is nothing to say */
export function boldLine(item: Pick<TournamentItem, 'draws' | 'today'>, t: Copy): string | null {
  const parts = [
    item.draws > 0 ? fmt(t.tournaments.draws, { n: item.draws }) : null,
    item.today > 0 ? fmt(t.tournaments.today, { n: item.today }) : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export interface TournamentSection {
  key: 'ongoing' | 'upcoming' | 'done';
  title: string;
  items: TournamentItem[];
}

/** «Τώρα», «Έρχονται», «Τελείωσαν»: only the ones that have something, in that order */
export function sectionsOf(items: TournamentItem[], t: Copy): TournamentSection[] {
  return (['ongoing', 'upcoming', 'done'] as const)
    .map((key) => ({ key, title: t.tournaments.sections[key], items: items.filter((i) => i.state === key) }))
    .filter((s) => s.items.length > 0);
}

/* ================= «Το πρόγραμμά σου» (Pro) ================= */

export interface MineRow {
  key: string;
  /** «Σαβ 17/10 · 10:00» */
  when: string;
  /** «Open Γλυφάδας · Μ 40+» */
  what: string;
}

export function mineRows(mine: NonNullable<GetTournamentsResult['mine']>, t: Copy): MineRow[] {
  const c = t.tournaments;
  return mine
    .filter((m) => m.starts_at)
    .map((m) => {
      const day = dayKey(m.starts_at!);
      return {
        key: m.match_id,
        when: `${c.weekdaysShort[weekdayOf(day)]} ${ddmm(day)} · ${timeOf(m.starts_at!)}`,
        what: m.level ? fmt(c.mineWhat, { tournament: m.tournament, level: m.level }) : m.tournament,
      };
    });
}

/** «Παίζεις Σάββατο 10:00», from my first match; null when I have none */
export function mineHeadline(mine: NonNullable<GetTournamentsResult['mine']>, today: string, t: Copy): string | null {
  const first = mine.find((m) => m.starts_at);
  if (!first) return null;
  const c = t.tournaments;
  const day = dayKey(first.starts_at!);
  const n = daysBetween(today, day);
  const word = n <= 0 ? c.playingToday : n === 1 ? c.playingTomorrow : c.weekdaysOn[weekdayOf(day)]!;
  return fmt(c.playing, { when: `${word} ${timeOf(first.starts_at!)}` });
}

/* ================= one tournament: Πρόγραμμα ================= */

export type Segment = 'schedule' | 'bracket';

/** which segments have data */
export function segmentsOf(d: Pick<GetTournamentResult, 'days' | 'draws'>): Segment[] {
  return [d.days.length > 0 ? ('schedule' as const) : null, d.draws.length > 0 ? ('bracket' as const) : null].filter((s): s is Segment => s !== null);
}

/** Πρόγραμμα when there are matches today, else Ταμπλό (else whichever has data) */
export function defaultSegment(d: Pick<GetTournamentResult, 'days' | 'draws'>, today: string): Segment {
  const have = segmentsOf(d);
  if (have.length === 0) return 'schedule';
  if (d.days.some((x) => x.date === today && x.matches.length > 0) && have.includes('schedule')) return 'schedule';
  return have.includes('bracket') ? 'bracket' : 'schedule';
}

export interface DayChip {
  key: string;
  /** «Σήμερα», «Αύριο», «Τετ 14/10» */
  label: string;
}

export function dayChips(days: GetTournamentResult['days'], today: string, t: Copy): DayChip[] {
  return days.map((d) => {
    const n = daysBetween(today, d.date);
    return {
      key: d.date,
      label: n === 0 ? t.match.today : n === 1 ? t.match.tomorrow : `${t.tournaments.weekdaysShort[weekdayOf(d.date)]} ${ddmm(d.date)}`,
    };
  });
}

/** today when it has matches, else the nearest day that does (a later day wins a tie) */
export function defaultDay(days: GetTournamentResult['days'], today: string): string | null {
  let best: string | null = null;
  for (const d of days) {
    if (d.matches.length === 0) continue;
    const gap = Math.abs(daysBetween(today, d.date));
    const bestGap = best === null ? Infinity : Math.abs(daysBetween(today, best));
    if (gap < bestGap || (gap === bestGap && d.date > (best ?? ''))) best = d.date;
  }
  return best;
}

export interface ScheduleSide {
  people: { id: string; first: string; surname: string }[];
  winner: boolean;
}

export interface ScheduleRow {
  id: string;
  time: string;
  /** «Μ 40+ · Απλό» */
  meta: string;
  sides: ScheduleSide[];
  /** «6-4, 3-6, 7-5», winner first; null when there is no result */
  score: string | null;
  /** I play in it */
  mine: boolean;
}

export function disciplineLabel(discipline: string | null, t: Copy): string | null {
  return (discipline && t.tournaments.detail.disciplines[discipline]) || null;
}

/** one day's matches, by time */
export function scheduleRows(matches: TournamentMatch[], me: string | null, t: Copy): ScheduleRow[] {
  return [...matches]
    .sort((a, b) => (a.starts_at ?? '').localeCompare(b.starts_at ?? ''))
    .map((m) => {
      const sides: ScheduleSide[] = [1, 2].map((n) => ({
        people: (m.sides.find((s) => s.side === n)?.players ?? []).map((p) => ({ id: p.id, first: p.first_name, surname: p.surname })),
        winner: m.winner_side === n,
      }));
      const hasResult = m.winner_side !== null && ((m.sets?.length ?? 0) > 0 || m.walkover === true);
      return {
        id: m.match_id,
        time: m.starts_at ? timeOf(m.starts_at) : '',
        meta: [m.level, disciplineLabel(m.discipline, t)].filter(Boolean).join(' · '),
        sides,
        score: hasResult ? formatWinnerSets(m.sets ?? [], { retired: m.retired === true, walkover: m.walkover === true }, t.results) : null,
        mine: me !== null && sides.some((s) => s.people.some((p) => p.id === me)),
      };
    });
}

/* ================= one tournament: Ταμπλό ================= */

/** «Προημιτελικά», «Ημιτελικά», «Τελικός» by position from the end, «1ος γύρος» before them */
export function roundName(index: number, total: number, t: Copy): string {
  const d = t.tournaments.detail;
  const fromEnd = total - 1 - index;
  if (fromEnd === 0) return d.final;
  if (fromEnd === 1) return d.semi;
  if (fromEnd === 2) return d.quarter;
  return fmt(d.roundN, { n: index + 1 });
}

const norm = (s: string) => stripAccents(s).toLowerCase().replace(/ς/g, 'σ').replace(/\s+/g, ' ').trim();
const isByeText = (s: string) => ['βυε', 'bye'].includes(norm(s));

export interface SidePart {
  text: string;
  /** the roster player, when the sheet name was matched to one */
  playerId: string | null;
}

export interface SideView {
  parts: SidePart[];
  seed: number | null;
  bye: boolean;
  /** nobody written there yet */
  empty: boolean;
}

export interface BracketMatch {
  key: string;
  sides: [SideView, SideView];
  /** the side that went through by winning */
  winner: 1 | 2 | null;
  /** the side that goes through on a bye (no ✓, no score) */
  advances: 1 | 2 | null;
  /** the score as written, or when it is played, or the round's deadline */
  line: string;
  /** games per set, side 1 first (parsed from the score as written); empty when there is no score */
  sets: [number, number][];
  /** the card footer: when it is played, «έως 14/10», or «Χωρίς αγώνα»; empty once it has a score or a bye */
  note: string;
}

/** «64 63», «67(4) 62 10-8», «6-4, 3-6»: games per set, winner first as the sheet writes them, turned to side 1 first */
export function parseSets(scoreRaw: string, winner: 1 | 2 | null): [number, number][] {
  const out: [number, number][] = [];
  for (const tok of scoreRaw.replace(/\(\d+\)/g, '').split(/[\s,;]+/)) {
    const dash = /^(\d+)-(\d+)$/.exec(tok);
    const pair = /^(\d)(\d)$/.exec(tok);
    const m = dash ?? pair;
    if (!m) continue;
    const a = Number(m[1]);
    const b = Number(m[2]);
    out.push(winner === 2 ? [b, a] : [a, b]);
  }
  return out;
}

/** the matches of every round of one draw, with names as written on the sheet */
export function bracketRounds(draw: TournamentDraw, masked: string[], t: Copy): { name: string; matches: BracketMatch[] }[] {
  const d = t.tournaments.detail;
  const maskedSet = new Set(masked.map(norm));
  const byRaw = new Map(draw.entrants.map((e) => [norm(e.raw), e]));
  const playerOf = new Map<string, string | null>();
  for (const e of draw.entrants) for (const p of e.players) playerOf.set(norm(p.raw), p.player_id);

  const side = (raw: string | null): SideView => {
    const text = (raw ?? '').trim();
    if (!text) return { parts: [], seed: null, bye: false, empty: true };
    const entrant = byRaw.get(norm(text));
    if (isByeText(text) || entrant?.bye) return { parts: [], seed: null, bye: true, empty: false };
    const parts = text.split('/').map((p) => p.trim()).filter(Boolean).map((p): SidePart => {
      if (maskedSet.has(norm(p)) || maskedSet.has(norm(text))) return { text: d.masked, playerId: null };
      return { text: p, playerId: playerOf.get(norm(p)) ?? null };
    });
    return { parts, seed: entrant?.seed ?? null, bye: false, empty: false };
  };

  const line = (m: DrawMatchRow): string => {
    if (m.winner) return m.scoreRaw || (m.walkover ? t.results.walkover : '');
    return m.when || (m.deadline ? fmt(d.until, { date: ddmm(m.deadline) }) : '');
  };

  return draw.rounds.map((round, ri) => ({
    name: roundName(ri, draw.rounds.length, t),
    matches: round.map((m) => {
      const a = side(m.side1);
      const b = side(m.side2);
      const advances = a.bye && !b.bye && !b.empty ? 2 : b.bye && !a.bye && !a.empty ? 1 : null;
      const sets = m.winner ? parseSets(m.scoreRaw, m.winner) : [];
      const note = m.winner ? (m.walkover && sets.length === 0 ? t.results.walkover : '') : advances ? '' : line(m);
      return { key: `${m.round}-${m.slot}`, sides: [a, b], winner: m.winner, advances, line: advances ? '' : line(m), sets, note };
    }),
  }));
}
