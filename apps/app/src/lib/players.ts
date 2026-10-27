import { formatSideSets, localParts } from '@netprophet/core';
import { accusativeName, nameGender, type Copy, levelNumber } from '@netprophet/copy';
import type { PlayerCard, PlayerMatchLine, PlayerProfile, PlayerRef } from '@netprophet/db';
import { initials, roundLabel, when } from './feed';
import { playerAvatar, type AvatarLook } from './avatar';
import { dayLabel } from './results';
import { fmt } from './votes';
import { categoryLabel } from './category';
import { PLAYER_LEVEL_SHOWN } from './levelShown';
import { joinSegs, segmentsOf, type NameSeg } from './tournamentToday';

/**
 * Παίκτες (prototype V2, isPlayers and the profile overlay): pure mapping from api rows to what the
 * screens show. Copy comes from @netprophet/copy, grammar from its Greek helpers.
 */

export type FormDot = 'W' | 'L';

export interface PlayerRow {
  id: string;
  /** full name, «Νίκος Ροδίτης» */
  name: string;
  initials: string;
  /** the drawn player when they have an account; else the initials show */
  look: AvatarLook | null;
  /** «level 5 · Γλυφάδα · φίλος» */
  sub: string;
  /** oldest first */
  form: FormDot[];
}

/**
 * One row of «Τελευταία ματς» (founder, 22 Oct 2026: it rendered strangely): who they played, the score from this
 * player's side, ✓ for a win, and a quiet line with the day, the tournament, the category and the round.
 */
export interface LastMatchLine {
  key: string;
  won: boolean;
  /** «6-4, 3-6, 10-8» from this player's side; «1-2» when only the sets are known; «w/o» */
  score: string;
  /** «Άννα Μάνου», or the pair across the net on doubles: «Α Β & Γ Δ» */
  against: string;
  /** «με Μαρία Καρρά» on doubles */
  partner: string | null;
  /** the same two lines as pieces, each name with its roster id: a tap on a name opens that player's card */
  againstSegs: NameSeg[];
  partnerSegs: NameSeg[] | null;
  /** «Χθες · Open Γλυφάδας · Μ 40+ · Διπλό · Ημιτελικός»: never a time */
  meta: string;
  /** «Χθες · Μ 40+ · Διπλό» (Εγώ's «Τα ματς σου») */
  when: string;
}

export interface ProfileView {
  id: string;
  first: string;
  surname: string;
  /** «level 5»; null while the level is not known */
  level: string | null;
  /** «Γλυφάδα · ↑ Ανεβαίνει» */
  sub: string;
  /** «14 νίκες · 6 ήττες» */
  record: string;
  form: FormDot[];
  isFollowed: boolean;
  isMe: boolean;
  /** an account holds this player: «Δεν είμαι εγώ;» for everyone else */
  claimed: boolean;
  /** the roster's gender, for «Αυτός / Αυτή είμαι εγώ» (null: from the name) */
  gender: 'm' | 'f' | null;
  /** «Σήμερα 18:00 με Δημήτρη Γκότση» */
  next: string | null;
  last: LastMatchLine[];
}

