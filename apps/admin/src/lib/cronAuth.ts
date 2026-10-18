import { timingSafeEqual } from 'node:crypto';

/**
 * True only when the header is exactly `Bearer <secret>`, compared in constant time.
 * Fails closed: an unset or empty secret never authorizes anything.
 */
export function bearerMatches(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header) return false;
  const given = Buffer.from(header, 'utf8');
  const expected = Buffer.from(`Bearer ${secret}`, 'utf8');
  if (given.length !== expected.length) return false;
  return timingSafeEqual(given, expected);
}

/** Vercel cron requests carry `Authorization: Bearer $CRON_SECRET`. */
export function isCronAuthorized(request: Request): boolean {
  return bearerMatches(request.headers.get('authorization'), process.env.CRON_SECRET);
}
