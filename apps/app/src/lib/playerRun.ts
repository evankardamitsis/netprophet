import { dayKey, formatWinnerSets } from '@netprophet/core';
import { accusativeWord, nameGender, nameKey, sameNamedPerson, tidyName, type Copy } from '@netprophet/copy';
import type { DrawEntrantRow, DrawMatchRow, FeedPlayer, GetTournamentResult, TournamentDraw, TournamentMatch } from '@netprophet/db';
import { fmt } from './votes';
import { placeLine } from './place';
import { dayShort, ddmm, parseSets, roundName } from './tournaments';
import { NOW_WINDOW_MS, whenLine, type NextMatch, type PathContext, type PathMatch } from './tournamentToday';

/**
 * One player's run in one tournament, by entry (founder, 21 Oct, after build 12 on real data): an entry is the player
 * in one draw, alone in singles or with one partner in doubles, so the run, the results and the path are the pair's.
 *
 * Why names and not only ids: the schedule and the organiser's sheets are matched to the roster separately, and the
 * same person can sit under two roster rows (live, 21 Oct: a fifth of the schedule's names had another id, or none, in
 * the draws). A hold on such a name found no draw, so nothing lit up. Here a person is their ids plus their name, and
 * a sheet name is theirs when the surname is the same and the first names agree (`sameNamedPerson`).
 */

type Person = Pick<FeedPlayer, 'id' | 'first_name' | 'surname'>;

/** the player, as the schedule or the sheet knows them */
export interface Identity {
  id: string;
  surname: string;
  first: string;
  /** the sheet's writing when the schedule does not know them («ΚΑΡΑΓΙΑΝΙΔΗΣ ΧΑΡ») */
  sheet: string | null;
}

const sideOf = (m: TournamentMatch, n: 1 | 2): Person[] => m.sides.find((s) => s.side === n)?.players ?? [];
const allMatches = (d: GetTournamentResult) => d.days.flatMap((x) => x.matches);
const rawKey = (s: string) => nameKey(s);
const isByeRaw = (raw: string | null) => !!raw && ['BYE', 'ΒΥΕ'].includes(nameKey(raw));
/** «-40», «65 +» and «Μ 40+» compare alike: no spaces, no gender letter in front */
const levelKey = (s: string | null | undefined) => nameKey(s ?? '').replace(/\s+/g, '').replace(/^(Μ|Γ|W|M|Α|Ε)(?=[-+\d])/, '');

export function identityOf(d: GetTournamentResult, playerId: string): Identity | null {
  for (const m of allMatches(d))
    for (const s of m.sides)
      for (const p of s.players) if (p.id === playerId) return { id: playerId, surname: p.surname, first: p.first_name, sheet: null };
  // held on a draw name: the schedule may know them under another id, with their name as the roster writes it
  for (const draw of d.draws)
    for (const e of draw.entrants)
      for (const p of e.players) {
        if (p.player_id !== playerId) continue;
        const known = peopleOf(d).find((x) => x.surname && sameNamedPerson(p.raw, x.surname, x.first_name));
        return known ? { id: playerId, surname: known.surname, first: known.first_name, sheet: null } : { id: playerId, surname: '', first: '', sheet: p.raw };
      }
  return null;
}

/** a roster person (a schedule side) is this player: the same id, or the same name */
export function isPerson(me: Identity, p: Person): boolean {
  if (p.id === me.id) return true;
  if (me.sheet) return sameNamedPerson(me.sheet, p.surname, p.first_name);
  return sameNamedPerson(`${p.surname} ${p.first_name}`, me.surname, me.first);
}

/** a sheet name (one player of a side) is this player */
function isRaw(me: Identity, raw: string, id: string | null): boolean {
  if (id === me.id) return true;
  if (me.sheet) return rawKey(raw) === rawKey(me.sheet);
  return sameNamedPerson(raw, me.surname, me.first);
}

/* ================= entries ================= */

export interface Entry {
  /** «MD 40+#3»: the draw's tab and the entrant's place */
  key: string;
  tab: string;
  draw: TournamentDraw;
  entrant: DrawEntrantRow;
  /** the partner in doubles, as shown («Μέμμος Ηλίας»), with the surname for «με Μέμμο» */
  partner: { name: string; surname: string; first: string } | null;
  /** «MD 40+ · με Μέμμο», or the tab alone */
  label: string;
}

