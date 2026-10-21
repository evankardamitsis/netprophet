import { dayKey, formatWinnerSets } from '@netprophet/core';
import { accusativeWord, nameGender, type Copy } from '@netprophet/copy';
import type { FeedPlayer, GetTournamentResult, TournamentDraw, TournamentMatch } from '@netprophet/db';
import { fmt } from './votes';
import { placeLine } from './place';
import { daysBetween, dayShort, ddmm, roundName, timeOf } from './tournaments';

/**
 * The tournament page made smart (founder, 21 Oct: "smart and not cluttering"): it opens on today, says what plays
 * now and next on each court, marks your people, and gives one player's run in the tournament on a long press.
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

const startMs = (m: TournamentMatch) => (m.starts_at ? Date.parse(m.starts_at) : NaN);
const resolved = (m: TournamentMatch) => m.winner_side !== null;

/* ================= «Τώρα / Μετά», by court ================= */

export interface CourtNowNext {
  key: string;
  /** «Γήπεδο 1»; null when the schedule names no court (then there is one row for the day) */
  court: string | null;
  now: { matchId: string; pair: string } | null;
  /** `time` is «18:30», «χωρίς ώρα ακόμα», or «μετά το …» */
  next: { matchId: string; pair: string; time: string } | null;
}

/** a match's place in its court's order, when the source gives one (the schedule's row number) */
type Ordered = TournamentMatch & { order?: number | null };

/**
 * Per court: what is playing now (started within the last 90 minutes, no result, not put off; the latest when two
 * overlap) and what is next (the earliest still to start). A match with no time reads «μετά το {previous}» when the
 * court has an order, else «χωρίς ώρα ακόμα». Courts with neither are left out; natural order of the court names.
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
        next = { matchId: untimed.match_id, pair: pairLine(untimed, t), time: before ? fmt(f.after, { match: pairLine(before, t) }) : f.noTime };
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
        time: m.postponed === true ? t.tournaments.detail.postponedTime : m.starts_at ? timeOf(m.starts_at) : t.tournaments.focus.noTime,
        against: fmt(t.tournaments.focus.against, { name: surnamesAcc(other) || t.tournaments.detail.tbd }),
        at: m.postponed === true || !m.starts_at ? Infinity : startMs(m),
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

export interface PlayerPath {
  /** «Ροδίτης Νίκος» (the partner after «&» in doubles) */
  name: string;
  previous: PathMatch[];
  next: NextMatch | null;
  /** the draws they are in (their tabs), first the one with their latest match */
  draws: string[];
}

const playsIn = (m: TournamentMatch, id: string): 1 | 2 | null =>
  sideOf(m, 1).some((p) => p.id === id) ? 1 : sideOf(m, 2).some((p) => p.id === id) ? 2 : null;

/** the draws that have this player among their entrants (a matched sheet name) */
export function drawsOf(draws: TournamentDraw[], playerId: string): string[] {
  return draws.filter((d) => d.entrants.some((e) => e.players.some((p) => p.player_id === playerId))).map((d) => d.tab);
}

/** «Σήμερα 18:30», «Αύριο 10:00», «Σαβ 24/10 10:00» */
function whenLine(iso: string, today: string, t: Copy): string {
  const day = dayKey(iso);
  const n = daysBetween(today, day);
  const label = n === 0 ? t.match.today : n === 1 ? t.match.tomorrow : dayShort(iso, t);
  return fmt(t.tournaments.focus.when, { day: label, time: timeOf(iso) });
}

/**
 * What one player did in this tournament and what comes next, from the schedule (results, ✓ on wins) and, when the
 * schedule has nothing on them, from the draws (the organiser's sheet). Null when they are nowhere in it.
 */
