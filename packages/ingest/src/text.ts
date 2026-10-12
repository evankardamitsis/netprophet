/** Greek text folding for matching: no accents, lowercase, final ς as σ, single spaces. */
export function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ς/g, 'σ')
    .replace(/\s+/g, ' ')
    .trim();
}
