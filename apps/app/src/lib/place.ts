import type { Copy } from '@netprophet/copy';

/**
 * Where a match is played (founder, 14 Oct): «PRC (Μαρούσι) · Σκληρό», with the court first on a tournament's
 * schedule («Court 1 PRC · PRC (Μαρούσι) · Σκληρό»). Null when nothing is known, so the line is left out.
 */
export function placeLine(m: { club?: string | null; court?: string | null; surface?: string | null }, t: Copy, withCourt = false): string | null {
  const surface = m.surface ? t.match.surfaces[m.surface] ?? null : null;
  const parts = [withCourt ? m.court : null, m.club, surface].map((x) => (x ?? '').trim()).filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}
