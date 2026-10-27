import { dayKey } from '@netprophet/core';
import { accusativeWord, nameGender, type Copy } from '@netprophet/copy';
import type { FeedPlayer, GetTournamentResult, TournamentMatch } from '@netprophet/db';
import { fmt, type Side } from './votes';
import { fromTournamentMatch, overlayFeed, toUiSide, type CardMatch } from './feed';
import type { MyMatchView } from './myMatch';
import { dayLabel, daysBetween, dayShort, hasTime, timeOf } from './tournaments';

/**
 * The tournament page made smart (founder, 21 Oct: "smart and not cluttering"): it opens on today, says what plays
 * now and next on each court, marks your people, and the types of one player's run (lib/playerRun).
 * Pure mapping from api.get_tournament plus the ids you follow; the screens only lay these out.
 */

/** a match counts as playing for this long after its start, since nobody writes when it ends */
export const NOW_WINDOW_MS = 90 * 60_000;

/* ================= the day it opens on ================= */

/**
 * `?day=` when the tournament has that day (a push opens on it), else today when it plays today, else the next day
 * with matches, else the last day that had any (a finished tournament); null when there are no matches at all.
 */
export function openingDay(days: GetTournamentResult['days'], today: string, asked?: string | null): string | null {
  const withMatches = days.filter((d) => d.matches.length > 0).map((d) => d.date).sort();
  if (asked && days.some((d) => d.date === asked)) return asked;
  if (withMatches.includes(today)) return today;
  const next = withMatches.find((d) => d > today);
  if (next) return next;
  return withMatches.length > 0 ? withMatches[withMatches.length - 1]! : null;
}

/* ================= names ================= */

type Person = Pick<FeedPlayer, 'id' | 'first_name' | 'surname'>;

const sideOf = (m: TournamentMatch, n: 1 | 2): Person[] => m.sides.find((s) => s.side === n)?.players ?? [];
const surnames = (ps: Person[]) => ps.map((p) => p.surname).join(' & ');
const surnamesAcc = (ps: Person[]) => ps.map((p) => accusativeWord(p.surname, nameGender(p.first_name))).join(' & ');
/** «Ροδίτης Ν.», as the schedule writes a name */
export const shortName = (p: Person) => `${p.surname} ${p.first_name.slice(0, 1)}.`.trim();

/** «Ροδίτης με Δεσύπρη» */
export function pairLine(m: TournamentMatch, t: Copy): string {
  return fmt(t.tournaments.focus.pair, { a: surnames(sideOf(m, 1)), b: surnamesAcc(sideOf(m, 2)) });
}

/** a piece of a line that shows names: a name with a roster id can be held (its run opens), the rest is plain text */
export interface NameSeg {
  text: string;
  id?: string | null;
}

/** the template cut at its «{key}» holes, each hole filled by the pieces given for it (unknown holes stay as text) */
export function segmentsOf(template: string, parts: Record<string, NameSeg[]>): NameSeg[] {
  const out: NameSeg[] = [];
  for (const piece of template.split(/(\{\w+\})/)) {
    if (!piece) continue;
    const key = /^\{(\w+)\}$/.exec(piece)?.[1];
    if (key && parts[key]) out.push(...parts[key]!);
    else out.push({ text: piece });
  }
  return out;
}

/** people joined by « & », one piece each (a name with a roster id opens that player's card on a tap) */
export function joinSegs<P>(list: readonly P[], seg: (p: P) => NameSeg): NameSeg[] {
  return list.flatMap((p, i): NameSeg[] => [...(i > 0 ? [{ text: ' & ' }] : []), seg(p)]);
}

/** a side as pieces: «Ροδίτης & Πράτσας», surnames (the accusative after «με»), each with its roster id */
export function sideSegs(ps: Person[], accusative = false): NameSeg[] {
  return ps.flatMap((p, i): NameSeg[] => [
    ...(i > 0 ? [{ text: ' & ' }] : []),
    { text: accusative ? accusativeWord(p.surname, nameGender(p.first_name)) : p.surname, id: p.id },
  ]);
}

/** «Ροδίτης με Δεσύπρη» as pieces: the same text as `pairLine`, the names holdable */
export function pairSegments(m: TournamentMatch, t: Copy): NameSeg[] {
  return segmentsOf(t.tournaments.focus.pair, { a: sideSegs(sideOf(m, 1)), b: sideSegs(sideOf(m, 2), true) });
}

