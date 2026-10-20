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

/** when the reply shown was asked for (0: never, or marked stale) */
let fetchedAt = 0;
/** whose get_me is held: another account's never shows */
let owner: string | null = null;
/** the one get_me on the wire, if any, and when it started */
let inflight: { promise: Promise<MeResult | null>; startedAt: number; owner: string | null } | null = null;

/** get_me older than this is read again when a screen comes into view */
export const ME_STALE_MS = 30_000;

export interface LoadMeOptions {
  /** the account (session user id); a different one drops what is held */
  owner?: string | null;
  /**
   * Reuse the reply held if it is younger than this; 0 always asks the server (an in-flight request is still
   * reused). Default ME_STALE_MS.
   */
  maxAgeMs?: number;
  /**
   * Something changed on the server at this time (a vote, a result): an in-flight request that started before it
   * may carry the old numbers and is not reused.
   */
  since?: number;
  now?: number;
}

/**
 * The one way to read get_me: at most one request on the wire (every caller in the same moment shares it), and a
 * fresh reply is reused instead of asking again. Resolves to the newest reply (null when it failed and none is held).
 */
export function loadMe(fetchMe: () => Promise<MeResult>, opts: LoadMeOptions = {}): Promise<MeResult | null> {
  const now = opts.now ?? Date.now();
  const who = opts.owner ?? null;
  if (who !== owner) {
    if (owner !== null || shown !== null) clearMe();
    owner = who;
  }
  const maxAge = opts.maxAgeMs ?? ME_STALE_MS;
  if (inflight && inflight.owner === who && (opts.since === undefined || inflight.startedAt >= opts.since)) return inflight.promise;
  if (shown && fetchedAt > 0 && now - fetchedAt < maxAge && (opts.since === undefined || fetchedAt >= opts.since)) {
    return Promise.resolve(shown);
  }
  const ticket = meTicket();
  const entry = {
    startedAt: now,
    owner: who,
    promise: fetchMe().then(
      (me) => {
        publishMe(me, ticket, now);
        return shown;
      },
      () => shown,
    ).finally(() => {
      if (inflight === entry) inflight = null;
    }),
  };
  inflight = entry;
  return entry.promise;
}

/** whether the reply held is older than `maxAgeMs` (or there is none) */
export function meIsStale(now: number = Date.now(), maxAgeMs: number = ME_STALE_MS): boolean {
  return !shown || fetchedAt === 0 || now - fetchedAt >= maxAgeMs;
}

/** something the reply carries changed on the server (the profile, the avatar): the next read asks again */
export function markMeStale(): void {
  fetchedAt = 0;
}

/** call when a get_me starts; hand the ticket to `publishMe` with its reply */
export function meTicket(): number {
  nextTicket += 1;
  return nextTicket;
}

/** a get_me reply (`askedAt`: when it was asked for); kept only if no newer fetch has already landed. Returns whether it is now the one shown. */
export function publishMe(me: MeResult, ticket: number, askedAt: number = Date.now()): boolean {
  if (ticket < shownTicket) return false;
  shownTicket = ticket;
  shown = me;
  fetchedAt = askedAt;
  listeners.forEach((l) => l());
  return true;
}

/** signed out: nothing to show */
export function clearMe(): void {
  shown = null;
  fetchedAt = 0;
  inflight = null;
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
