/**
 * Anyone who has not named Baller yet (new accounts too: first run leaves it out, founder 19 Oct) meets it once,
 * full screen, after a vote on Σήμερα. «Αργότερα»
 * (or naming it) means we do not ask again on this device.
 */
export const BALLER_OFFERED_KEY = 'np_baller_offered';

export function shouldOfferBaller(met: boolean | null, offered: string | null): boolean {
  return met === false && offered !== '1';
}