/** every schedule person, to show a sheet name the way the roster writes it */
function peopleOf(d: GetTournamentResult): Person[] {
  const seen = new Map<string, Person>();
  for (const m of allMatches(d)) for (const s of m.sides) for (const p of s.players) seen.set(p.id, p);
  return [...seen.values()];
}

/** a sheet name shown: the roster's writing when someone on the schedule is that person, else tidied */
function personOfRaw(raw: string, id: string | null, people: Person[]): { surname: string; first: string } {
  const byId = id ? people.find((p) => p.id === id) : undefined;
  const p = byId ?? people.find((x) => x.surname && sameNamedPerson(raw, x.surname, x.first_name));
  if (p) return { surname: p.surname, first: p.first_name };
  const tidy = tidyName(raw.trim());
  const [surname, ...rest] = tidy.split(' ');
  return { surname: surname ?? tidy, first: rest.join(' ') };
}

/** the entrants that are this player, one per draw (id first; by name only when it points at one entrant) */
export function entriesOf(d: GetTournamentResult, me: Identity, t: Copy): Entry[] {
  const people = peopleOf(d);
  const out: Entry[] = [];
  for (const draw of d.draws) {
    const live = draw.entrants.filter((e) => !e.bye);
    let hits = live.filter((e) => e.players.some((p) => p.player_id === me.id));
    if (hits.length === 0) hits = live.filter((e) => e.players.some((p) => isRaw(me, p.raw, p.player_id)));
    if (hits.length !== 1) continue;
    const entrant = hits[0]!;
    const other = entrant.players.find((p) => !isRaw(me, p.raw, p.player_id));
    const partner = entrant.players.length > 1 && other ? personOfRaw(other.raw, other.player_id, people) : null;
    out.push({
      key: `${draw.tab}#${entrant.pos}`,
      tab: draw.tab,
      draw,
      entrant,
      partner: partner ? { name: `${partner.surname} ${partner.first}`.trim(), ...partner } : null,
      label: partner
        ? fmt(t.tournaments.focus.entryPill, { category: draw.tab, partner: accusativeWord(partner.surname, nameGender(partner.first)) })
        : draw.tab,
    });
  }
  return out;
}

/** the sides (raw) of a draw match that are this entry */
function entryRaws(e: Entry): Set<string> {
  const s = new Set<string>([rawKey(e.entrant.raw)]);
  if (e.entrant.players.length === 1) s.add(rawKey(e.entrant.players[0]!.raw));
  return s;
}

const isEntrySide = (raw: string | null, raws: Set<string>) => !!raw && raws.has(rawKey(raw));

/** a schedule side and a sheet side are the same people (every sheet name finds someone on the side) */
function sameSide(raw: string | null, side: Person[]): boolean {
  if (!raw || side.length === 0) return false;
  const parts = raw.split('/').map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 && parts.every((part) => side.some((p) => sameNamedPerson(part, p.surname, p.first_name, true)));
}

/** which of this player's entries a schedule match belongs to: discipline, level, partner, then the opponent */
export function entryOfMatch(m: TournamentMatch, me: Identity, entries: Entry[]): Entry | null {
  const n = sideOf(m, 1).some((p) => isPerson(me, p)) ? 1 : sideOf(m, 2).some((p) => isPerson(me, p)) ? 2 : null;
  if (!n) return null;
  const mine = sideOf(m, n);
  const theirs = sideOf(m, n === 1 ? 2 : 1);
  const partner = mine.find((p) => !isPerson(me, p)) ?? null;
  let best: Entry | null = null;
  let bestScore = 0;
  for (const e of entries) {
    if (m.discipline && e.draw.discipline && m.discipline !== e.draw.discipline) continue;
    const doubles = e.entrant.players.length > 1;
    if ((partner !== null) !== doubles) continue;
    let score = 1;
    if (m.level && levelKey(m.level) === levelKey(e.draw.level || e.tab)) score += 2;
    if (partner && e.partner && sameNamedPerson(`${e.partner.surname} ${e.partner.first}`, partner.surname, partner.first_name)) score += 4;
    const raws = entryRaws(e);
    const met = e.draw.rounds.some((r) => r.some((x) => (isEntrySide(x.side1, raws) && sameSide(x.side2, theirs)) || (isEntrySide(x.side2, raws) && sameSide(x.side1, theirs))));
    if (met) score += 8;
    if (score > bestScore) {
      best = e;
      bestScore = score;
    }
  }
  return best;
}

