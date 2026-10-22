/**
 * Picks the largest display size at which a label fits its box in at most `maxLines` lines without a word being broken
 * (founder, TestFlight 17: quiz answers were cut off). Pure, so it can be tested: the display face runs about
 * 0.5em a letter in Greek, a little over the lowercase average, which keeps the estimate on the safe side. The
 * caller passes the width it measured, so the percent mark, padding and screen size are all counted.
 */
export const CHAR_EM = 0.5;
/** line height as a multiple of the size; under 1.1 accents on «Ά», «Ό» and descenders on «ς», «ρ» are clipped */
export const LINE_RATIO = 1.15;

export interface Fit {
  fontSize: number;
  lineHeight: number;
  lines: number;
}

function linesAt(words: string[], size: number, width: number): number | null {
  const max = Math.floor(width / (size * CHAR_EM));
  if (max < 1) return null;
  let lines = 1;
  let used = 0;
  for (const w of words) {
    if (w.length > max) return null;
    const need = used === 0 ? w.length : used + 1 + w.length;
    if (need <= max) used = need;
    else {
      lines += 1;
      used = w.length;
    }
  }
  return lines;
}

export function fitText(label: string, width: number, base: number, min = 18, maxLines = 3): Fit {
  const words = label.split(/\s+/).filter(Boolean);
  const line = (s: number) => Math.round(s * LINE_RATIO);
  if (words.length === 0 || width <= 0) return { fontSize: base, lineHeight: line(base), lines: 1 };
  for (let s = base; s >= min; s -= 1) {
    const n = linesAt(words, s, width);
    if (n !== null && n <= maxLines) return { fontSize: s, lineHeight: line(s), lines: n };
  }
  // nothing fits whole: the smallest size, and the text wraps inside its word as far as it has to
  return { fontSize: min, lineHeight: line(min), lines: Math.max(1, Math.ceil((label.length * min * CHAR_EM) / width)) };
}
