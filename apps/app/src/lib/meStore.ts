import type { MeResult } from '@netprophet/db';

/**
 * One get_me for the whole app (founder, 18 Oct: «σερί 5» on one screen and «σερί 3» on another). The header and
 * Εγώ used to fetch get_me each on their own, at different times, so they could show two different σερί. Now every
 * fetch lands here and both read the newest one.
 *
 * Fetches can come back out of order: each takes a ticket when it starts and a reply older than the one shown is
 * dropped.
 */
let shown: MeResult | null = null;
let shownTicket = 0;
let nextTicket = 0;
const listeners = new Set<() => void>();

/** call when a get_me starts; hand the ticket to `publishMe` with its reply */
export function meTicket(): number {
  nextTicket += 1;
  return nextTicket;
}

/** a get_me reply; kept only if no newer fetch has already landed. Returns whether it is now the one shown. */
export function publishMe(me: MeResult, ticket: number): boolean {
  if (ticket < shownTicket) return false;
  shownTicket = ticket;
  shown = me;
  listeners.forEach((l) => l());
  return true;
}

/** signed out: nothing to show */
export function clearMe(): void {
  shown = null;
  // a fetch started before this never lands
  nextTicket += 1;
  shownTicket = nextTicket;
  listeners.forEach((l) => l());
}

export function currentMe(): MeResult | null {
  return shown;
}

export function subscribeMe(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
