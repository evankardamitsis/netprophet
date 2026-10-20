import { accusativeName, nameGender, type Copy, levelNumber } from '@netprophet/copy';
import type { PlayerCard, PlayerMatchLine, PlayerProfile, PlayerRef } from '@netprophet/db';
import { initials, when } from './feed';
import { playerAvatar, type AvatarLook } from './avatar';
import { dayLabel } from './results';
import { fmt } from './votes';
import { categoryLabel } from './category';
import { PLAYER_LEVEL_SHOWN } from './levelShown';

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

export interface LastMatchLine {
  /** «Νίκη 2-1» */
  result: string;
  /** «· Δημήτρης Γκότσης» or «· παρτενέρ …, απέναντι … & …» */
  against: string;
  /** «Χθες», «Την Κυριακή» */
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
    next: p.next_match ? nextLine(p.next_match, t, now) : null,
    last: p.last_matches.map((m) => ({
      result: fmt(m.won ? t.players.won : t.players.lost, { score: m.walkover ? t.results.walkover : m.score ?? '' }).trim(),
      against:
        m.partner.length > 0
          ? fmt(t.players.againstPair, { partner: fullName(m.partner[0]!), names: m.opponents.map(fullName).join(' & ') })
          : fmt(t.players.against, { name: m.opponents[0] ? fullName(m.opponents[0]) : '' }),
      when: [dayLabel(m.starts_at, now, t), categoryLabel(m.level, m.discipline, t)].filter(Boolean).join(' · '),
    })),
  };
}