/** «1.632»: Greek thousands separator. */
export function thousands(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

const fullName = (p: Pick<PlayerRef, 'first_name' | 'surname'>) => `${p.first_name} ${p.surname}`.trim();

export function toPlayerRow(card: PlayerCard, areas: Record<string, string>, t: Copy): PlayerRow {
  const g = nameGender(card.first_name, card.gender);
  const parts = [
    PLAYER_LEVEL_SHOWN && card.level_tier != null ? `${t.level.label} ${levelNumber(card.level_tier)}` : null,
    card.area_id ? areas[card.area_id] ?? null : null,
    card.is_followed ? t.players.friend[g] : null,
  ].filter(Boolean);
  return {
    id: card.id,
    name: fullName(card),
    initials: initials(card.first_name, card.surname),
    look: playerAvatar(card.id, card.gender, card.avatar),
    sub: parts.join(' · '),
    form: card.form,
  };
}

function plural(n: number, forms: { one: string; many: string }): string {
  return n === 1 ? forms.one : forms.many;
}

/** The player's name in a «με …» line: the stored accusative when there is one, else the grammar helper. */
function nameAcc(p: PlayerRef): string {
  return typeof p.name_forms?.accusative === 'string' && p.name_forms.accusative
    ? p.name_forms.accusative
    : accusativeName(p.first_name, p.surname, p.gender);
}

/**
 * Your next match in three parts, so «Το ματς σου» can give each its own line (founder, 16 Oct: easy to read):
 * when («Αύριο 19:30»), who («απέναντι Ανδρέας Γιαννίτσης & Άλεξ Κλουδάς») and the category («-40 · Διπλό»).
 */
export function nextParts(m: PlayerMatchLine, t: Copy, now: Date): { when: string; who: string; category: string | null } {
  const label = when(m.starts_at, now, t).label ?? '';
  const full =
    m.partner.length > 0 || m.opponents.length > 1
      ? fmt(t.players.nextAgainst, { when: '', names: m.opponents.map(fullName).join(' & ') })
      : fmt(t.players.nextWith, { when: '', name: m.opponents[0] ? nameAcc(m.opponents[0]) : '' });
  return { when: label, who: full.replace(/^[\s·]+/, ''), category: categoryLabel(m.level, m.discipline, t) };
}

export function nextLine(m: PlayerMatchLine, t: Copy, now: Date): string {
  const p = nextParts(m, t, now);
  const line =
    m.partner.length > 0 || m.opponents.length > 1 ? [p.when, p.who].filter(Boolean).join(' · ') : [p.when, p.who].filter(Boolean).join(' ');
  return [line, p.category].filter(Boolean).join(' · ');
}

export function toProfile(p: PlayerProfile, areas: Record<string, string>, t: Copy, now: Date): ProfileView {
  const g = nameGender(p.first_name, p.gender);
  const dir = p.level_direction === 'up' ? t.players.direction.up : p.level_direction === 'down' ? t.players.direction.down : t.players.direction.same[g];
  const area = p.area_id ? areas[p.area_id] ?? null : null;
  const { w, l } = p.record_year;
  return {
    id: p.id,
    first: p.first_name,
    surname: p.surname,
    level: PLAYER_LEVEL_SHOWN && p.level_tier != null ? `${t.level.label} ${levelNumber(p.level_tier)}` : null,
    sub: [area, PLAYER_LEVEL_SHOWN && p.level_tier != null ? dir : null].filter(Boolean).join(' · '),
    record: fmt(t.players.record, { w, wins: plural(w, t.players.wins), l, losses: plural(l, t.players.losses) }),
    form: p.form,
    isFollowed: p.is_followed,
    isMe: p.is_me,
    claimed: p.claimed === true,
    gender: p.gender ?? null,
    next: p.next_match ? nextLine(p.next_match, t, now) : null,
    last: p.last_matches.map((m) => lastLine(m, t, now)),
  };
}

/** «Χθες», «Την Κυριακή», «12/10», and «12/10/25» for another year: the day only, never a time */
export function matchDay(startsAt: string | null, now: Date, t: Copy): string | null {
  if (!startsAt) return null;
  const label = dayLabel(startsAt, now, t);
  const p = localParts(startsAt);
  const year = localParts(now.toISOString()).year;
  return /^\d+\/\d+$/.test(label) && p.year !== year ? `${label}/${String(p.year).slice(-2)}` : label;
}

export function lastLine(m: PlayerProfile['last_matches'][number], t: Copy, now: Date): LastMatchLine {
  const day = matchDay(m.starts_at, now, t);
  const category = categoryLabel(m.level, m.discipline, t);
  return {
    key: m.match_id,
    won: m.won,
    score: formatSideSets(m.sets ?? [], m.won, m.score, { retired: m.retired, walkover: m.walkover }, t.results),
    against: m.opponents.map(fullName).join(' & '),
    partner: m.partner.length > 0 ? fmt(t.players.withPartner, { names: m.partner.map(nameAcc).join(' & ') }) : null,
    againstSegs: joinSegs(m.opponents, (p) => ({ text: fullName(p), id: p.id })),
    partnerSegs: m.partner.length > 0 ? segmentsOf(t.players.withPartner, { names: joinSegs(m.partner, (p) => ({ text: nameAcc(p), id: p.id })) }) : null,
    meta: [day, m.tournament ?? null, category, roundLabel(m.round ?? null, t)].filter(Boolean).join(' · '),
    when: [day, category].filter(Boolean).join(' · '),
  };
}
