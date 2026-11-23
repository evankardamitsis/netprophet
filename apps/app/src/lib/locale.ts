import type { Locale } from '@netprophet/copy';

/**
 * Which language the app speaks (founder, 23 Nov 2026): Greek, whatever the phone's language, unless «Γλώσσα» in
 * Ρυθμίσεις picks English. Pure, so the rule is tested; the saving lives in LocaleProvider. 'auto' is what a phone
 * with no saved pick reads (the 16 Nov rule followed the phone; that is gone).
 */
export type LocaleChoice = 'auto' | Locale;

/** on this phone: 'el' or 'en' when picked, absent for no pick (Greek) */
export const LOCALE_KEY = 'np.locale';

/** what was saved: only 'el' and 'en' count, anything else (nothing, an old value) is no pick */
export function parseChoice(stored: string | null | undefined): LocaleChoice {
  return stored === 'el' || stored === 'en' ? stored : 'auto';
}

/** the language the app shows: the pick when there is one, Greek otherwise (the phone's language does not count) */
export function resolveLocale(choice: LocaleChoice): Locale {
  return choice === 'auto' ? 'el' : choice;
}
