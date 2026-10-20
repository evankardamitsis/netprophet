import { nameShapeOk, tidyName, type Copy } from '@netprophet/copy';
import { addDays, dayKey } from '@netprophet/core';
import type { LogMatchInput, LogPerson, MatchFormat } from '@netprophet/db';
import { fmt } from './votes';

/**
 * «+ Ματς» (prototype V2, isForm): the form's rules. Two modes («Παίχτηκε» / «Έρχεται»), when, tournament,
 * singles / doubles / mixed, the people (a partner for doubles, one or two opponents), and for a played match who
 * won and the sets. Days are Athens days. The database checks it all again (api.log_match).
 */
export type Mode = 'played' | 'soon';

/** someone picked in the form: a roster player (with what we show), or a new name */
export type PickedPerson =
  | { kind: 'player'; id: string; first: string; surname: string; sub: string }
  | { kind: 'new'; first: string; surname: string };

/**
 * A name typed for someone we do not have, as it is sent: each part tidied like onboarding («ΜΑΡΙΑ» -> «Μαρια»).
 * 'empty' while a part is blank, 'shape' when a part is not letters with at least 2 of them (the server's name_shape
 * rule, core.log_person in 20270228000000_identity_followups.sql).
 */
export function typedPerson(first: string, surname: string): { ok: true; first: string; surname: string } | { ok: false; why: 'empty' | 'shape' } {
  const f = tidyName(first);
  const s = tidyName(surname);
  if (!f || !s) return { ok: false, why: 'empty' };
  if (!nameShapeOk(f) || !nameShapeOk(s)) return { ok: false, why: 'shape' };
  return { ok: true, first: f, surname: s };
}

export type TournamentChoice = { kind: 'friendly' } | { kind: 'tournament'; id: string; name: string } | { kind: 'other'; name: string };

export interface LogForm {
  mode: Mode;
  date: string | null;
  tournament: TournamentChoice | null;
  format: MatchFormat | null;
  partner: PickedPerson | null;
  opponents: PickedPerson[];
  won: boolean | null;
  sets: '2-0' | '2-1' | null;
}

export const emptyForm = (mode: Mode): LogForm => ({ mode, date: null, tournament: null, format: null, partner: null, opponents: [], won: null, sets: null });

const WEEKDAYS = ['Κυρ', 'Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ'];

/** «Παρ 2/10» for an Athens day key */
export function shortDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const dow = new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
  return `${WEEKDAYS[dow]} ${d}/${m}`;
}

/** today and yesterday (played) or today and tomorrow (soon) */
export function quickDays(mode: Mode, now: Date, t: Copy): { key: string; label: string }[] {
  const today = dayKey(now.toISOString());
  const days = mode === 'played' ? t.addMatch.daysPlayed : t.addMatch.daysSoon;
  return [
    { key: today, label: days.today },
    { key: addDays(today, mode === 'played' ? -1 : 1), label: days.other },
  ];
}

/** «Άλλη μέρα»: the next five days back (played) or ahead (soon) after the quick ones */
export function otherDays(mode: Mode, now: Date): { key: string; label: string }[] {
  const today = dayKey(now.toISOString());
  const step = mode === 'played' ? -1 : 1;
  return [2, 3, 4, 5, 6].map((n) => {
    const key = addDays(today, n * step);
    return { key, label: shortDay(key) };
  });
}

export const opponentsNeeded = (format: MatchFormat) => (format === 'singles' ? 1 : 2);
export const needsPartner = (format: MatchFormat) => format !== 'singles';

/** the label over the people picker */
export function peopleLabel(form: LogForm, t: Copy): string {
  const a = t.addMatch;
  if (!form.format) return a.with;
  if (needsPartner(form.format) && !form.partner) return form.format === 'mixed' ? a.partner.f : a.partner.m;
  if (form.format === 'singles') return a.with;
  return (form.format === 'mixed' ? a.againstMixed : a.againstTwo) + (form.opponents.length === 1 ? a.oneMore : '');
}

/** who the picker is filling now: the partner first, then the opponents */
export function pickingPartner(form: LogForm): boolean {
  return !!form.format && needsPartner(form.format) && !form.partner;
}

export function peopleDone(form: LogForm): boolean {
  if (!form.format) return false;
  return (!needsPartner(form.format) || !!form.partner) && form.opponents.length === opponentsNeeded(form.format);
}

export const topDone = (form: LogForm) => !!form.date && !!form.tournament && !!form.format;

export function ready(form: LogForm): boolean {
  if (!topDone(form) || !peopleDone(form)) return false;
  if (form.tournament?.kind === 'other' && !form.tournament.name.trim()) return false;
  return form.mode === 'soon' || (form.won !== null && form.sets !== null);
}

/** «Μονό · Φιλικό · Σήμερα» */
export function topLine(form: LogForm, now: Date, t: Copy): string {
  const day = form.date ? [...quickDays(form.mode, now, t), ...otherDays(form.mode, now)].find((d) => d.key === form.date)?.label ?? shortDay(form.date) : '';
  const tour = !form.tournament ? '' : form.tournament.kind === 'friendly' ? t.addMatch.friendly : form.tournament.name;
  return [day, tour, form.format ? t.addMatch.kinds[form.format] : ''].filter(Boolean).join(' · ');
}

const toLogPerson = (p: PickedPerson): LogPerson =>
  p.kind === 'player' ? { player_id: p.id } : { new: { first: p.first.trim(), surname: p.surname.trim() } };

/** what api.log_match takes; `matchId` adds the result to a match already in the app */
export function toInput(form: LogForm, matchId?: string): LogMatchInput {
  return {
    mode: form.mode,
    date: form.date!,
    format: form.format!,
    tournament_id: form.tournament?.kind === 'tournament' ? form.tournament.id : null,
    tournament_suggestion: form.tournament?.kind === 'other' ? form.tournament.name.trim() : null,
    ...(form.partner ? { partner: toLogPerson(form.partner) } : {}),
    opponents: form.opponents.map(toLogPerson),
    ...(form.mode === 'played' && form.won !== null && form.sets ? { result: { won: form.won, sets: form.sets } } : {}),
    ...(matchId ? { match_id: matchId } : {}),
  };
}

/** the roster ids of everyone else in the match, for «Αυτό είναι το ματς σου;» (new names cannot match) */
export function knownPeople(form: LogForm): string[] {
  return [form.partner, ...form.opponents].flatMap((p) => (p && p.kind === 'player' ? [p.id] : []));
}

export const personName = (p: PickedPerson) => `${p.first} ${p.surname}`.trim();

export function searchLabel(total: string, t: Copy): string {
  return fmt(t.addMatch.search, { n: total });
}