/** «με Δεσύπρη» as pieces, for the people across (undefined when nobody is across yet) */
export function againstSegs(others: Person[], t: Copy): NameSeg[] | undefined {
  return others.length > 0 ? segmentsOf(t.tournaments.focus.against, { name: sideSegs(others, true) }) : undefined;
}

/** NaN without a real time (none, or the import's 00:00 for a row with no time) */
const startMs = (m: TournamentMatch) => (hasTime(m.starts_at) ? Date.parse(m.starts_at!) : NaN);
const resolved = (m: TournamentMatch) => m.winner_side !== null;

/* ================= «Τώρα / Μετά», by court ================= */

export interface CourtNowNext {
  key: string;
  /** «Γήπεδο 1»; null when the schedule names no court (then there is one row for the day) */
  court: string | null;
  now: { matchId: string; pair: string; segs: NameSeg[] } | null;
  /** `time` is «18:30», «μετά το …», or the day («Σήμερα») when the match has no time */
  next: { matchId: string; pair: string; segs: NameSeg[]; time: string } | null;
}

/** a match's place in its court's order, when the source gives one (the schedule's row number) */
type Ordered = TournamentMatch & { order?: number | null };

/**
 * Per court: what is playing now (started within the last 90 minutes, no result, not put off; the latest when two
 * overlap) and what is next (the earliest still to start). A match with no time reads «μετά το {previous}» when the
 * court has an order, else its day («Σήμερα»; these are today's matches). Courts with neither are left out; natural order of the court names.
 */
export function nowNext(matches: Ordered[], now: Date, t: Copy): CourtNowNext[] {
  const f = t.tournaments.focus;
  const nowMs = now.getTime();
  const byCourt = new Map<string, { court: string | null; ms: Ordered[] }>();
  for (const m of matches) {
    if (m.postponed === true || resolved(m)) continue;
    const court = (m.court ?? '').trim() || null;
    const key = `${(m.club ?? '').trim()}|${court ?? ''}`;
    const entry = byCourt.get(key) ?? { court, ms: [] };
    entry.ms.push(m);
    byCourt.set(key, entry);
  }
  const all = [...matches];
  const out: CourtNowNext[] = [];
  for (const [key, { court, ms }] of byCourt) {
    const timed = ms.filter((m) => !Number.isNaN(startMs(m))).sort((a, b) => startMs(a) - startMs(b));
    const playing = timed.filter((m) => startMs(m) <= nowMs && nowMs - startMs(m) < NOW_WINDOW_MS);
    const current = playing[playing.length - 1] ?? null;
    let next: CourtNowNext['next'] = null;
    const upcoming = timed.find((m) => startMs(m) > nowMs);
    if (upcoming) next = { matchId: upcoming.match_id, pair: pairLine(upcoming, t), segs: pairSegments(upcoming, t), time: timeOf(upcoming.starts_at!) };
    else {
      const untimed = ms.filter((m) => Number.isNaN(startMs(m))).sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))[0];
      if (untimed) {
        const before = untimed.order != null
          ? all
              .filter((x) => x !== untimed && x.order != null && x.order < untimed.order! && `${(x.club ?? '').trim()}|${(x.court ?? '').trim()}` === key)
              .sort((a, b) => b.order! - a.order!)[0]
          : undefined;
        next = { matchId: untimed.match_id, pair: pairLine(untimed, t), segs: pairSegments(untimed, t), time: before ? fmt(f.after, { match: pairLine(before, t) }) : dayLabel(dayKey(now.toISOString()), dayKey(now.toISOString()), t) };
      }
    }
    if (current || next) out.push({ key, court, now: current ? { matchId: current.match_id, pair: pairLine(current, t), segs: pairSegments(current, t) } : null, next });
  }
  return out.sort((a, b) => (a.court ?? '').localeCompare(b.court ?? '', 'el', { numeric: true }));
}

/* ================= «δικοί σου» ================= */

/** your claimed player and everyone you follow (known or friends) */
export function yoursSet(me: string | null, follows: Iterable<string>): Set<string> {
  const s = new Set(follows);
  if (me) s.add(me);
  return s;
}

