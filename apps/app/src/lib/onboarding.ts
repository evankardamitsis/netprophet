import type { Copy } from '@netprophet/copy';
import { fmt } from './votes';

/**
 * Onboarding (prototype V2, after the welcome screen): the order of steps and the small rules the
 * screens share. Differs from the prototype in one place: the name comes first, because a real
 * search for your player needs it (the prototype hard-codes «Βαγγέλης Κ»).
 *
 * Short first run (founder, 19 Oct): only what makes the game yours, then straight to the first vote card.
 * No intro slides and no «Ας ξεκινήσουμε» splash: Σήμερα teaches the vote where it happens («Ποιος κερδίζει;
 * Πάτα τον νικητή»). «Γνώρισε τον Baller σου» comes after the first vote, as it does for older accounts
 * (ballerOffer.ts). Progress lives only on the screen; the server keeps onboarding_state.done.
 */
export type Step = 'name' | 'claim' | 'play' | 'area' | 'known';

/**
 * The claimed path skips «Πώς παίζεις;»: a roster player already has a hand and a history. Someone who came
 * from an opponent link («Κράτα το ματς στο προφίλ σου») only confirms their player and picks who they know
 * (prototype path ['c', 'k']), then lands in the app.
 */
export function stepsFor(isNew: boolean, fromLink = false): Step[] {
  if (fromLink) return ['claim', 'known'];
  return isNew ? ['name', 'claim', 'play', 'area', 'known'] : ['name', 'claim', 'area', 'known'];
}

/** «Ποια είναι η παρέα σου;» never blocks: someone who knows nobody yet goes on with «Αργότερα» */
export const KNOWN_MIN = 0;

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