export function playerPath(d: GetTournamentResult, playerId: string, now: Date, t: Copy): PlayerPath | null {
  const today = dayKey(now.toISOString());
  const nowMs = now.getTime();
  const theirs = d.days
    .flatMap((x) => x.matches)
    .filter((m) => playsIn(m, playerId) !== null)
    .sort((a, b) => (a.starts_at ?? '9').localeCompare(b.starts_at ?? '9'));
  const draws = drawsOf(d.draws, playerId);
  if (theirs.length === 0 && draws.length === 0) return null;

  let name = '';
  for (const m of theirs) {
    const side = sideOf(m, playsIn(m, playerId)!);
    const me = side.find((p) => p.id === playerId)!;
    const partner = side.filter((p) => p.id !== playerId);
    name = [`${me.surname} ${me.first_name}`, ...partner.map((p) => `${p.surname} ${p.first_name}`)].join(' & ');
    break;
  }

  const previous: PathMatch[] = theirs
    .filter(resolved)
    .map((m) => {
      const n = playsIn(m, playerId)!;
      const hasScore = (m.sets?.length ?? 0) > 0 || m.walkover === true;
      return {
        matchId: m.match_id,
        day: m.starts_at ? dayShort(m.starts_at, t) : '',
        meta: m.level ?? null,
        against: fmt(t.tournaments.focus.against, { name: surnamesAcc(sideOf(m, n === 1 ? 2 : 1)) || t.tournaments.detail.tbd }),
        score: hasScore ? formatWinnerSets(m.sets ?? [], { retired: m.retired === true, walkover: m.walkover === true }, t.results) : null,
        won: m.winner_side === n,
      };
    });

  const open = theirs.filter((m) => !resolved(m));
  const timed = open.filter((m) => m.postponed !== true && m.starts_at && nowMs - startMs(m) < NOW_WINDOW_MS);
  const pick = timed[0] ?? open.find((m) => m.postponed === true) ?? null;
  let next: NextMatch | null = null;
  if (pick) {
    const n = playsIn(pick, playerId)!;
    next = {
      matchId: pick.match_id,
      when: pick.postponed === true || !pick.starts_at ? t.tournaments.detail.postponedTime : whenLine(pick.starts_at, today, t),
      place: placeLine(pick, t, true),
      against: fmt(t.tournaments.focus.against, { name: surnamesAcc(sideOf(pick, n === 1 ? 2 : 1)) || t.tournaments.detail.tbd }),
      now: !!pick.starts_at && pick.postponed !== true && startMs(pick) <= nowMs,
    };
  } else {
    next = nextFromDraws(d.draws.filter((x) => draws.includes(x.tab)), playerId, new Set(d.masked.map(rawKey)), t);
  }
  if (!name) name = drawName(d.draws, playerId) ?? '';
  return { name, previous: previous.length > 0 ? previous : previousFromDraws(d.draws.filter((x) => draws.includes(x.tab)), playerId, new Set(d.masked.map(rawKey)), t), next, draws };
}

/* ---------- the draw side (sheet names, matched to roster ids through the entrants) ---------- */

const rawKey = (s: string) => s.trim().toLowerCase();

function rawsOf(draw: TournamentDraw, playerId: string): Set<string> {
  const out = new Set<string>();
  for (const e of draw.entrants) {
    if (e.players.some((p) => p.player_id === playerId)) {
      out.add(rawKey(e.raw));
      for (const p of e.players) if (p.player_id === playerId) out.add(rawKey(p.raw));
    }
  }
  return out;
}

const inSide = (raw: string | null, mine: Set<string>) => {
  if (!raw) return false;
  if (mine.has(rawKey(raw))) return true;
  return raw.split('/').some((p) => mine.has(rawKey(p)));
};

/** «Ροδίτης Νίκος» from «ΡΟΔΙΤΗΣ ΝΙΚΟΣ» is left to the sheet's own writing: the name as the organiser wrote it */
function drawName(draws: TournamentDraw[], playerId: string): string | null {
  for (const d of draws) for (const e of d.entrants) for (const p of e.players) if (p.player_id === playerId) return p.raw;
  return null;
}

/** the keys («round-slot») of a knockout draw's matches this player is in: their path, to light up */
export function pathKeys(draw: TournamentDraw, playerId: string): Set<string> {
  const mine = rawsOf(draw, playerId);
  const out = new Set<string>();
  for (const round of draw.rounds) for (const m of round) if (inSide(m.side1, mine) || inSide(m.side2, mine)) out.add(`${m.round}-${m.slot}`);
  return out;
}

function previousFromDraws(draws: TournamentDraw[], playerId: string, masked: Set<string>, t: Copy): PathMatch[] {
  const out: PathMatch[] = [];
  for (const d of draws) {
    const mine = rawsOf(d, playerId);
    d.rounds.forEach((round, ri) => {
      for (const m of round) {
        if (!m.winner || m.bye) continue;
        const n = inSide(m.side1, mine) ? 1 : inSide(m.side2, mine) ? 2 : null;
        if (!n) continue;
        const other = (n === 1 ? m.side2 : m.side1) ?? '';
        out.push({
          matchId: `${d.tab}-${m.round}-${m.slot}`,
          day: '',
          meta: [d.tab, roundName(ri, d.rounds.length, t)].join(' · '),
          against: fmt(t.tournaments.focus.against, { name: other ? shown(other, masked, t) : t.tournaments.detail.tbd }),
          score: m.scoreRaw || (m.walkover ? t.results.walkover : null),
          won: m.winner === n,
        });
      }
    });
  }
  return out;
}