/* ================= the path ================= */

export type StepState = 'won' | 'lost' | 'bye' | 'open' | 'next' | 'later';

export interface PathStep {
  /** «round-slot» in the draw; the round robin uses «group-a-b» */
  key: string;
  /** «Α' γύρος», «Ημιτελικά», «Όμιλος 1» */
  round: string;
  state: StepState;
  /** «Δεσύπρης Γιώργος», «Ροδίτης & Πράτσας», «θα φανεί», or «A ή B» for the slot after the open match */
  against: string | null;
  /** games, theirs first: «6-1, 6-3» */
  score: string | null;
  /** «ΣΑΒ 18.30» or «έως 24/10» as the sheet writes it */
  when: string | null;
}

export interface Run {
  entry: Entry;
  steps: PathStep[];
  /** won the final */
  champion: boolean;
  /** the match key the hold was on, when it is in this draw */
  focusKey: string | null;
}

/** a side as shown: surnames for a pair, «Surname First» alone, «–» when masked */
function sideLabel(raw: string | null, d: GetTournamentResult, people: Person[], entrants: DrawEntrantRow[], t: Copy): string | null {
  const text = (raw ?? '').trim();
  if (!text || isByeRaw(text)) return null;
  const masked = new Set(d.masked.map(rawKey));
  const ent = entrants.find((e) => rawKey(e.raw) === rawKey(text));
  const parts = text.split('/').map((p) => p.trim()).filter(Boolean);
  const shown = parts.map((part) => {
    if (masked.has(rawKey(part)) || masked.has(rawKey(text))) return { surname: t.tournaments.detail.masked, first: '' };
    const id = ent?.players.find((p) => rawKey(p.raw) === rawKey(part))?.player_id ?? null;
    return personOfRaw(part, id, people);
  });
  return shown.length > 1 ? shown.map((p) => p.surname).join(' & ') : `${shown[0]!.surname} ${shown[0]!.first}`.trim();
}

const whenOf = (m: Pick<DrawMatchRow, 'when' | 'deadline'> | undefined, t: Copy): string | null =>
  !m ? null : m.when || (m.deadline ? fmt(t.tournaments.detail.until, { date: ddmm(m.deadline) }) : null);

/** «6-1, 6-3», the side's own games first */
function scoreFor(m: DrawMatchRow, side: 1 | 2, t: Copy): string | null {
  if (!m.winner) return null;
  const sets = parseSets(m.scoreRaw, m.winner);
  if (sets.length === 0) return m.walkover ? t.results.walkover : m.scoreRaw || null;
  return sets.map(([a, b]) => (side === 1 ? `${a}-${b}` : `${b}-${a}`)).join(', ');
}

/** who waits in round `ri + 1` for the winner of round `ri`, slot `slot`: known, «A ή B», or «θα φανεί» */
function waiting(draw: TournamentDraw, ri: number, slot: number, show: (raw: string | null) => string | null, t: Copy): { who: string; when: string | null } {
  const nextSlot = Math.ceil(slot / 2);
  const next = draw.rounds[ri + 1]?.find((m) => m.slot === nextSlot);
  const otherRaw = slot % 2 === 1 ? next?.side2 : next?.side1;
  const known = show(otherRaw ?? null);
  if (known) return { who: known, when: whenOf(next, t) };
  const sibling = draw.rounds[ri]?.find((m) => m.slot === (slot % 2 === 1 ? slot + 1 : slot - 1));
  if (sibling) {
    const a = show(sibling.side1);
    const b = show(sibling.side2);
    if (sibling.winner) {
      const w = sibling.winner === 1 ? a : b;
      if (w) return { who: w, when: whenOf(next, t) };
    }
    if (a && !b && (sibling.bye || isByeRaw(sibling.side2))) return { who: a, when: whenOf(next, t) };
    if (b && !a && (sibling.bye || isByeRaw(sibling.side1))) return { who: b, when: whenOf(next, t) };
    if (a && b) return { who: fmt(t.tournaments.focus.either, { a, b }), when: whenOf(sibling, t) };
  }
  return { who: t.tournaments.focus.notYet, when: whenOf(next, t) };
}

