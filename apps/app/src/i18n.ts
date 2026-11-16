import { useSyncExternalStore } from 'react';
import { getCopy, type Copy, type Locale } from '@netprophet/copy';
import { resolveLocale, type LocaleChoice } from './lib/locale';

/**
 * The app's language, one store for the whole app: `useCopy()` gives the dictionary, `useLocale()` the locale, and
 * `setLocale()` changes the pick («Γλώσσα» in Ρυθμίσεις). LocaleProvider (src/lib/LocaleProvider.tsx) reads the phone
 * and the saved pick before the first screen, and saves every change; this file stays free of native modules so the
 * tests can import it.
 */

/** Greek, for the tests that import it; screens use useCopy() */
export const copy = getCopy('el');

export interface LocaleState {
  choice: LocaleChoice;
  locale: Locale;
}

let deviceCode: string | null = null;
let state: LocaleState = { choice: 'auto', locale: 'el' };
let persist: ((choice: LocaleChoice) => void) | null = null;
const listeners = new Set<() => void>();
const resets = new Set<() => void>();

function commit(choice: LocaleChoice): void {
  const locale = resolveLocale(choice, deviceCode);
  if (choice === state.choice && locale === state.locale) return;
  const changed = locale !== state.locale;
  state = { choice, locale };
  // caches that hold words in the old language empty before anything renders in the new one
  if (changed) resets.forEach((r) => r());
  listeners.forEach((l) => l());
}

/** LocaleProvider, once: the phone's language code, the saved pick and how to save the next one */
export function startLocale(languageCode: string | null, choice: LocaleChoice, save: (choice: LocaleChoice) => void): void {
  deviceCode = languageCode;
  persist = save;
  commit(choice);
}

/** «Αυτόματα», «Ελληνικά» or «English»: switches the app at once and remembers it on this phone */
export function setLocale(choice: LocaleChoice): void {
  persist?.(choice);
  commit(choice);
}

/** the language in use now, for code outside React (data caches) */
export function currentLocale(): Locale {
  return state.locale;
}

/** a module cache that holds words: emptied whenever the language changes */
export function onLocaleChange(reset: () => void): () => void {
  resets.add(reset);
  return () => {
    resets.delete(reset);
  };
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
const getState = (): LocaleState => state;

/** the pick and the language it gives: { choice: 'auto', locale: 'en' } */
export function useLocaleState(): LocaleState {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function useLocale(): Locale {
  return useLocaleState().locale;
}

export function useCopy(): Copy {
  return getCopy(useLocale());
}
