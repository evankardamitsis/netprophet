/**
 * The Pro emails (founder's email board, approved 17 Nov 2026; decisions of the same day). The database queues them
 * from the store events (migration 20270424000000_email_pro) and checks each again at send time, so a row that
 * reaches this file holds only facts that are true now: the plan, its price, the store, the dates, the offer code.
 * Neutral Greek throughout (gender is unknown for everyone): «Μαθαίνεις πρώτα απ’ όλους», never «πρώτος».
 *
 * Dates are the Athens day («24/11»), prices with a comma and the euro sign («8,99€»).
 */
import { colors } from '@netprophet/tokens';
import { block, esc } from '../emailLayout';
import { build, OPEN_URL, type DueEmail, type Mail } from './core';

const FONT = 'Helvetica,Arial,sans-serif';

/** «8,99€» */
export function euro(n: number): string {
  return `${n.toFixed(2).replace('.', ',')}€`;
}

/** «24/11», the day in Athens */
export function dayMonth(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', day: 'numeric', month: 'numeric' }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${Number(get('day'))}/${Number(get('month'))}`;
}

interface ProPayload {
  product_id?: string;
  price?: number;
  renews?: number | null;
  period?: 'month' | 'year';
  store?: string;
  trial?: boolean;
  ends_at?: string;
  code?: string;
  code_expires_at?: string;
}

const pay = (e: DueEmail) => e.payload as ProPayload;
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
const date = (v: unknown) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? dayMonth(v) : null);

/** what the plan costs from the first charge: «8,99€ τον μήνα», «49,99€ τον πρώτο χρόνο, 69,99€ από εκεί και πέρα» */
export function planPrice(p: ProPayload): { first: string; full: string } | null {
  const price = num(p.price);
  if (price === null) return null;
  if (p.period === 'month') return { first: `${euro(price)} τον μήνα`, full: `${euro(price)} τον μήνα` };
  const renews = num(p.renews);
  if (renews !== null && renews !== price) {
    return { first: `${euro(price)} τον πρώτο χρόνο`, full: `${euro(price)} τον πρώτο χρόνο, ${euro(renews)} από εκεί και πέρα` };
  }
  return { first: `${euro(price)} τον χρόνο`, full: `${euro(price)} τον χρόνο` };
}

/** where a subscription is cancelled, by the store it was bought in */
export function storeHelp(store: string | undefined): { name: string | null; path: string | null; url: string } {
  if (store === 'APP_STORE') {
    return { name: 'App Store', path: 'Ρυθμίσεις του iPhone › το όνομά σου › Συνδρομές › NetProphet', url: 'https://apps.apple.com/account/subscriptions' };
  }
  if (store === 'PLAY_STORE') {
    return {
      name: 'Google Play',
      path: 'Google Play › το προφίλ σου › Πληρωμές και συνδρομές › Συνδρομές › NetProphet',
      url: 'https://play.google.com/store/account/subscriptions',
    };
  }
  return { name: null, path: null, url: OPEN_URL };
}

/** the winback offer (an Apple one-time offer code on pro_monthly): 3 months at half price */
export const WINBACK = { months: 3, price: 4.49, full: 8.99 } as const;
export const redeemUrl = (code: string) =>
  `https://apps.apple.com/redeem?ctx=offercodes&id=6824998331&code=${encodeURIComponent(code)}`;

const PRO_FEATURES: [string, string][] = [
  ['Ειδοποιήσεις live', 'Η κλήρωση, η ώρα σου, κάθε αλλαγή, τη στιγμή που γίνεται.'],
  ['Ο αντίπαλός σου', 'Αναλυτικά στατιστικά, τα μεταξύ σας, πώς παίζει.'],
  ['Τα στατιστικά σου', 'Νίκες, σετ, επιφάνειες, μονά και διπλά.'],
  ['12 ερωτήσεις', 'Το quiz κάθε μέρας, με διπλάσιες ερωτήσεις.'],
];

/** feature rows: an ink circle with +, a bold name and a quieter line under it */
function features(rows: [string, string][]): string {
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;width:100%">` +
    rows
      .map(
        ([name, line]) =>
          `<tr><td width="44" valign="top" style="padding:0 0 14px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="32" height="32" align="center" bgcolor="${colors.ink}" style="background-color:${colors.ink};border-radius:16px;font-family:${FONT};font-size:18px;line-height:32px;font-weight:700;color:${colors.paper}">+</td></tr></table></td>` +
          `<td valign="top" style="padding:2px 0 14px;font-family:${FONT};color:${colors.ink}"><p style="margin:0;font-size:16px;line-height:22px;font-weight:700">${esc(name)}</p><p style="margin:2px 0 0;font-size:14px;line-height:20px;color:${colors.inkSoft}">${esc(line)}</p></td></tr>`,
      )
      .join('') +
    `</table>`
  );
}

