import { nameGender, type NameGender } from '@netprophet/copy';
import type { MyTraits, PlayerTraits, TraitRow } from '@netprophet/db';

/**
 * «Πώς παίζει» (a profile) and «Πώς σε βλέπουν» (Εγώ): pure helpers from api rows to what the screens show.
 * The database decides who may vote and what counts; these only pick the wording and the bar widths.
 */

export const TRAIT_MIN = 3;
export const TRAIT_MAX = 40;

/** the gender to word the phrases in: the player's own, else from the first name */
export function traitGender(known: 'm' | 'f' | null, firstName: string): NameGender {
  return nameGender(firstName, known);
}

/** «Φωνάζει στον εαυτό της» for a woman; English has one form */
export function traitLabel(t: { label_el: { m: string; f: string }; label_en: string }, gender: NameGender, locale: 'el' | 'en' = 'el'): string {
  return locale === 'en' ? t.label_en : t.label_el[gender];
}

/** bar width in percent: count against the top count plus one, so even the leader never fills the row */
export function barWidth(n: number, top: number): number {
  return Math.max(0, Math.min(100, Math.round((n / (top + 1)) * 100)));
}

/** the approved phrases (they get bars) and my own phrases waiting for approval */
export function splitTraits(list: TraitRow[]): { shown: TraitRow[]; pending: TraitRow[] } {
  return { shown: list.filter((t) => !t.pending), pending: list.filter((t) => t.pending) };
}

export function topCount(list: TraitRow[]): number {
  return list.reduce((m, t) => Math.max(m, t.count ?? 0), 0);
}

/** the tap, before the database answers: my vote on or off, the count with it */
export function applyTraitVote(p: PlayerTraits, traitId: string, on: boolean): PlayerTraits {
  return {
    ...p,
    traits: p.traits.map((t) =>
      t.id === traitId && !t.pending && t.mine !== on ? { ...t, mine: on, count: Math.max(0, (t.count ?? 0) + (on ? 1 : -1)) } : t,
    ),
  };
}

/** the phrase, trimmed and squeezed like the database does it; null when it is too short or too long */
export function cleanLabel(raw: string): string | null {
  const s = raw.replace(/\s+/g, ' ').trim();
  return s.length >= TRAIT_MIN && s.length <= TRAIT_MAX ? s : null;
}

/** the note under the chips: «Πάτα ό,τι ισχύει.» until I have voted, then «Μέτρησε η ψήφος σου…» */
export function hasVoted(p: PlayerTraits): boolean {
  return p.traits.some((t) => t.mine && !t.pending);
}

export type TraitErrorKind = 'not_played' | 'bad_label' | 'too_many_pending' | 'failed';

export function traitErrorKind(code: string): TraitErrorKind {
  return code === 'not_played' || code === 'bad_label' || code === 'too_many_pending' ? code : 'failed';
}

/* the guest's samples (prototype V2: Δυνατό σερβίς 23 … Κόβει πολύ την μπάλα 3) */
const t = (id: string, m: string, f: string, en: string, count: number): TraitRow => ({ id, label_el: { m, f }, label_en: en, count, mine: false, pending: false });

export function mockPlayerTraits(playerId: string, gender: 'm' | 'f' | null): PlayerTraits {
  return {
    player_id: playerId,
    gender,
    is_me: false,
    can_vote: true,
    voters: 31,
    traits: [
      t('mock-1', 'Δυνατό σερβίς', 'Δυνατό σερβίς', 'Strong serve', 23),
      t('mock-2', 'Δεν χάνει tie-break', 'Δεν χάνει tie-break', 'Never loses a tie-break', 17),
      t('mock-3', 'Αργεί να ζεσταθεί', 'Αργεί να ζεσταθεί', 'Slow to warm up', 12),
      t('mock-4', 'Fair play', 'Fair play', 'Fair play', 9),
      t('mock-5', 'Φωνάζει στον εαυτό του', 'Φωνάζει στον εαυτό της', 'Talks to themselves', 6),
      t('mock-6', 'Κόβει πολύ την μπάλα', 'Κόβει πολύ την μπάλα', 'Lots of slice', 3),
    ],
  };
}

export function mockMyTraits(): MyTraits {
  return {
    pro: false,
    gender: 'm',
    voters: 14,
    traits: [
      { id: 'mock-1', label_el: { m: 'Δυνατό σερβίς', f: 'Δυνατό σερβίς' }, label_en: 'Strong serve', count: null, share: 1 },
      { id: 'mock-2', label_el: { m: 'Fair play', f: 'Fair play' }, label_en: 'Fair play', count: null, share: 0.7 },
      { id: 'mock-3', label_el: { m: 'Αργεί να ζεσταθεί', f: 'Αργεί να ζεσταθεί' }, label_en: 'Slow to warm up', count: null, share: 0.45 },
    ],
  };
}

/** the width of a «Πώς σε βλέπουν» bar from the server's share (0..1) */
export function shareWidth(share: number): number {
  return Math.max(0, Math.min(100, Math.round(share * 100)));
}
