/**
 * Tournament and club logos (founder, 18 Oct 2026): staff upload a small square image; the app shows it round next to
 * the name. Pure helpers shared by the upload action and the page, so the rules live in one place.
 * The `logos` bucket (migration 20270212000000_logos.sql) enforces the same size and types.
 */

export type LogoKind = 'tournament' | 'club';

/** 512 KB, the bucket's limit */
export const LOGO_MAX_BYTES = 512 * 1024;

export const LOGO_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
} as const;

export type LogoMime = keyof typeof LOGO_TYPES;

/** what the file input accepts */
export const LOGO_ACCEPT = Object.keys(LOGO_TYPES).join(',');

export const isLogoKind = (k: unknown): k is LogoKind => k === 'tournament' || k === 'club';

/** A quick check before uploading: the declared type and the size. Null when fine, else the problem in plain words. */
export function logoProblem(file: { type: string; size: number }): string | null {
  if (!(file.type in LOGO_TYPES)) return 'Use a PNG, JPG or WebP image.';
  if (file.size <= 0) return 'The file is empty.';
  if (file.size > LOGO_MAX_BYTES) return `The image is ${Math.ceil(file.size / 1024)} KB. Keep it under 512 KB.`;
  return null;
}

/** The real type from the first bytes, so a renamed file cannot pass as an image. */
export function sniffLogo(bytes: Uint8Array): LogoMime | null {
  const at = (i: number) => bytes[i] ?? -1;
  if (at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47) return 'image/png';
  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return 'image/jpeg';
  const ascii = (from: number, to: number) => String.fromCharCode(...Array.from(bytes.slice(from, to)));
  if (bytes.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  return null;
}

/**
 * Where a logo goes: `<kind>s/<id>/<stamp>.<ext>`. Every upload gets a new name, so a replaced logo is never served
 * from a cache. The database accepts only paths in the row's own folder.
 */
export function logoPath(kind: LogoKind, id: string, mime: LogoMime, stamp: string): string {
  const safe = stamp.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40) || 'logo';
  return `${kind}s/${id}/${safe}.${LOGO_TYPES[mime]}`;
}

/** the public URL of a logo in the `logos` bucket */
export function logoUrl(base: string, path: string | null | undefined): string | null {
  if (!path || !base) return null;
  return `${base.replace(/\/+$/, '')}/storage/v1/object/public/logos/${path.split('/').map(encodeURIComponent).join('/')}`;
}
