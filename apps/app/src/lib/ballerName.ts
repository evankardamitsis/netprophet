/**
 * Your Baller's name (founder, 17 Oct: "people can name their own baller"). The same shape the server checks:
 * 2 to 16 letters, Greek or Latin, one space between words. Rude words are the server's call (it folds every
 * spelling); here we only catch what can be said before sending.
 */
const WORD = '[A-Za-zΑ-Ωα-ωΆΈΉΊΌΎΏάέήίόύώϊϋΐΰς]+';
const SHAPE = new RegExp(`^${WORD}( ${WORD})*$`);

export type NameProblem = 'short' | 'long' | 'chars';

/** trimmed, with one space between words; '' when nothing is left */
export function cleanName(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

export function nameProblem(raw: string): NameProblem | null {
  const s = cleanName(raw);
  if ([...s].length < 2) return 'short';
  if ([...s].length > 16) return 'long';
  if (!SHAPE.test(s)) return 'chars';
  return null;
}

/** a ready name so nobody has to think: tennis-flavoured, the same one for the same person */
const SUGGESTED = {
  el: ['Σερβίτσας', 'Ρακετούλης', 'Μπαλίτσας', 'Φορχάντας', 'Βολεάκιας', 'Λόμπης', 'Τοπσπίνης', 'Άσος', 'Σλάισας', 'Ντροπάκιας'],
  en: ['Ace', 'Spinner', 'Lobster', 'Slice', 'Volley', 'Topspin', 'Dropshot', 'Rally', 'Smash', 'Baseline'],
} as const;

export function suggestedName(id: string, lang: 'el' | 'en'): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const list = SUGGESTED[lang];
  return list[(h >>> 0) % list.length]!;
}
