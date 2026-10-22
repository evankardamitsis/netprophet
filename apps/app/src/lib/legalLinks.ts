/**
 * The legal pages on the site, opened in the browser from the Pro screen and from Εγώ › Ρυθμίσεις. The app is Greek
 * first, so the Greek pages; the site has the English ones at /en/terms and /en/privacy. Apple wants both links on
 * the subscription screen.
 */
export const SITE = 'https://netprophetapp.com';

export type LegalPage = 'terms' | 'privacy';

export function legalUrl(page: LegalPage, lang: 'el' | 'en' = 'el'): string {
  return `${SITE}${lang === 'en' ? '/en' : ''}/${page}`;
}
