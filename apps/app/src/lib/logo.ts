import { greekCaps } from '@netprophet/copy';

/**
 * Tournament and club logos (founder, 18 Oct 2026: «so players can recognize which is which»). The server sends the
 * object's path in the public `logos` bucket; staff upload every logo to a new path, so a URL never goes stale.
 */

const BUCKET = 'logos';

/** the public URL of a logo, or null without a path or a backend */
export function logoUrl(path: string | null | undefined, base: string | null | undefined = process.env.EXPO_PUBLIC_SUPABASE_URL): string | null {
  const p = (path ?? '').trim().replace(/^\/+/, '');
  const b = (base ?? '').trim().replace(/\/+$/, '');
  if (!p || !b) return null;
  return `${b}/storage/v1/object/public/${BUCKET}/${p.split('/').map(encodeURIComponent).join('/')}`;
}

/** the fallback letter: the name's first letter, in capitals without accents («Όμιλος» gives «Ο») */
export function monogram(name: string | null | undefined): string {
  const m = (name ?? '').match(/[\p{L}\p{N}]/u);
  return m ? greekCaps(m[0]) : '';
}
