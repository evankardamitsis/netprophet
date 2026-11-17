/**
 * The emails for people who are not players yet (founder's email board, approved 17 Nov 2026):
 *   site_confirm  the consent request after the sign-up box on netprophetapp.com (double opt-in)
 *   site_weekly   Monday's week on court, to confirmed sign-ups without an account
 *   launch_v1     the launch email to the old NetProphet's accounts; not queued per row: scripts/launch-email.mjs
 *                 renders it and leaves it as a draft broadcast in Resend, where the founder presses Send.
 * The database queues the first two (migration 20270425000000_email_list) and hands over the subscriber's token and
 * language; the payload of site_weekly is core.list_week. A line without data is left out, never shown empty.
 */
import { displayName, getCopy, tidyName, type Locale } from '@netprophet/copy';
import { formatWinnerSets, type WinnerFirstSet } from '@netprophet/core';
import { colors } from '@netprophet/tokens';
import { SITE_URL, block, esc, renderEmail, type EmailLang, type Hero } from '../emailLayout';
import { OPEN_URL, type DueEmail, type Mail } from './core';

const FONT = 'Helvetica,Arial,sans-serif';

const langOf = (e: DueEmail): EmailLang => (e.lang === 'en' ? 'en' : 'el');
const withLang = (url: string, lang: EmailLang) => (lang === 'en' ? `${url}&l=en` : url);

/** the website's pages for list tokens (k=list tells them it is not an account's token) */
export const listConfirmUrl = (token: string, lang: EmailLang) =>
  withLang(`${SITE_URL}/email/confirm?t=${encodeURIComponent(token)}`, lang);
export const listUnsubscribeUrl = (token: string, lang: EmailLang) =>
  withLang(`${SITE_URL}/email/unsubscribe?t=${encodeURIComponent(token)}&k=list`, lang);
export const SCREEN_URL = (name: string) => `${SITE_URL}/email/screens/${name}.jpg`;

const strip = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');

interface ListParts {
  lang: EmailLang;
  subject: string;
  preheader: string;
  hero: Hero;
  body: string[];
  text: string[];
  why: string;
  unsubscribeUrl?: string;
}

function compose(p: ListParts): Mail {
  const { html, text } = renderEmail({
    lang: p.lang,
    subject: p.subject,
    preheader: esc(p.preheader),
    hero: p.hero,
    bodyHtml: p.body.join('\n'),
    bodyText: [strip(p.hero.title), p.hero.sub ? strip(p.hero.sub) : '', '', ...p.text].join('\n'),
    why: p.why,
    unsubscribeUrl: p.unsubscribeUrl,
  });
  return { subject: p.subject, html, text, unsubscribeUrl: p.unsubscribeUrl };
}

const WHY_LIST: Record<EmailLang, string> = {
  el: 'Το πήρες επειδή γράφτηκες στο netprophetapp.com.',
  en: 'You signed up at netprophetapp.com.',
};

/** a small centred grey line under a button */
const small = (text: string) =>
  `<p style="margin:0;font-family:${FONT};font-size:13px;line-height:19px;color:${colors.inkSoft};text-align:center">${esc(text)}</p>`;

// ── site_confirm ─────────────────────────────────────────────────────────────────────────────────────────────────

const CONFIRM = {
  el: {
    subject: 'Ένα tap ακόμα',
    preheader: 'Και κάθε Δευτέρα έχεις τα αποτελέσματα της εβδομάδας.',
    sub: 'Και κάθε Δευτέρα πρωί έχεις στο email τι έγινε στα γήπεδα.',
    button: 'Ναι, θέλω τα αποτελέσματα',
    notYou: 'Δεν ήσουν εσύ; Αγνόησέ το και δεν θα ξανακούσεις από εμάς.',
  },
  en: {
    subject: 'One more tap',
    preheader: 'And every Monday you get the week’s results.',
    sub: 'And every Monday morning you get what happened on court.',
    button: 'Yes, send me the results',
    notYou: 'Wasn’t you? Ignore this and you won’t hear from us again.',
  },
};

export function siteConfirmEmail(e: DueEmail): Mail {
  const lang = langOf(e);
  const c = CONFIRM[lang];
  const tok = e.unsubscribe_token;
  // a test row has no subscriber: the button opens the page that says the link is not valid
  const confirm = tok ? listConfirmUrl(tok, lang) : `${SITE_URL}/email/confirm`;
  return compose({
    lang,
    subject: c.subject,
    preheader: c.preheader,
    hero: { title: esc(c.subject), sub: esc(c.sub), art: 'wave' },
    body: [block.button(confirm, c.button), small(c.notYou)],
    text: [`${c.button}: ${confirm}`, '', c.notYou],
    why: WHY_LIST[lang],
    unsubscribeUrl: tok ? listUnsubscribeUrl(tok, lang) : undefined,
  });
}