export interface YoursRow {
  matchId: string;
  playerId: string;
  /** «Ροδίτης Ν.» */
  name: string;
  /** «18:30», or «Αναβολή» */
  time: string;
  /** «με Δεσύπρη» */
  against: string;
}

/** one row per match of the day where one of yours plays (the first of them on it), by time */
export function yoursToday(matches: TournamentMatch[], yours: Set<string>, t: Copy, skip?: string | null): YoursRow[] {
  // these are today's matches: one with no time says «Σήμερα» (never «χωρίς ώρα»)
  const today = dayKey(new Date().toISOString());
  const out: (YoursRow & { at: number })[] = [];
  for (const m of matches) {
    // «Ο αγώνας σου» has its own row: not also a chip
    if (skip && m.match_id === skip) continue;
    for (const n of [1, 2] as const) {
      const p = sideOf(m, n).find((x) => yours.has(x.id));
      if (!p) continue;
      const other = sideOf(m, n === 1 ? 2 : 1);
      out.push({
        matchId: m.match_id,
        playerId: p.id,
        name: shortName(p),
        time: m.postponed === true ? t.tournaments.detail.postponedTime : hasTime(m.starts_at) ? timeOf(m.starts_at!) : dayLabel(m.starts_at ? dayKey(m.starts_at) : today, today, t),
        against: fmt(t.tournaments.focus.against, { name: surnamesAcc(other) || t.tournaments.detail.tbd }),
        at: m.postponed === true || Number.isNaN(startMs(m)) ? Infinity : startMs(m),
      });
      break;
    }
  }
  return out.sort((a, b) => a.at - b.at).map((r): YoursRow => ({ matchId: r.matchId, playerId: r.playerId, name: r.name, time: r.time, against: r.against }));
}

/* ================= one player in this tournament ================= */

export interface PathMatch {
  matchId: string;
  /** «Σαβ 17/10» */
  day: string;
  /** «Μ 40+ · Ημιτελικά» or the category alone */
  meta: string | null;
  /** «με Δεσύπρη» */
  against: string;
  /** the same, as pieces, when the schedule knows who (the names can be held) */
  againstSegs?: NameSeg[];
  /** «6-4, 6-3», winner first */
  score: string | null;
  won: boolean;
}

export interface NextMatch {
  matchId: string | null;
  /** «Σήμερα 18:30», «Σαβ 24/10 10:00», «Αναβολή», or the draw's own «ΣΑΒ 18.30» / «έως 24/10» */
  when: string;
  /** «Γήπεδο 1 · Γήπεδα Γλυφάδας» when known */
  place: string | null;
  against: string;
  /** the same, as pieces, when the schedule knows who (the names can be held) */
  againstSegs?: NameSeg[];
  /** started within the last 90 minutes */
  now: boolean;
}

/** «Σήμερα 18:30», «Αύριο 10:00», «Σαβ 24/10 10:00»; the day alone when the start has no time */
export function whenLine(iso: string, today: string, t: Copy): string {
  const day = dayKey(iso);
  const n = daysBetween(today, day);
  const label = n === 0 ? t.match.today : n === 1 ? t.match.tomorrow : dayShort(iso, t);
  return hasTime(iso) ? fmt(t.tournaments.focus.when, { day: label, time: timeOf(iso) }) : label;
}

/** where the sheet was opened: a schedule match (Πρόγραμμα, Σήμερα) or a draw slot (Ταμπλό); null: no match */
export type PathContext = { match: string } | { tab: string; round: number; slot: number } | null;


/* ================= Σήμερα: your match and the day's votes ================= */

/**
 * «Ο αγώνας σου»: the match of the day where your own player plays (the earliest when there are two), as the home's row
 * reads it. Null when you have no player or yours is not playing today.
 */