function nextFromDraws(draws: TournamentDraw[], playerId: string, masked: Set<string>, t: Copy): NextMatch | null {
  for (const d of draws) {
    const mine = rawsOf(d, playerId);
    for (const round of d.rounds) {
      for (const m of round) {
        if (m.winner || m.bye) continue;
        const n = inSide(m.side1, mine) ? 1 : inSide(m.side2, mine) ? 2 : null;
        if (!n) continue;
        const other = (n === 1 ? m.side2 : m.side1) ?? '';
        return {
          matchId: null,
          when: m.when || (m.deadline ? fmt(t.tournaments.detail.until, { date: ddmm(m.deadline) }) : t.tournaments.detail.tbd),
          place: null,
          against: fmt(t.tournaments.focus.against, { name: other.trim() ? shown(other, masked, t) : t.tournaments.detail.tbd }),
          now: false,
        };
      }
    }
  }
  return null;
}

/* ================= «Αν κερδίσει»: the next slot in a knockout draw ================= */

/** where the sheet was opened: a schedule match (Πρόγραμμα, Σήμερα) or a draw slot (Ταμπλό); null: no match */
export type PathContext = { match: string } | { tab: string; round: number; slot: number } | null;

export interface IfWins {
  /** the draw it reads from */
  tab: string;
  /** the match it is about («round-slot»), lit in the draw */
  key: string;
  /** «Αν κερδίσει αυτό το ματς (Ημιτελικά): Ροδίτης ή Δεσύπρης», «Επόμενος: …», «Παίζει τον τελικό», «Έφυγε στα ημιτελικά» */
  line: string;
  /** the next match's day or deadline as the draw writes it, when known */
  when: string | null;
  /** the slot they move to when they win, marked in the draw */
  nextKey: string | null;
}

const isMasked = (raw: string, masked: Set<string>) => masked.has(rawKey(raw)) || raw.split('/').some((p) => masked.has(rawKey(p)));
const isBye = (raw: string | null) => !!raw && ['bye', 'βυε'].includes(rawKey(raw));

/** a side as written on the sheet, «–» for a hidden player or a minor */
function shown(raw: string, masked: Set<string>, t: Copy): string {
  return isMasked(raw, masked) ? t.tournaments.detail.masked : raw.trim();
}

const drawWhen = (m: { when: string; deadline: string | null } | undefined, t: Copy): string | null =>
  !m ? null : m.when || (m.deadline ? fmt(t.tournaments.detail.until, { date: ddmm(m.deadline) }) : null);

/** who waits in the next round for the winner of round index `ri`, slot `slot`: known, «A ή B», or not yet */
function nextOpponent(draw: TournamentDraw, ri: number, slot: number, masked: Set<string>, t: Copy): { who: string; when: string | null } {
  const f = t.tournaments.focus;
  const nextSlot = Math.ceil(slot / 2);
  const next = draw.rounds[ri + 1]?.find((m) => m.slot === nextSlot);
  const otherRaw = slot % 2 === 1 ? next?.side2 : next?.side1;
  if (otherRaw && otherRaw.trim() && !isBye(otherRaw)) return { who: shown(otherRaw, masked, t), when: drawWhen(next, t) };
  const sibling = draw.rounds[ri]?.find((m) => m.slot === (slot % 2 === 1 ? slot + 1 : slot - 1));
  if (sibling) {
    const a = sibling.side1?.trim() ?? '';
    const b = sibling.side2?.trim() ?? '';
    if (sibling.winner) {
      const w = sibling.winner === 1 ? a : b;
      if (w) return { who: shown(w, masked, t), when: drawWhen(next, t) };
    }
    if (a && isBye(b)) return { who: shown(a, masked, t), when: drawWhen(next, t) };
    if (b && isBye(a)) return { who: shown(b, masked, t), when: drawWhen(next, t) };
    if (a && b) return { who: fmt(f.either, { a: shown(a, masked, t), b: shown(b, masked, t) }), when: drawWhen(sibling, t) };
  }
  return { who: t.tournaments.detail.tbd, when: null };
}

/** «Έφυγε στα ημιτελικά», by the round's place from the end */
function outLine(ri: number, total: number, t: Copy): string {
  const o = t.tournaments.focus.out;
  const fromEnd = total - 1 - ri;
  if (fromEnd === 0) return o.final;
  if (fromEnd === 1) return o.semi;
  if (fromEnd === 2) return o.quarter;
  return fmt(o.roundN, { n: ri + 1 });
}

