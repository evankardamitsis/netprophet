import type { el } from './el';

export type Locale = 'el' | 'en';
export const LOCALES: readonly Locale[] = ['el', 'en'];

/** The Greek dictionary is the contract; en.ts is typed against it. */
export type Copy = typeof el;
