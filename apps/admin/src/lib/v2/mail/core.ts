/**
 * What every player email shares: the row api.admin_emails_due hands over (DueEmail), the rendered email (Mail), and
 * build(), which puts a kind's parts into the one layout with the footer, the reason line and the unsubscribe link.
 * The templates live per slice (lifecycle.ts, pro.ts, ...) and are registered in ./index.ts.
 */
import { accusativeWord, nameGender } from '@netprophet/copy';
import { SITE_URL, esc, renderEmail, type EmailLang, type Hero } from '../emailLayout';

export interface DueEmail {
  id: string;
  kind: string;
  group: 'account' | 'game' | 'pro' | 'list';
  to: string;
  payload: Record<string, unknown>;
  first_name: string | null;
  gender: string | null;
  lang: 'el' | 'en';
  unsubscribe_token: string | null;
}

export interface Mail {
  subject: string;
  html: string;
  text: string;
  /** game and Pro emails: the List-Unsubscribe link Gmail and Apple Mail show */
  unsubscribeUrl?: string;
}

export const OPEN_URL = `${SITE_URL}/open`;
/** the one-click unsubscribe page; l=en keeps it in English (apps/site app/email/unsubscribe) */
export const unsubscribeUrl = (token: string, lang: EmailLang = 'el') =>
  `${SITE_URL}/email/unsubscribe?t=${encodeURIComponent(token)}${lang === 'en' ? '&l=en' : ''}`;

/** the row's language: English only when it says so, Greek otherwise (an old row, a test) */
export const langOf = (e: DueEmail): EmailLang => (e.lang === 'en' ? 'en' : 'el');
export const isEn = (e: DueEmail) => langOf(e) === 'en';

/** one piece of copy in both languages: the Greek, or the English when the row is in English */
export function t<T>(e: DueEmail, el: T, en: T): T {
  return isEn(e) ? en : el;
}

const NUM: Record<EmailLang, Intl.NumberFormat> = { el: new Intl.NumberFormat('el-GR'), en: new Intl.NumberFormat('en-GB') };
/** «1.234» in Greek, «1,234» in English */
export const fmtNum = (n: number, lang: EmailLang = 'el') => NUM[lang].format(n);

/**
 * The first name as used in a greeting: «Νίκο» in Greek (the same form the medal email uses), as written in English
 * («Νίκος»: names stay in their own script, undeclined).
 */
export function hello(first: string | null, lang: EmailLang = 'el'): string | null {
  const f = first?.trim();
  if (!f) return null;
  return lang === 'en' ? f : accusativeWord(f, nameGender(f));
}

export const strip = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');

export interface Parts {
  subject: string;
  preheader: string;
  hero: Hero;
  /** content blocks, already HTML */
  body: string[];
  /** the same content as text lines */
  text: string[];
  why: string;
}

export function build(e: DueEmail, p: Parts): Mail {
  const unsub = e.group !== 'account' && e.unsubscribe_token ? unsubscribeUrl(e.unsubscribe_token, langOf(e)) : undefined;
  const { html, text } = renderEmail({
    lang: langOf(e),
    subject: p.subject,
    preheader: esc(p.preheader),
    hero: p.hero,
    bodyHtml: p.body.join('\n'),
    bodyText: [strip((p.hero.big ? `${p.hero.big} ` : '') + p.hero.title), p.hero.sub ? strip(p.hero.sub) : '', '', ...p.text].join('\n'),
    why: p.why,
    unsubscribeUrl: unsub,
  });
  return { subject: p.subject, html, text, unsubscribeUrl: unsub };
}