/** the offer: what you get on the left, the old and the new price on the right (no lime: nothing is earned here) */
function offer(): string {
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 22px;width:100%"><tr>` +
    `<td bgcolor="${colors.paper}" style="background-color:${colors.paper};border:1px solid ${colors.mist};border-radius:12px;padding:16px 18px;font-family:${FONT};color:${colors.ink}">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%"><tr>` +
    `<td valign="middle"><p style="margin:0;font-size:18px;line-height:24px;font-weight:700">${WINBACK.months} μήνες Pro</p>` +
    `<p style="margin:4px 0 0;font-size:14px;line-height:20px;color:${colors.inkSoft}">μετά ${euro(WINBACK.full)} τον μήνα, ακυρώνεις όποτε θες</p></td>` +
    `<td valign="middle" align="right" style="white-space:nowrap"><p style="margin:0;font-size:14px;line-height:18px;color:${colors.inkSoft}"><s>${euro(WINBACK.full)}</s></p>` +
    `<p style="margin:0;font-size:26px;line-height:30px;font-weight:700">${euro(WINBACK.price)}</p>` +
    `<p style="margin:0;font-size:12px;line-height:16px;color:${colors.inkSoft}">τον μήνα</p></td>` +
    `</tr></table></td></tr></table>`
  );
}

export function proWelcomeEmail(e: DueEmail): Mail {
  const p = pay(e);
  const checks = [
    'Η σεζόν σου μήνα με μήνα, με την πορεία σου στην Κατάταξη.',
    'Υπενθύμιση πριν από κάθε ματς σου.',
    'Μια κάρτα για κάθε νίκη, έτοιμη να τη μοιραστείς.',
  ];
  const tip = 'του NetProphet στο κινητό σου, αλλιώς οι ειδοποιήσεις του Pro δεν θα σου φτάσουν.';
  const ends = p.trial ? date(p.ends_at) : null;
  const price = planPrice(p);
  const trialLine = ends ? `Η δωρεάν εβδομάδα τελειώνει στις ${ends}.${price ? ` Μετά ${price.full}.` : ''}` : null;
  return build(e, {
    subject: 'Είσαι Pro!',
    preheader: 'Ο βοηθός της σεζόν σου ξεκίνησε.',
    hero: { kicker: 'PRO', title: 'Καλωσήρθες στο Pro!', sub: 'Ο βοηθός της σεζόν σου ξεκίνησε. Μάθε τα πάντα για τους αντιπάλους και τα στατιστικά σου.' },
    body: [
      features(PRO_FEATURES),
      block.checks(checks.map(esc)),
      block.tip(`<strong>Άνοιξε τις ειδοποιήσεις</strong> ${esc(tip)}`),
      block.button(OPEN_URL, 'Άνοιξε το Pro'),
      trialLine ? block.note(esc(trialLine)) : '',
    ].filter(Boolean),
    text: [
      ...PRO_FEATURES.map(([a, b]) => `+ ${a}: ${b}`),
      '',
      ...checks.map((c) => `✓ ${c}`),
      '',
      `Άνοιξε τις ειδοποιήσεις ${tip}`,
      '',
      `Άνοιξε το Pro: ${OPEN_URL}`,
      ...(trialLine ? ['', trialLine] : []),
    ],
    why: 'Πήρες αυτό το email επειδή ξεκίνησες το Pro στο NetProphet.',
  });
}

export function proTrialDay5Email(e: DueEmail): Mail | null {
  const p = pay(e);
  const ends = date(p.ends_at);
  if (!ends) return null;
  const price = planPrice(p);
  const store = storeHelp(p.store);
  const keep = price ? `Συνεχίζεις; Δεν κάνεις τίποτα. Στις ${ends} ξεκινάει η συνδρομή: ${price.full}.` : `Συνεχίζεις; Δεν κάνεις τίποτα. Η συνδρομή ξεκινάει στις ${ends}.`;
  const cancel = store.name
    ? `Δεν το θες; Ακύρωσέ το από τις συνδρομές του ${store.name} πριν τις ${ends}. Δεν πληρώνεις τίποτα.`
    : `Δεν το θες; Ακύρωσέ το από εκεί που το ξεκίνησες, πριν τις ${ends}. Δεν πληρώνεις τίποτα.`;
  const button = store.name ? 'Διαχείριση συνδρομής' : 'Άνοιξε το NetProphet';
  return build(e, {
    subject: '2 μέρες ακόμα δωρεάν',
    preheader: `Η συνδρομή ξεκινάει στις ${ends}.`,
    hero: {
      kicker: 'PRO',
      big: '2',
      title: 'μέρες ακόμα δωρεάν',
      sub: esc(price ? `Μετά ${price.first}, από τις ${ends}.` : `Η συνδρομή ξεκινάει στις ${ends}.`),
    },
    body: [
      block.paragraph(esc(keep)),
      block.paragraph(esc(cancel)),
      store.path ? block.note(esc(store.path)) : '',
      block.button(store.url, button),
    ].filter(Boolean),
    text: [keep, '', cancel, ...(store.path ? [store.path] : []), '', `${button}: ${store.url}`],
    why: 'Πήρες αυτό το email επειδή είσαι στη δωρεάν εβδομάδα του Pro.',
  });
}