// ── site_weekly ──────────────────────────────────────────────────────────────────────────────────────────────────

interface Person {
  first?: string;
  surname?: string;
}
interface WeekMatch {
  tournament?: string;
  category?: string;
  round?: string;
  winner?: Person[];
  loser?: Person[];
  sets?: WinnerFirstSet[];
  retired?: boolean;
  walkover?: boolean;
  pct?: number;
}
interface Week {
  played?: number;
  upsets?: number;
  titles_count?: number;
  upset?: WeekMatch;
  titles?: WeekMatch[];
  next?: number;
  next_tournament?: string;
  next_tournament_n?: number;
}

/** «Πευκάκος Λ.», a pair as «Πευκάκος Λ. & Ρεματάς Μ.»; Latin letters in English */
export function sideName(side: Person[] | undefined, lang: EmailLang): string {
  return (side ?? [])
    .map((p) => {
      const sur = tidyName(p.surname ?? '');
      const first = tidyName(p.first ?? '');
      const name = [sur, first ? `${first.charAt(0)}.` : ''].filter(Boolean).join(' ');
      return displayName(name, lang);
    })
    .filter(Boolean)
    .join(' & ');
}

const sets = (m: WeekMatch, lang: EmailLang) => {
  const words = getCopy(lang as Locale).results;
  return formatWinnerSets(m.sets ?? [], { retired: !!m.retired, walkover: !!m.walkover }, { retired: words.retired, walkover: words.walkover });
};
const setsWon = (m: WeekMatch): [string, string] => {
  if (m.walkover || !m.sets?.length) return ['', ''];
  return [String(m.sets.filter((s) => s.w > s.l).length), String(m.sets.filter((s) => s.l > s.w).length)];
};

/** «Open Γλυφάδας · 40+ · Προημιτελικά» */
function matchMeta(m: WeekMatch, lang: EmailLang): string {
  const rounds = getCopy(lang as Locale).results.rounds as Record<string, string>;
  const round = m.round ? rounds[m.round] : undefined;
  return [m.tournament, m.category, round].filter((x): x is string => !!x && x.trim() !== '').join(' · ');
}

/** a result on an ink card: the pill (lime: what happened), the winner, the loser, the score under them */
function resultCard(pill: string, m: WeekMatch, foot: string, lang: EmailLang): string {
  const [ws, ls] = setsWon(m);
  const row = (name: string, score: string, won: boolean) =>
    `<tr><td style="padding:2px 0;font-family:${FONT};font-size:16px;line-height:22px;font-weight:${won ? 700 : 400};color:${won ? colors.paper : '#A9BBAF'}">${esc(name)}</td>` +
    `<td align="right" style="padding:2px 0;font-family:${FONT};font-size:16px;line-height:22px;font-weight:700;color:${won ? colors.lime : '#A9BBAF'}">${esc(score)}</td></tr>`;
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px;width:100%"><tr>` +
    `<td bgcolor="${colors.ink}" style="background-color:${colors.ink};border-radius:14px;padding:12px 16px">` +
    `<p style="margin:0 0 6px;font-family:${FONT};font-size:12px;line-height:18px;color:#A9BBAF">` +
    `<span style="display:inline-block;padding:2px 8px;border-radius:99px;background-color:${colors.lime};color:${colors.ink};font-size:11px;font-weight:700;letter-spacing:1px">${esc(pill)}</span> ${esc(matchMeta(m, lang))}</p>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%">${row(sideName(m.winner, lang), ws, true)}${row(sideName(m.loser, lang), ls, false)}</table>` +
    (foot ? `<p style="margin:6px 0 0;font-family:${FONT};font-size:13px;line-height:19px;color:#C9D4CC">${esc(foot)}</p>` : '') +
    `</td></tr></table>`
  );
}