/**
 * The entry's path, R1 to the final: what happened (won, lost, a bye), the match to play, the slot it leads to
 * («next», drawn dashed) and the rounds after it («later»). A round robin lists the group's matches.
 */
export function runOf(d: GetTournamentResult, entry: Entry, t: Copy, ctx: PathContext = null): Run {
  const people = peopleOf(d);
  const draw = entry.draw;
  const show = (raw: string | null) => sideLabel(raw, d, people, draw.entrants, t);
  const raws = entryRaws(entry);
  const steps: PathStep[] = [];
  let champion = false;

  if (draw.format === 'round_robin') {
    for (const g of draw.groups ?? []) {
      const team = g.teams.find((x) => raws.has(rawKey(x.raw)));
      if (!team) continue;
      for (const m of g.matches) {
        if (m.a !== team.pos && m.b !== team.pos) continue;
        const mine: 1 | 2 = m.a === team.pos ? 1 : 2;
        const other = g.teams.find((x) => x.pos === (mine === 1 ? m.b : m.a));
        const games = m.sets.map((s) => (mine === 1 ? `${s.g[0]}-${s.g[1]}` : `${s.g[1]}-${s.g[0]}`)).join(', ');
        steps.push({
          key: `${g.name}-${m.a}-${m.b}`,
          round: fmt(t.tournaments.focus.groupStep, { group: g.name }),
          state: m.winner === null ? 'open' : m.winner === mine ? 'won' : 'lost',
          against: other ? show(other.raw) : null,
          score: m.winner === null ? null : games || (m.walkover ? t.results.walkover : null),
          when: null,
        });
      }
    }
    return { entry, steps, champion, focusKey: null };
  }

  const total = draw.rounds.length;
  let last: { ri: number; slot: number; state: StepState } | null = null;
  for (let ri = 0; ri < total; ri += 1) {
    const name = roundName(ri, total, t);
    const m = draw.rounds[ri]!.find((x) => isEntrySide(x.side1, raws) || isEntrySide(x.side2, raws));
    if (!m) {
      // the sheet has not written them into this round yet: after a win it is their match to play
      if (last && (last.state === 'won' || last.state === 'bye')) {
        const w = waiting(draw, last.ri, last.slot, show, t);
        const slot = Math.ceil(last.slot / 2);
        const key = `${draw.rounds[ri]![0]?.round ?? ri + 1}-${slot}`;
        steps.push({ key, round: name, state: 'open', against: w.who, score: null, when: w.when });
        last = { ri, slot, state: 'open' };
        break;
      }
      continue;
    }
    const side: 1 | 2 = isEntrySide(m.side1, raws) ? 1 : 2;
    const otherRaw = side === 1 ? m.side2 : m.side1;
    const key = `${m.round}-${m.slot}`;
    let state: StepState;
    if (m.bye || (!otherRaw && m.winner === side) || isByeRaw(otherRaw)) state = 'bye';
    else if (m.winner) state = m.winner === side ? 'won' : 'lost';
    else state = 'open';
    // an open match with nobody across yet: whoever comes out of the match that feeds that side
    const across = state === 'bye' ? null : show(otherRaw) ?? (last ? waiting(draw, last.ri, last.slot, show, t).who : t.tournaments.focus.notYet);
    steps.push({
      key,
      round: name,
      state,
      against: across,
      score: state === 'won' || state === 'lost' ? scoreFor(m, side, t) : null,
      when: state === 'open' ? whenOf(m, t) : null,
    });
    last = { ri, slot: m.slot, state };
    if (state === 'lost' || state === 'open') break;
    if (ri === total - 1 && state === 'won') champion = true;
  }
  // the slot an open match leads to, then the rounds after it
  if (last && last.state === 'open' && last.ri < total - 1) {
    const w = waiting(draw, last.ri, last.slot, show, t);
    const slot = Math.ceil(last.slot / 2);
    steps.push({ key: `${draw.rounds[last.ri + 1]?.[0]?.round ?? last.ri + 2}-${slot}`, round: roundName(last.ri + 1, total, t), state: 'next', against: w.who, score: null, when: w.when });
    let s = slot;
    for (let ri = last.ri + 2; ri < total; ri += 1) {
      s = Math.ceil(s / 2);
      steps.push({ key: `${draw.rounds[ri]?.[0]?.round ?? ri + 1}-${s}`, round: roundName(ri, total, t), state: 'later', against: null, score: null, when: null });
    }
  }
  return { entry, steps, champion, focusKey: focusKeyOf(d, entry, ctx) };
}