export function mineToday(matches: TournamentMatch[], me: string | null, t: Copy): (MyMatchView & { playerId: string }) | null {
  if (!me) return null;
  const mine = matches
    .filter((m) => m.postponed !== true && !resolved(m) && [1, 2].some((n) => sideOf(m, n as 1 | 2).some((p) => p.id === me)))
    .sort((a, b) => (Number.isNaN(startMs(a)) ? Infinity : startMs(a)) - (Number.isNaN(startMs(b)) ? Infinity : startMs(b)))[0];
  if (!mine) return null;
  const n = sideOf(mine, 1).some((p) => p.id === me) ? 1 : 2;
  const other = sideOf(mine, n === 1 ? 2 : 1);
  const who = fmt(t.tournaments.focus.against, { name: surnamesAcc(other) || t.tournaments.detail.tbd });
  const category = mine.level ?? null;
  const when = hasTime(mine.starts_at) ? timeOf(mine.starts_at!) : t.match.today;
  return {
    matchId: mine.match_id,
    playerId: me,
    line: [when, who, category].filter(Boolean).join(' · '),
    when,
    who,
    category,
    today: true,
    startsAt: mine.starts_at ?? '',
  };
}

export interface TodayRow {
  match: CardMatch;
  /** played: who won, and what your call brought when the result is still in your inbox */
  result?: { winner: Side; points: number | null };
  /** a closed row with no result says why in a word: «Έκλεισε», «Αναβολή» */
  note?: string;
}

export interface TodayGroup {
  /** the category, «Μ 40+»; '' for matches with none */
  key: string;
  rows: TodayRow[];
}

/** the order inside a day: timed matches by time, the ones with no time after them (in the sheet's order) */
function byTime(a: TodayRow, b: TodayRow): number {
  const x = hasTime(a.match.startsAt) ? Date.parse(a.match.startsAt!) : Infinity;
  const y = hasTime(b.match.startsAt) ? Date.parse(b.match.startsAt!) : Infinity;
  return x === y ? 0 : x < y ? -1 : 1;
}

/**
 * The day's matches as vote rows, grouped by category (founder, 22 Oct: small headers), each group by time, the groups
 * in the order of their first match. `fed` is the feed's cards by match id (your vote, the split); a match the feed does
 * not hold is still a row, open or closed by the clock. `points` is what each result is worth to you, by match id.
 */
export function todayGroups(
  matches: TournamentMatch[],
  tournamentId: string,
  fed: ReadonlyMap<string, CardMatch>,
  points: ReadonlyMap<string, number>,
  now: Date,
  t: Copy,
): TodayGroup[] {
  const groups = new Map<string, TodayRow[]>();
  for (const m of matches) {
    const match = overlayFeed(fromTournamentMatch(m, tournamentId, t, now), fed.get(m.match_id));
    const row: TodayRow = { match };
    if (m.winner_side !== null) row.result = { winner: toUiSide(m.winner_side), points: points.get(m.match_id) ?? null };
    else if (m.postponed === true) row.note = t.tournaments.detail.postponedTime;
    else if (match.closed) row.note = t.tournaments.detail.todayClosed;
    const key = match.category ?? '';
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const out = [...groups.entries()].map(([key, rows]): TodayGroup => ({ key, rows: [...rows].sort(byTime) }));
  return out.sort((x, y) => byTime(x.rows[0]!, y.rows[0]!) || x.key.localeCompare(y.key, 'el'));
}

/**
 * Πρόγραμμα lets you vote too (founder, 27 Oct): a match that is still open takes the same vote row as Σήμερα. Open means
 * no result, not put off, both sides known (a «θα φανεί» side has nobody to vote for), not your own match (the server
 * refuses `own_match`), and not past its lock, by the clock or by the feed's own `lockAt`. Returns the row's match, with
 * your vote and the split laid over it when the feed holds it, or null when the schedule row stays as it is. The server
 * still decides; this only keeps a dead button off the page.
 */
export function scheduleVoteMatch(
  m: TournamentMatch,
  tournamentId: string,
  me: string | null,
  fed: CardMatch | undefined,
  now: Date,
  t: Copy,
): CardMatch | null {
  if (resolved(m) || m.postponed === true) return null;
  if (sideOf(m, 1).length === 0 || sideOf(m, 2).length === 0) return null;
  if (me !== null && [1, 2].some((n) => sideOf(m, n as 1 | 2).some((p) => p.id === me))) return null;
  const card = overlayFeed(fromTournamentMatch(m, tournamentId, t, now), fed);
  if (card.closed) return null;
  // the feed's lock is the real one (a club can close voting earlier than the clock rule)
  if (card.lockAt && Date.parse(card.lockAt) <= now.getTime()) return null;
  return card;
}
