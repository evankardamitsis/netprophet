/**
 * What every player email shares: the row api.admin_emails_due hands over (DueEmail), the rendered email (Mail), and
 * build(), which puts a kind's parts into the one layout with the footer, the reason line and the unsubscribe link.
 * The templates live per slice (lifecycle.ts, pro.ts, ...) and are registered in ./index.ts.
 */
import { accusativeWord, nameGender } from '@netprophet/copy';
import { SITE_URL, esc, renderEmail, type Hero } from '../emailLayout';

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
export const unsubscribeUrl = (token: string) => `${SITE_URL}/email/unsubscribe?t=${encodeURIComponent(token)}`;

/** «Νίκο»: the first name as used in a greeting (the same form the medal email uses) */
export function hello(first: string | null): string | null {
  const f = first?.trim();
  return f ? accusativeWord(f, nameGender(f)) : null;
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
  const unsub = e.group !== 'account' && e.unsubscribe_token ? unsubscribeUrl(e.unsubscribe_token) : undefined;
  const { html, text } = renderEmail({
    lang: 'el',
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