/** the draw match the hold was on, in this entry's draw: a slot from Ταμπλό, or the schedule match's two sides */
function focusKeyOf(d: GetTournamentResult, entry: Entry, ctx: PathContext): string | null {
  if (!ctx) return null;
  if ('tab' in ctx) return ctx.tab === entry.tab ? `${ctx.round}-${ctx.slot}` : null;
  const m = allMatches(d).find((x) => x.match_id === ctx.match);
  if (!m) return null;
  const raws = entryRaws(entry);
  for (const n of [1, 2] as const) {
    const theirs = sideOf(m, n === 1 ? 2 : 1);
    for (const r of entry.draw.rounds)
      for (const x of r) {
        if ((isEntrySide(x.side1, raws) && sameSide(x.side2, theirs)) || (isEntrySide(x.side2, raws) && sameSide(x.side1, theirs))) {
          if (sideOf(m, n).some((p) => isEntrySideOf(entry, p))) return `${x.round}-${x.slot}`;
        }
      }
  }
  return null;
}

const isEntrySideOf = (e: Entry, p: Person) => e.entrant.players.some((x) => (x.player_id && x.player_id === p.id) || sameNamedPerson(x.raw, p.surname, p.first_name));

/* ================= the summary ================= */

/** the entry the screen opens on: the hold's match or slot, else the one with a match still to play, else the first */
export function pickEntry(d: GetTournamentResult, me: Identity, entries: Entry[], ctx: PathContext, t: Copy): Entry | null {
  if (entries.length === 0) return null;
  if (ctx && 'tab' in ctx) return entries.find((e) => e.tab === ctx.tab) ?? entries[0]!;
  if (ctx && 'match' in ctx) {
    const m = allMatches(d).find((x) => x.match_id === ctx.match);
    const e = m ? entryOfMatch(m, me, entries) : null;
    if (e) return e;
  }
  return entries.find((e) => runOf(d, e, t).steps.some((s) => s.state === 'open')) ?? entries[0]!;
}

/** the schedule matches of this entry (all of the player's when they are in no draw) */
export function matchesOfEntry(d: GetTournamentResult, me: Identity, entries: Entry[], entry: Entry | null): TournamentMatch[] {
  return allMatches(d)
    .filter((m) => m.sides.some((s) => s.players.some((p) => isPerson(me, p))))
    .filter((m) => !entry || entryOfMatch(m, me, entries)?.key === entry.key)
    .sort((a, b) => (a.starts_at ?? '9').localeCompare(b.starts_at ?? '9'));
}

/** «Καρδαμίτσης Βαγγέλης», or «… & Μέμμος Ηλίας» for a pair */
export function titleOf(me: Identity, entry: Entry | null, t: Copy): string {
  const name = me.sheet ? tidyName(me.sheet) : `${me.surname} ${me.first}`.trim();
  return entry?.partner ? fmt(t.tournaments.focus.pairTitle, { name, partner: entry.partner.name }) : name;
}

