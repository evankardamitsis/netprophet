import type { GetLookResult } from '@netprophet/db';

/**
 * One equipped look for the whole app (founder: «my Baller on the nav should reflect the looks I customise»).
 * useLook() used to keep the look in each hook instance, so the header kept the old kit after the wardrobe changed
 * it. Now every fetch and every equip lands here and every instance reads the same look.
 *
 * Replies can come back out of order, or after a sign-out: each change takes a ticket and a reply older than the
 * one shown is dropped.
 */
let shown: GetLookResult | null = null;
let shownTicket = 0;
let nextTicket = 0;
/** whose look is held: another account's never shows */
let owner: string | null = null;
let inflight: { promise: Promise<GetLookResult | null>; owner: string } | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function claim(who: string) {
  if (who !== owner) {
    if (owner !== null || shown !== null) clearLook();
    owner = who;
  }
}

function publish(look: GetLookResult, ticket: number): boolean {
  if (ticket < shownTicket) return false;
  shownTicket = ticket;
  shown = look;
  notify();
  return true;
}

/** whose look is held (null: nobody's) */
export function lookOwner(): string | null {
  return owner;
}

export function currentLook(): GetLookResult | null {
  return shown;
}

export function subscribeLook(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/**
 * Read the look from the server for `who`: one request on the wire at a time (every caller in the same moment shares
 * it). Resolves to the newest look held, or null when it failed and none is held.
 */
export function loadLook(fetchLook: () => Promise<GetLookResult>, who: string): Promise<GetLookResult | null> {
  claim(who);
  if (inflight && inflight.owner === who) return inflight.promise;
  nextTicket += 1;
  const ticket = nextTicket;
  const entry = {
    owner: who,
    promise: fetchLook()
      .then(
        (look) => {
          if (owner !== who) return null;
          publish(look, ticket);
          return shown;
        },
        // keep what is on screen
        () => (owner === who ? shown : null),
      )
      .finally(() => {
        if (inflight === entry) inflight = null;
      }),
  };
  inflight = entry;
  return entry.promise;
}

/**
 * Change the look at once (`optimistic`), then let the server decide (`send` resolves to its look). Every screen sees
 * both steps. If the server refuses, everyone goes back to what was shown. True when it stuck.
 */
export async function changeLook(
  who: string,
  optimistic: (look: GetLookResult) => GetLookResult,
  send: () => Promise<GetLookResult>,
): Promise<boolean> {
  claim(who);
  const prev = shown;
  if (!prev) return false;
  nextTicket += 1;
  const ticket = nextTicket;
  const mine = optimistic(prev);
  publish(mine, ticket);
  // a read that started before this may carry the old look: it must not land over it
  inflight = null;
  try {
    const fresh = await send();
    if (owner !== who) return false;
    // a newer change since (a second equip) wins over this reply
    publish(fresh, ticket);
    return true;
  } catch {
    // put it back, unless signed out or another change has replaced it meanwhile
    if (owner === who && shown === mine) {
      nextTicket += 1;
      publish(prev, nextTicket);
    }
    return false;
  }
}

/** signed out, or another account: nothing to show */
export function clearLook(): void {
  shown = null;
  owner = null;
  inflight = null;
  // a request started before this never lands
  nextTicket += 1;
  shownTicket = nextTicket;
  notify();
}
