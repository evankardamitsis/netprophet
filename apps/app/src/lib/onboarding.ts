import type { Copy } from '@netprophet/copy';
import { fmt } from './votes';

/**
 * Onboarding (prototype V2, after the welcome screen): the order of steps and the small rules the
 * screens share. Differs from the prototype in one place: the name comes first, because a real
 * search for your player needs it (the prototype hard-codes «Βαγγέλης Κ»).
 *
 * Short first run (founder, 19 Oct): only what makes the game yours (name, your player, your area, your crowd), then
 * straight to the first vote card.
 * No intro slides and no «Ας ξεκινήσουμε» splash: Σήμερα teaches the vote where it happens («Ποιος κερδίζει;
 * Πάτα τον νικητή»). «Γνώρισε τον Baller σου» comes after the first vote, as it does for older accounts
 * (ballerOffer.ts). Progress lives only on the screen; the server keeps onboarding_state.done.
 */
export type Step = 'name' | 'claim' | 'area' | 'known';

/**
 * Four steps for everyone (founder, 19 Oct): «Πώς παίζεις;» (hand and tournaments) left the first run and lives in
 * Εγώ › Ρυθμίσεις. Someone who came from an opponent link («Κράτα το ματς στο προφίλ σου») only confirms their player
 * and picks who they know (prototype path ['c', 'k']), then lands in the app.
 */
export function stepsFor(fromLink = false): Step[] {
  return fromLink ? ['claim', 'known'] : ['name', 'claim', 'area', 'known'];
}

/** «1 από 4» above each step's title: where this step sits in the path it belongs to (the link path has two). */
export function stepCounter(steps: readonly Step[], step: Step, t: Copy): string {
  const n = Math.max(0, steps.indexOf(step)) + 1;
  return fmt(t.onboarding.intro.of, { n, total: steps.length });
}

export type NameMissing = 'name' | 'sport' | 'age';

/**
 * «Συνέχεια» on «Πώς σε λένε;» before the step is ready says what is still missing, one thing at a time and in the
 * order the screen shows them: the name (both parts), what you play, then the 15-and-over tick. Null when ready.
 */
export function nameMissing(v: { first: string; surname: string; sport: SportChoice | null; adult: boolean }): NameMissing | null {
  if (!v.first.trim() || !v.surname.trim()) return 'name';
  if (v.sport === null) return 'sport';
  if (!v.adult) return 'age';
  return null;
}

/**
 * The name the first step starts with: the profile's own parts, else its display name (Google), else what Sign in with
 * Apple handed over on the first sign-in (the server never sees that one in time).
 */
export function prefillName(
  profile: { first_name?: string | null; surname?: string | null; display_name?: string | null },
  apple: { first: string; surname: string } | null = null,
): { first: string; surname: string } {
  if (profile.first_name || profile.surname) return { first: profile.first_name ?? '', surname: profile.surname ?? '' };
  const split = splitName(profile.display_name);
  if (split.first || split.surname) return split;
  return apple ?? split;
}

/** «Ποια είναι η παρέα σου;» never blocks: someone who knows nobody yet goes on with «Αργότερα» */
export const KNOWN_MIN = 0;

/** «Αργότερα» with nobody picked follows this many of the most followed players around them (founder, 19 Oct) */
export const AUTO_FOLLOW = 6;

/**
 * Who «Ποια είναι η παρέα σου;» follows: the people picked, or, with nobody picked, the first AUTO_FOLLOW of the
 * suggestions. The server already ranks them (your areas, then your region, then everyone, by followers) and leaves
 * out hidden players and minors, so the area falls back on its own. Your own player (a claim still waiting for staff)
 * is never one of them.
 */
export function autoFollowIds(known: string[], suggested: { id: string }[], own: string | null = null): string[] {
  if (known.length > 0) return known;
  return suggested
    .map((p) => p.id)
    .filter((id, n, all) => id !== own && all.indexOf(id) === n)
    .slice(0, AUTO_FOLLOW);
}

/** after a link, one is enough: the logger is already picked */
export const KNOWN_MIN_LINK = 1;

/** «Αργότερα» with nobody picked, «Διάλεξε 1 ακόμα» under a minimum, then «Συνέχεια · 3 φίλοι». */
export function knownButton(n: number, t: Copy, min = KNOWN_MIN): { label: string; ready: boolean } {
  if (n < min) return { label: fmt(t.onboarding.known.need, { n: min - n }), ready: false };
  if (n === 0) return { label: t.onboarding.known.later, ready: true };
  return {
    label: fmt(t.onboarding.known.go, { n, friends: n === 1 ? t.onboarding.known.friends.one : t.onboarding.known.friends.many }),
    ready: true,
  };
}

export type Region = 'north' | 'center' | 'south';
export const REGIONS: Region[] = ['north', 'center', 'south'];

export interface Area {
  id: string;
  region: Region;
  name: string;
  sort: number;
}

/** Areas of one region, in their set order. */
export function areasOf(areas: Area[], region: Region): Area[] {
  return areas.filter((a) => a.region === region).sort((a, b) => a.sort - b.sort);
}

/** Split «Βαγγέλης Καρδαμίτσης» (from Google or the email name) into a first name and the rest. */
export function splitName(full: string | null | undefined): { first: string; surname: string } {
  const parts = (full ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2 || /[@\d_.]/.test(full ?? '')) return { first: parts.length === 1 && !/[@\d_.]/.test(parts[0]!) ? parts[0]! : '', surname: '' };
  return { first: parts[0]!, surname: parts.slice(1).join(' ') };
}

export type SportChoice = 'tennis' | 'padel' | 'both';

/** The profile keeps one primary sport; «Και τα δύο» starts with tennis and remembers both. */
export function primarySport(choice: SportChoice): 'tennis' | 'padel' {
  return choice === 'padel' ? 'padel' : 'tennis';
}

export type Hand = 'R' | 'L';

/** «Πώς παίζεις» in Ρυθμίσεις: «Δεξιόχειρας · Ένα δυο, για την εμπειρία», or a nudge when nothing is set yet. */
export function playLine(hand: string | null | undefined, tour: string | null | undefined, t: Copy): string {
  const p = t.onboarding.play;
  const h = hand === 'R' || hand === 'L' ? p.hands[hand] : null;
  const x = p.tours.find((o) => o.id === tour)?.name ?? null;
  const parts = [h, x].filter(Boolean);
  return parts.length ? parts.join(' · ') : p.unset;
}
