import type { Locale } from '@netprophet/copy';

/**
 * Which language the app speaks (founder, 16 Nov 2026): a Greek phone gets Greek, any other phone English, unless
 * «Γλώσσα» in Ρυθμίσεις picks one. Pure, so the rule is tested; the device read and the saving live in LocaleProvider.
 */
export type LocaleChoice = 'auto' | Locale;

/** on this phone: 'el' or 'en' when picked, absent for «Αυτόματα» */
export const LOCALE_KEY = 'np.locale';

/** what was saved: only 'el' and 'en' count, anything else (nothing, an old value) is «Αυτόματα» */
export function parseChoice(stored: string | null | undefined): LocaleChoice {
  return stored === 'el' || stored === 'en' ? stored : 'auto';
}

/** the phone's language code («el», «en», «de») as a locale: Greek stays Greek, the rest of the world reads English */
export function deviceLocale(languageCode: string | null | undefined): Locale {
  return languageCode?.toLowerCase() === 'el' ? 'el' : 'en';
}

/** the language the app shows: the pick when there is one, the phone's otherwise */
export function resolveLocale(choice: LocaleChoice, languageCode: string | null | undefined): Locale {
  return choice === 'auto' ? deviceLocale(languageCode) : choice;
}