/** «Αν κερδίσει»: from the step the hold was on (else the match to play), where it leads */
export function ifWinsLine(run: Run, t: Copy): { line: string; when: string | null } | null {
  const f = t.tournaments.focus;
  if (run.entry.draw.format !== 'knockout' || run.steps.length === 0) return null;
  const total = run.entry.draw.rounds.length;
  const at = (run.focusKey ? run.steps.findIndex((s) => s.key === run.focusKey) : -1);
  const i = at >= 0 ? at : run.steps.findIndex((s) => s.state === 'open');
  const idx = i >= 0 ? i : run.steps.length - 1;
  const step = run.steps[idx]!;
  const next = run.steps[idx + 1];
  const round = Number(step.key.split('-')[0]);
  const ri = run.entry.draw.rounds.findIndex((r) => r[0]?.round === round);
  if (step.state === 'lost') {
    const fromEnd = total - 1 - ri;
    const o = f.out;
    return { line: fromEnd === 0 ? o.final : fromEnd === 1 ? o.semi : fromEnd === 2 ? o.quarter : fmt(o.roundN, { n: ri + 1 }), when: null };
  }
  if (ri === total - 1) return { line: step.state === 'won' ? f.title : f.playsFinal, when: step.state === 'open' ? step.when : null };
  if (!next) return null;
  if (step.state === 'won' || step.state === 'bye') return { line: fmt(f.nextIs, { who: next.against ?? f.notYet }), when: next.when };
  const line = at >= 0 ? fmt(f.ifWinsMatch, { round: step.round, who: next.against ?? f.notYet }) : fmt(f.ifWinsNext, { who: next.against ?? f.notYet });
  return { line, when: next.when };
}

const surnamesAcc = (ps: Person[]) => ps.map((p) => accusativeWord(p.surname, nameGender(p.first_name))).join(' & ');
const startMs = (m: TournamentMatch) => (m.starts_at ? Date.parse(m.starts_at) : NaN);

/**
 * «Ως τώρα» and «Το επόμενο ματς» for one entry: from its schedule matches (results, ✓ on wins), and from its path in
 * the draw when the schedule has nothing on it.
 */
export function summaryOf(me: Identity, matches: TournamentMatch[], run: Run | null, now: Date, t: Copy): { previous: PathMatch[]; next: NextMatch | null } {
  const f = t.tournaments.focus;
  const today = dayKey(now.toISOString());
  const sideNo = (m: TournamentMatch): 1 | 2 => (sideOf(m, 1).some((p) => isPerson(me, p)) ? 1 : 2);
  const against = (m: TournamentMatch) => {
    const other = sideOf(m, sideNo(m) === 1 ? 2 : 1);
    return other.length > 0 ? fmt(f.against, { name: surnamesAcc(other) }) : f.notYet;
  };
  let previous: PathMatch[] = matches
    .filter((m) => m.winner_side !== null)
    .map((m) => ({
      matchId: m.match_id,
      day: m.starts_at ? dayShort(m.starts_at, t) : '',
      meta: null,
      against: against(m),
      score: (m.sets?.length ?? 0) > 0 || m.walkover === true ? formatWinnerSets(m.sets ?? [], { retired: m.retired === true, walkover: m.walkover === true }, t.results) : null,
      won: m.winner_side === sideNo(m),
    }));
  if (previous.length === 0 && run) {
    previous = run.steps
      .filter((s) => s.state === 'won' || s.state === 'lost')
      .map((s) => ({ matchId: s.key, day: '', meta: s.round, against: s.against ? fmt(f.against, { name: s.against }) : f.notYet, score: s.score, won: s.state === 'won' }));
  }
  const nowMs = now.getTime();
  const open = matches.filter((m) => m.winner_side === null);
  const pick = open.find((m) => m.postponed !== true && m.starts_at && nowMs - startMs(m) < NOW_WINDOW_MS) ?? open.find((m) => m.postponed === true) ?? null;
  if (pick) {
    return {
      previous,
      next: {
        matchId: pick.match_id,
        when: pick.postponed === true || !pick.starts_at ? t.tournaments.detail.postponedTime : whenLine(pick.starts_at, today, t),
        place: placeLine(pick, t, true),
        against: against(pick),
        now: !!pick.starts_at && pick.postponed !== true && startMs(pick) <= nowMs,
      },
    };
  }
  const step = run?.steps.find((s) => s.state === 'open');
  const next: NextMatch | null = step
    ? { matchId: null, when: step.when ?? f.notYet, place: null, against: step.against ? fmt(f.against, { name: step.against }) : f.notYet, now: false }
    : null;
  return { previous, next };
}
