/**
 * How Baller answers a poke (founder, 17 Oct): a tap squashes it; the fifth tap inside 1.2s makes it dizzy and the
 * count starts again. Pure, so the timing rule is tested apart from the animation.
 */
export const DIZZY_TAPS = 5;
export const DIZZY_WINDOW_MS = 1200;

export function nextPoke(taps: number[], now: number): { taps: number[]; move: 'squash' | 'dizzy' } {
  const recent = [...taps.filter((t) => now - t < DIZZY_WINDOW_MS), now];
  return recent.length >= DIZZY_TAPS ? { taps: [], move: 'dizzy' } : { taps: recent, move: 'squash' };
}
