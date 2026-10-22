import { dayKey } from '@netprophet/core';
import { accusativeWord, nameGender, type Copy } from '@netprophet/copy';
import type { FeedPlayer, GetTournamentResult, TournamentMatch } from '@netprophet/db';
import { fmt } from './votes';
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

/** NaN without a real time (none, or the import's 00:00 for a row with no time) */
const startMs = (m: TournamentMatch) => (hasTime(m.starts_at) ? Date.parse(m.starts_at!) : NaN);
const resolved = (m: TournamentMatch) => m.winner_side !== null;

/* ================= «Τώρα / Μετά», by court ================= */

export interface CourtNowNext {
  key: string;
  /** «Γήπεδο 1»; null when the schedule names no court (then there is one row for the day) */
  court: string | null;
  now: { matchId: string; pair: string } | null;
  /** `time` is «18:30», «μετά το …», or the day («Σήμερα») when the match has no time */
  next: { matchId: string; pair: string; time: string } | null;
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
    if (upcoming) next = { matchId: upcoming.match_id, pair: pairLine(upcoming, t), time: timeOf(upcoming.starts_at!) };
    else {
      const untimed = ms.filter((m) => Number.isNaN(startMs(m))).sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))[0];
      if (untimed) {
        const before = untimed.order != null
          ? all
              .filter((x) => x !== untimed && x.order != null && x.order < untimed.order! && `${(x.club ?? '').trim()}|${(x.court ?? '').trim()}` === key)
              .sort((a, b) => b.order! - a.order!)[0]
          : undefined;
        next = { matchId: untimed.match_id, pair: pairLine(untimed, t), time: before ? fmt(f.after, { match: pairLine(before, t) }) : dayLabel(dayKey(now.toISOString()), dayKey(now.toISOString()), t) };
      }
    }
    if (current || next) out.push({ key, court, now: current ? { matchId: current.match_id, pair: pairLine(current, t) } : null, next });
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
export function yoursToday(matches: TournamentMatch[], yours: Set<string>, t: Copy): YoursRow[] {
  // these are today's matches: one with no time says «Σήμερα» (never «χωρίς ώρα»)
  const today = dayKey(new Date().toISOString());
  const out: (YoursRow & { at: number })[] = [];
  for (const m of matches) {
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
  /** started within the last 90 minutes */
  now: boolean;
}

/** «Σήμερα 18:30», «Αύριο 10:00», «Σαβ 24/10 10:00» */
export function whenLine(iso: string, today: string, t: Copy): string {
  const day = dayKey(iso);
  const n = daysBetween(today, day);
  const label = n === 0 ? t.match.today : n === 1 ? t.match.tomorrow : dayShort(iso, t);
  return fmt(t.tournaments.focus.when, { day: label, time: timeOf(iso) });
}

/** where the sheet was opened: a schedule match (Πρόγραμμα, Σήμερα) or a draw slot (Ταμπλό); null: no match */
export type PathContext = { match: string } | { tab: string; round: number; slot: number } | null;
