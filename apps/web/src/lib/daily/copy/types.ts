// lib/daily/copy/types.ts

import type { el } from './el';

export type Locale = 'el' | 'en';

/**
 * The Greek dictionary's shape is the contract. `en.ts` is typed against it, so
 * a missing or renamed key is a compile error rather than a blank in the UI.
 */
export type Copy = typeof el;

export const LOCALES: Locale[] = ['el', 'en'];

export function isLocale(value: unknown): value is Locale {
    return value === 'el' || value === 'en';
}
