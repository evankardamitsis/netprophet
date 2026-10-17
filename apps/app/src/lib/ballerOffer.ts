/**
 * Players who were here before Baller had a name meet it once, full screen, when they next open Σήμερα. «Αργότερα»
 * (or naming it) means we do not ask again on this device.
 */
export const BALLER_OFFERED_KEY = 'np_baller_offered';

export function shouldOfferBaller(met: boolean | null, offered: string | null): boolean {
  return met === false && offered !== '1';
}