type Slot = { draw: TournamentDraw; ri: number; slot: number };

/** the draw match a schedule match is: the player on one side and an opponent of theirs on the other */
function slotOfMatch(d: GetTournamentResult, playerId: string, matchId: string): Slot | null {
  const m = d.days.flatMap((x) => x.matches).find((x) => x.match_id === matchId);
  const n = m ? playsIn(m, playerId) : null;
  if (!m || !n) return null;
  const opponents = sideOf(m, n === 1 ? 2 : 1).map((p) => p.id);
  for (const draw of d.draws) {
    if (draw.format !== 'knockout') continue;
    const mine = rawsOf(draw, playerId);
    if (mine.size === 0) continue;
    const theirs = new Set(opponents.flatMap((id) => [...rawsOf(draw, id)]));
    for (let ri = 0; ri < draw.rounds.length; ri += 1) {
      for (const x of draw.rounds[ri]!) {
        if ((inSide(x.side1, mine) && inSide(x.side2, theirs)) || (inSide(x.side2, mine) && inSide(x.side1, theirs))) return { draw, ri, slot: x.slot };
      }
    }
  }
  return null;
}

/** with no match to go by: the player's first match still to play in a draw, else their last one */
function upcomingSlot(d: GetTournamentResult, playerId: string): Slot | null {
  let last: Slot | null = null;
  for (const draw of d.draws) {
    if (draw.format !== 'knockout') continue;
    const mine = rawsOf(draw, playerId);
    if (mine.size === 0) continue;
    for (let ri = 0; ri < draw.rounds.length; ri += 1) {
      for (const x of draw.rounds[ri]!) {
        if (!inSide(x.side1, mine) && !inSide(x.side2, mine)) continue;
        if (!x.winner && !x.bye) return { draw, ri, slot: x.slot };
        last = { draw, ri, slot: x.slot };
      }
    }
  }
  return last;
}

/**
 * «Αν κερδίσει» (founder, 21 Oct): from the match the name was held on (else the player's upcoming one), who they meet
 * in the next round if they win it: known, «A ή B», or «θα φανεί». A match already played says where it led:
 * «Επόμενος: …», out in that round, or the title. Knockout draws only; null without one.
 */
export function ifWins(d: GetTournamentResult, playerId: string, ctx: PathContext, t: Copy): IfWins | null {
  const f = t.tournaments.focus;
  const masked = new Set(d.masked.map(rawKey));
  let at: Slot | null = null;
  if (ctx && 'tab' in ctx) {
    const draw = d.draws.find((x) => x.tab === ctx.tab && x.format === 'knockout');
    const ri = draw ? draw.rounds.findIndex((r) => r.some((m) => m.round === ctx.round)) : -1;
    if (draw && ri >= 0) at = { draw, ri, slot: ctx.slot };
  } else if (ctx && 'match' in ctx) at = slotOfMatch(d, playerId, ctx.match);
  const fromContext = at !== null;
  at = at ?? upcomingSlot(d, playerId);
  if (!at) return null;
  const { draw, ri, slot } = at;
  const m = draw.rounds[ri]?.find((x) => x.slot === slot);
  if (!m) return null;
  const mine = rawsOf(draw, playerId);
  const side = inSide(m.side1, mine) ? 1 : inSide(m.side2, mine) ? 2 : null;
  const total = draw.rounds.length;
  const final = ri === total - 1;
  const base = { tab: draw.tab, key: `${m.round}-${m.slot}` };
  const nextKey = final ? null : `${draw.rounds[ri + 1]?.[0]?.round ?? m.round + 1}-${Math.ceil(slot / 2)}`;
  if (m.winner && side && m.winner !== side) return { ...base, line: outLine(ri, total, t), when: null, nextKey: null };
  if (final) return { ...base, line: m.winner ? f.title : f.playsFinal, when: m.winner ? null : drawWhen(m, t), nextKey: null };
  const opp = nextOpponent(draw, ri, slot, masked, t);
  if (m.winner || m.bye) return { ...base, line: fmt(f.nextIs, { who: opp.who }), when: opp.when, nextKey };
  const line = fromContext ? fmt(f.ifWinsMatch, { round: roundName(ri, total, t), who: opp.who }) : fmt(f.ifWinsNext, { who: opp.who });
  return { ...base, line, when: opp.when, nextKey };
}
