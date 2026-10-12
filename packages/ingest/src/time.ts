/**
 * Order-of-play times: «20.30», «20:30», «9:00», «9.00μμ»-style stray characters are stripped.
 * A blank time inherits the row above (the caller passes it as `previous`). Returns «HH:MM» or null.
 */
export function parseTime(raw: string | undefined, previous: string | null = null): string | null {
  const s = (raw ?? '').trim();
  if (s === '') return previous;
  const m = s.match(/(\d{1,2})\s*[.:,]\s*(\d{2})/) ?? s.match(/^(\d{1,2})$/);
  if (!m) return previous;
  const h = Number(m[1]);
  const min = m[2] === undefined ? 0 : Number(m[2]);
  if (h > 23 || min > 59) return previous;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}