const WEEKLY = {
  el: {
    kicker: 'Η ΕΒΔΟΜΑΔΑ ΣΤΑ ΓΗΠΕΔΑ',
    upsetSubject: (pct: number) => `Μόνο το ${pct}% το είδε να έρχεται`,
    upsetTitle: 'Η ανατροπή της εβδομάδας',
    titlesTitle: 'Οι τίτλοι της εβδομάδας',
    playedTitle: (n: number) => `${n} ματς την περασμένη εβδομάδα`,
    nextTitle: 'Τι έρχεται αυτή την εβδομάδα',
    preheader: 'Τι έγινε στα γήπεδα και τι έρχεται.',
    matches: (n: number) => `${n} ματς`,
    upsets: (n: number) => (n === 1 ? '1 ανατροπή' : `${n} ανατροπές`),
    titles: (n: number) => (n === 1 ? '1 τίτλος' : `${n} τίτλοι`),
    upsetPill: 'ΑΝΑΤΡΟΠΗ',
    titlePill: 'ΤΙΤΛΟΣ',
    saw: (pct: number) => `Μόνο το ${pct}% το είδε να έρχεται`,
    nextLead: 'Αυτή την εβδομάδα:',
    next: (n: number, t: string | undefined, all: boolean) =>
      t ? (all ? `${n} ματς στο ${t}.` : `${n} ματς, τα περισσότερα στο ${t}.`) : `${n} ματς.`,
    nextAsk: 'Θα προλάβεις να ψηφίσεις τους νικητές;',
    button: 'Ψήφισε στο NetProphet',
  },
  en: {
    kicker: 'THE WEEK ON COURT',
    upsetSubject: (pct: number) => `Only ${pct}% saw it coming`,
    upsetTitle: 'The upset of the week',
    titlesTitle: 'The titles of the week',
    playedTitle: (n: number) => `${n} matches last week`,
    nextTitle: 'What’s on this week',
    preheader: 'What happened on court and what’s next.',
    matches: (n: number) => (n === 1 ? '1 match' : `${n} matches`),
    upsets: (n: number) => (n === 1 ? '1 upset' : `${n} upsets`),
    titles: (n: number) => (n === 1 ? '1 title' : `${n} titles`),
    upsetPill: 'UPSET',
    titlePill: 'TITLE',
    saw: (pct: number) => `Only ${pct}% saw it coming`,
    nextLead: 'This week:',
    next: (n: number, t: string | undefined, all: boolean) =>
      t ? (all ? `${n === 1 ? '1 match' : `${n} matches`} at ${t}.` : `${n} matches, most at ${t}.`) : `${n === 1 ? '1 match' : `${n} matches`}.`,
    nextAsk: 'Will you call the winners in time?',
    button: 'Call them on NetProphet',
  },
};

export function siteWeeklyEmail(e: DueEmail): Mail {
  const lang = langOf(e);
  const c = WEEKLY[lang];
  const w = e.payload as Week;
  const played = w.played ?? 0;
  const upset = w.upset && typeof w.upset.pct === 'number' && w.upset.winner?.length ? w.upset : null;
  const titles = (w.titles ?? []).filter((t) => t.winner?.length);

  const subject = upset ? c.upsetSubject(upset.pct!) : titles.length ? c.titlesTitle : played ? c.playedTitle(played) : c.nextTitle;
  const title = upset ? c.upsetTitle : titles.length ? c.titlesTitle : played ? c.playedTitle(played) : c.nextTitle;
  const counts = [
    played ? c.matches(played) : '',
    played && w.upsets ? c.upsets(w.upsets) : '',
    played && w.titles_count ? c.titles(w.titles_count) : '',
  ].filter(Boolean);
  const sub = counts.length ? `${counts.join(', ')}.` : undefined;

  const body: string[] = [];
  const text: string[] = [];
  if (upset) {
    const foot = [sets(upset, lang), c.saw(upset.pct!)].filter(Boolean).join(' · ');
    body.push(resultCard(c.upsetPill, upset, foot, lang));
    text.push(`${c.upsetPill} · ${matchMeta(upset, lang)}`, `✓ ${sideName(upset.winner, lang)}`, `  ${sideName(upset.loser, lang)}`, foot, '');
  }
  for (const t of titles) {
    const foot = sets(t, lang);
    body.push(resultCard(c.titlePill, t, foot, lang));
    text.push(`${c.titlePill} · ${matchMeta(t, lang)}`, `✓ ${sideName(t.winner, lang)}`, `  ${sideName(t.loser, lang)}`, foot, '');
  }
  if (w.next) {
    const line = c.next(w.next, w.next_tournament, w.next_tournament_n === w.next);
    body.push(block.paragraph(`<strong>${esc(c.nextLead)}</strong> ${esc(line)} ${esc(c.nextAsk)}`));
    text.push(`${c.nextLead} ${line} ${c.nextAsk}`, '');
  }
  body.push(block.button(OPEN_URL, c.button));
  text.push(`${c.button}: ${OPEN_URL}`);

  const tok = e.unsubscribe_token;
  return compose({
    lang,
    subject,
    preheader: c.preheader,
    hero: { kicker: c.kicker, title: esc(title), sub: sub ? esc(sub) : undefined },
    body,
    text,
    why: WHY_LIST[lang],
    unsubscribeUrl: tok ? listUnsubscribeUrl(tok, lang) : undefined,
  });
}

// ── launch_v1 ────────────────────────────────────────────────────────────────────────────────────────────────────

