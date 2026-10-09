import { el } from './el';
import { en } from './en';
import type { Copy, Locale } from './types';

export type { Copy, Locale };
export { LOCALES } from './types';
export * from './greek';

const DICTIONARIES: Record<Locale, Copy> = { el, en };

export function getCopy(locale: Locale): Copy {
  return DICTIONARIES[locale];
}
