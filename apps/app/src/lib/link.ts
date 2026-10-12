import { nameGender, withArticleAccusative, type Copy, type Locale, type NameGender } from '@netprophet/copy';
import type { MatchLink, MatchLinkView } from '@netprophet/db';
import { fmt } from './votes';

/**
 * The opponent link /m/<token> (prototype isOpv): what the logger shares, and what the person opening it needs.
 * Pure helpers; the host and the pending token live in linkHost.ts.
 */
export const linkUrl = (token: string, base: string) => `${base}/m/${token}`;

/** «netprophet.gr/m/k3x9»: the bar on top of the page */
export const linkLabel = (token: string, base: string) => linkUrl(token, base).replace(/^https?:\/\//, '');

interface Named {
  first_name: string | null;
  surname?: string | null;
  gender?: NameGender | null;
}

/** «Ο Βαγγέλης», «Η Μαρία Καρρά» in Greek; the bare name in English */
export function who(p: Named, full = false, locale: Locale = 'el'): string {
  const name = [p.first_name, full ? p.surname : null].filter(Boolean).join(' ');
  if (locale !== 'el') return name;
  return `${nameGender(p.first_name ?? '', p.gender) === 'f' ? 'Η' : 'Ο'} ${name}`;
}

/** «τον Βαγγέλη» (the copy adds the σ of «στον») in Greek; the bare first name in English */
export function toWhom(p: Named, locale: Locale = 'el'): string {
  if (locale !== 'el') return p.first_name ?? '';
  return withArticleAccusative(p.first_name ?? '', '', p.gender).trim();
}

/** «Ο Βαγγέλης Κ.»: the share preview's title */
export function whoShort(p: Named, locale: Locale = 'el'): string {
  const initial = p.surname ? ` ${p.surname.charAt(0)}.` : '';
  return who({ first_name: (p.first_name ?? '') + initial, gender: p.gender ?? nameGender(p.first_name ?? '') }, false, locale);
}

/** whole days the link still works, at least 1 while it is open */
export function daysLeft(expiresAt: string, now: Date): number {
  return Math.max(1, Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 86_400_000));
}

/** the text that goes out: the preview's two lines, then the link (one per opponent in doubles, by first name) */
export function shareMessage(links: MatchLink[], title: string, body: string, base: string): string {
  const urls = links.length === 1 ? [linkUrl(links[0]!.token, base)] : links.map((l) => `${l.first_name}: ${linkUrl(l.token, base)}`);
  return [title, body, ...urls].join('\n');
}

/** the four scores of «Πώς έληξε;», from the visitor's side (same as the feed card) */
export function fixChoices(view: MatchLinkView) {
  const firsts = (side: number) => (view.sides.find((s) => s.side === side)?.players ?? []).map((p) => p.first_name).join(' & ');
  const us = firsts(view.my_side);
  const them = firsts(view.my_side === 1 ? 2 : 1);
  return [
    { label: `2-0 ${us}`, fix: { winner: 'me' as const, sets: '2-0' as const } },
    { label: `2-1 ${us}`, fix: { winner: 'me' as const, sets: '2-1' as const } },
    { label: `2-1 ${them}`, fix: { winner: 'them' as const, sets: '2-1' as const } },
    { label: `2-0 ${them}`, fix: { winner: 'them' as const, sets: '2-0' as const } },
  ];
}

export function titleFor(view: MatchLinkView, t: Copy, locale: Locale = 'el'): string {
  const logger = view.logged_by ? who(view.logged_by, true, locale) : '';
  return fmt(view.format === 'singles' ? t.link.title : t.link.titleDoubles, { who: logger });
}

/* mock mode and the dev guest: the prototype's match (Βαγγέλης Καρδαμίτσης beat Γιώργος Παπαδάκης 2-1) */
export const MOCK_TOKEN = 'k3x9';

export function mockLinkView(): MatchLinkView {
  return {
    match_id: 'mock',
    format: 'singles',
    starts_at: new Date().toISOString(),
    tournament: null,
    sides: [
      { side: 1, players: [{ id: 'me', first_name: 'Βαγγέλης', surname: 'Καρδαμίτσης', photo_path: null, area_id: null, level_tier: null, level_direction: 'same' }] },
      { side: 2, players: [{ id: 'gio', first_name: 'Γιώργος', surname: 'Παπαδάκης', photo_path: null, area_id: null, level_tier: null, level_direction: 'same' }] },
    ],
    my_side: 2,
    winner_side: 1,
    score: '2-1',
    player: { id: 'gio', first_name: 'Γιώργος', surname: 'Παπαδάκης', gender: 'm', hidden: false, claimed: false },
    logged_by: { player_id: 'me', first_name: 'Βαγγέλης', surname: 'Καρδαμίτσης', gender: 'm' },
    state: 'pending',
    kudo: null,
    expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
  };
}