/** Resend fills this in per contact in a broadcast */
export const RESEND_UNSUBSCRIBE = '{{{RESEND_UNSUBSCRIBE_URL}}}';

export const LAUNCH_FEATURES: [string, string, string][] = [
  ['feat-01-vote', 'Ψήφισε ποιος κερδίζει', 'Ένα tap στο όνομα που πιστεύεις.'],
  ['feat-02-result', 'Μάθε αν έπεσες μέσα', 'Αποτελέσματα με σκορ, μέσα στη μέρα.'],
  ['feat-04-ladder', 'Ανέβα στην Κατάταξη', 'Μηνιαία και για όλη τη σεζόν. Θα πέσεις πιο μέσα από την παρέα σου;'],
  ['feat-09-baller', 'Ντύσε τον Baller σου', 'Ο παίκτης σου, ένα μπαλάκι με χαρακτήρα.'],
  ['feat-07-player', 'Η κάρτα κάθε παίκτη', 'Φόρμα, τελευταία ματς, ρεκόρ.'],
  ['feat-stats', 'Τα στατιστικά σου · Pro', 'Νίκες, σετ, επιφάνειες, μονά και διπλά.'],
];

/** a feature row: the app screen on the left, a bold line and a quieter one on the right */
function featureRows(items: [string, string, string][]): string {
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;width:100%">` +
    items
      .map(
        ([img, title, line], i) =>
          `<tr><td width="132" valign="top" style="padding:${i ? 12 : 2}px 14px 12px 0;${i ? `border-top:1px solid ${colors.paper};` : ''}">` +
          `<img src="${SCREEN_URL(img)}" width="132" alt="" style="display:block;border:0;outline:none;width:132px;height:auto;border-radius:12px"></td>` +
          `<td valign="middle" style="padding:${i ? 12 : 2}px 0 12px;${i ? `border-top:1px solid ${colors.paper};` : ''}font-family:${FONT};font-size:14px;line-height:20px;color:${colors.inkSoft}">` +
          `<strong style="display:block;margin:0 0 4px;font-size:16px;line-height:22px;color:${colors.ink}">${esc(title)}</strong>${esc(line)}</td></tr>`,
      )
      .join('') +
    `</table>`
  );
}

export function launchEmail(opts: { unsubscribeUrl?: string } = {}): Mail {
  const unsub = opts.unsubscribeUrl ?? RESEND_UNSUBSCRIBE;
  const intro =
    'Γεια σου! Δεν πιστεύω να νόμιζες ότι σταματήσαμε. Ίσα ίσα, το φτιάξαμε όλο από την αρχή και τώρα είναι έτοιμο να το κατεβάσεις. Να τι σε περιμένει:';
  const pro = 'Παίζεις τουρνουά; Με το Pro μαθαίνεις πρώτος την κλήρωση και βλέπεις τα αναλυτικά στατιστικά του αντιπάλου σου πριν το ματς.';
  const coins = 'Τα παλιά νομίσματα δεν υπάρχουν πια. Όλοι ξεκινάνε από το μηδέν, εσύ μαζί. Μπες με αυτό το email και ο λογαριασμός σου είναι εκεί.';
  const button = 'Κατέβασε το NetProphet';
  const free = 'Δωρεάν για iPhone και Android';
  return compose({
    lang: 'el',
    subject: 'Το NetProphet άλλαξε. Έλα να το δεις.',
    preheader: 'Ψήφισε, μάθε αν έπεσες μέσα, ανέβα level. Δωρεάν.',
    hero: {
      kicker: 'ΤΟ ΝΕΟ NETPROPHET',
      title: 'Το NetProphet άλλαξε και περιμένει να το ανακαλύψεις',
      sub: 'Ένα παιχνίδι για τα τουρνουά που παίζεις και βλέπεις.',
      art: 'launch',
    },
    body: [
      block.paragraph(esc(intro)),
      featureRows(LAUNCH_FEATURES),
      block.tip(esc(pro).replace('Pro', '<strong>Pro</strong>')),
      block.paragraph(esc(coins)),
      block.button(OPEN_URL, button),
      small(free),
    ],
    text: [intro, '', ...LAUNCH_FEATURES.map(([, t, l]) => `${t}: ${l}`), '', pro, '', coins, '', `${button}: ${OPEN_URL}`, free],
    why: 'Το πήρες επειδή είχες λογαριασμό στο παλιό NetProphet.',
    unsubscribeUrl: unsub,
  });
}

/** registered with the other kinds in ./index.ts */
export const LIST_RENDER: Record<string, (e: DueEmail) => Mail> = {
  site_confirm: siteConfirmEmail,
  site_weekly: siteWeeklyEmail,
  launch_v1: () => launchEmail(),
};