export function proCancelEmail(e: DueEmail): Mail | null {
  const p = pay(e);
  const ends = date(p.ends_at);
  if (!ends) return null;
  const title = `Το Pro σου σταματάει στις ${ends}`;
  const free = [
    'Η ψήφος σε κάθε ματς και το σερί σου.',
    'Τα αποτελέσματα και η Κατάταξη.',
    'Το quiz της ημέρας.',
    'Ο Baller σου και ό,τι έχεις μαζέψει.',
  ];
  const trial = p.trial ? 'Ακύρωσες μέσα στη δωρεάν εβδομάδα, οπότε δεν πληρώνεις τίποτα.' : null;
  const stays = `Μετά τις ${ends} μένουν δωρεάν:`;
  const reply = 'Κάτι δεν σου άρεσε; Απάντησε σε αυτό το email. Το διαβάζει όλη η ομάδα.';
  return build(e, {
    subject: title,
    preheader: 'Ως τότε τα έχεις όλα όπως πριν.',
    hero: { kicker: 'PRO', title: esc(title), sub: 'Ως τότε τα έχεις όλα όπως πριν.' },
    body: [
      trial ? block.paragraph(esc(trial)) : '',
      block.paragraph(esc(stays)),
      block.checks(free.map(esc)),
      block.paragraph(esc(reply)),
    ].filter(Boolean),
    text: [...(trial ? [trial, ''] : []), stays, ...free.map((f) => `✓ ${f}`), '', reply],
    why: 'Πήρες αυτό το email επειδή ακύρωσες το Pro στο NetProphet.',
  });
}

export function proWinbackEmail(e: DueEmail): Mail | null {
  const p = pay(e);
  const code = typeof p.code === 'string' && p.code.trim() ? p.code.trim() : null;
  // never without a code: the database holds the email until the pool has one
  if (!code) return null;
  const url = redeemUrl(code);
  const until = date(p.code_expires_at);
  const offerLine = `${WINBACK.months} μήνες Pro στα ${euro(WINBACK.price)} τον μήνα, αντί για ${euro(WINBACK.full)}. Μετά ${euro(WINBACK.full)} τον μήνα, ακυρώνεις όποτε θες.`;
  const checks = ['Ειδοποιήσεις live για την κλήρωση και την ώρα σου.', 'Τα αναλυτικά στατιστικά του αντιπάλου σου.', 'Τα στατιστικά σου και η σεζόν σου.'];
  // founder, 18 Nov 2026: no code to copy; the button carries the person's own code
  const how = `Πάτα το κουμπί από το iPhone σου και η έκπτωση περνάει μόνη της στο App Store. Είναι μόνο για σένα${until ? ` και ισχύει ως τις ${until}` : ''}.`;
  const once = 'Δεν θα σου ξαναστείλουμε αυτή την προσφορά.';
  return build(e, {
    subject: 'Το Pro σου έληξε. Γύρνα με τη μισή τιμή',
    preheader: `${WINBACK.months} μήνες Pro στα ${euro(WINBACK.price)} τον μήνα, μόνο για σένα.`,
    hero: {
      kicker: 'PRO · ΜΟΝΟ ΓΙΑ ΣΕΝΑ',
      big: '−50%',
      title: 'Γύρνα με τη μισή τιμή',
      sub: esc(`Το Pro σου έληξε. Για να γυρίσεις, ${WINBACK.months} μήνες στα ${euro(WINBACK.price)} τον μήνα.`),
    },
    body: [
      offer(),
      block.checks(checks.map(esc)),
      block.button(url, 'Γύρνα στο Pro με −50%'),
      block.note(`${esc(how)}<br>${esc(once)}`),
    ],
    text: [offerLine, '', ...checks.map((c) => `✓ ${c}`), '', `Γύρνα στο Pro με −50%: ${url}`, '', how, '', once],
    why: 'Πήρες αυτό το email επειδή είχες Pro στο NetProphet.',
  });
}

/** the Pro kinds, registered in ./index.ts */
export const PRO_EMAILS: Record<string, (e: DueEmail) => Mail | null> = {
  pro_welcome: proWelcomeEmail,
  pro_trial_day5: proTrialDay5Email,
  pro_cancel: proCancelEmail,
  pro_winback: proWinbackEmail,
};
