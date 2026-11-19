/**
 * The Pro emails (founder's email board, approved 17 Nov 2026; decisions of the same day). The database queues them
 * from the store events (migration 20270424000000_email_pro) and checks each again at send time, so a row that
 * reaches this file holds only facts that are true now: the plan, its price, the store, the dates, the offer code.
 * Neutral Greek throughout (gender is unknown for everyone): «Μαθαίνεις πρώτα απ’ όλους», never «πρώτος». A row in
 * English (app 1.0.1) gets the same email in English.
 *
 * Dates are the Athens day («24/11»; «24 November» in English), prices with a comma and the euro sign after
 * («8,99€»; «€8.99» in English).
 */
import { colors } from '@netprophet/tokens';
import { block, esc, type EmailLang } from '../emailLayout';
import { build, langOf, OPEN_URL, t, type DueEmail, type Mail } from './core';

const FONT = 'Helvetica,Arial,sans-serif';

/** «8,99€» in Greek, «€8.99» in English */
export function euro(n: number, lang: EmailLang = 'el'): string {
  return lang === 'en' ? `€${n.toFixed(2)}` : `${n.toFixed(2).replace('.', ',')}€`;
}

/** «24/11» in Greek, «24 November» in English: the day in Athens */
export function dayMonth(iso: string, lang: EmailLang = 'el'): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', day: 'numeric', month: lang === 'en' ? 'long' : 'numeric' }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return lang === 'en' ? `${Number(get('day'))} ${get('month')}` : `${Number(get('day'))}/${Number(get('month'))}`;
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
const date = (v: unknown, lang: EmailLang = 'el') => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? dayMonth(v, lang) : null);

/**
 * what the plan costs from the first charge: «8,99€ τον μήνα», «49,99€ τον πρώτο χρόνο, 69,99€ από εκεί και πέρα»;
 * in English «€8.99 a month», «€49.99 for the first year, €69.99 a year after that»
 */
export function planPrice(p: ProPayload, lang: EmailLang = 'el'): { first: string; full: string } | null {
  const price = num(p.price);
  if (price === null) return null;
  const en = lang === 'en';
  const eur = (n: number) => euro(n, lang);
  if (p.period === 'month') {
    const line = en ? `${eur(price)} a month` : `${eur(price)} τον μήνα`;
    return { first: line, full: line };
  }
  const renews = num(p.renews);
  if (renews !== null && renews !== price) {
    return en
      ? { first: `${eur(price)} for the first year`, full: `${eur(price)} for the first year, ${eur(renews)} a year after that` }
      : { first: `${eur(price)} τον πρώτο χρόνο`, full: `${eur(price)} τον πρώτο χρόνο, ${eur(renews)} από εκεί και πέρα` };
  }
  const line = en ? `${eur(price)} a year` : `${eur(price)} τον χρόνο`;
  return { first: line, full: line };
}

/** where a subscription is cancelled, by the store it was bought in */
export function storeHelp(store: string | undefined, lang: EmailLang = 'el'): { name: string | null; path: string | null; url: string } {
  const en = lang === 'en';
  if (store === 'APP_STORE') {
    return {
      name: 'App Store',
      path: en ? 'iPhone Settings › your name › Subscriptions › NetProphet' : 'Ρυθμίσεις του iPhone › το όνομά σου › Συνδρομές › NetProphet',
      url: 'https://apps.apple.com/account/subscriptions',
    };
  }
  if (store === 'PLAY_STORE') {
    return {
      name: 'Google Play',
      path: en
        ? 'Google Play › your profile › Payments & subscriptions › Subscriptions › NetProphet'
        : 'Google Play › το προφίλ σου › Πληρωμές και συνδρομές › Συνδρομές › NetProphet',
      url: 'https://play.google.com/store/account/subscriptions',
    };
  }
  return { name: null, path: null, url: OPEN_URL };
}

/** the winback offer (an Apple one-time offer code on pro_monthly): 3 months at half price */
export const WINBACK = { months: 3, price: 4.49, full: 8.99 } as const;
export const redeemUrl = (code: string) =>
  `https://apps.apple.com/redeem?ctx=offercodes&id=6824998331&code=${encodeURIComponent(code)}`;

const PRO_FEATURES: Record<EmailLang, [string, string][]> = {
  el: [
    ['Ειδοποιήσεις live', 'Η κλήρωση, η ώρα σου, κάθε αλλαγή, τη στιγμή που γίνεται.'],
    ['Ο αντίπαλός σου', 'Αναλυτικά στατιστικά, τα μεταξύ σας, πώς παίζει.'],
    ['Τα στατιστικά σου', 'Νίκες, σετ, επιφάνειες, μονά και διπλά.'],
    ['12 ερωτήσεις', 'Το quiz κάθε μέρας, με διπλάσιες ερωτήσεις.'],
  ],
  en: [
    ['Live alerts', 'The draw, your time, every change, the moment it happens.'],
    ['Your opponent', 'Detailed stats, your head-to-head, how they play.'],
    ['Your stats', 'Wins, sets, surfaces, singles and doubles.'],
    ['12 questions', 'The quiz of the day, with twice the questions.'],
  ],
};

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
function offer(lang: EmailLang): string {
  const en = lang === 'en';
  const eur = (n: number) => euro(n, lang);
  const what = en ? `${WINBACK.months} months of Pro` : `${WINBACK.months} μήνες Pro`;
  const after = en ? `then ${eur(WINBACK.full)} a month, cancel any time` : `μετά ${eur(WINBACK.full)} τον μήνα, ακυρώνεις όποτε θες`;
  const per = en ? 'a month' : 'τον μήνα';
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 22px;width:100%"><tr>` +
    `<td bgcolor="${colors.paper}" style="background-color:${colors.paper};border:1px solid ${colors.mist};border-radius:12px;padding:16px 18px;font-family:${FONT};color:${colors.ink}">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%"><tr>` +
    `<td valign="middle"><p style="margin:0;font-size:18px;line-height:24px;font-weight:700">${what}</p>` +
    `<p style="margin:4px 0 0;font-size:14px;line-height:20px;color:${colors.inkSoft}">${after}</p></td>` +
    `<td valign="middle" align="right" style="white-space:nowrap"><p style="margin:0;font-size:14px;line-height:18px;color:${colors.inkSoft}"><s>${eur(WINBACK.full)}</s></p>` +
    `<p style="margin:0;font-size:26px;line-height:30px;font-weight:700">${eur(WINBACK.price)}</p>` +
    `<p style="margin:0;font-size:12px;line-height:16px;color:${colors.inkSoft}">${per}</p></td>` +
    `</tr></table></td></tr></table>`
  );
}

export function proWelcomeEmail(e: DueEmail): Mail {
  const lang = langOf(e);
  const p = pay(e);
  const ends = p.trial ? date(p.ends_at, lang) : null;
  const price = planPrice(p, lang);
  const c = t(
    e,
    {
      checks: [
        'Η σεζόν σου μήνα με μήνα, με την πορεία σου στην Κατάταξη.',
        'Υπενθύμιση πριν από κάθε ματς σου.',
        'Μια κάρτα για κάθε νίκη, έτοιμη να τη μοιραστείς.',
      ],
      tipLead: 'Άνοιξε τις ειδοποιήσεις',
      tip: 'του NetProphet στο κινητό σου, αλλιώς οι ειδοποιήσεις του Pro δεν θα σου φτάσουν.',
      trialLine: ends ? `Η δωρεάν εβδομάδα τελειώνει στις ${ends}.${price ? ` Μετά ${price.full}.` : ''}` : null,
      subject: 'Είσαι Pro!',
      preheader: 'Ο βοηθός της σεζόν σου ξεκίνησε.',
      title: 'Καλωσήρθες στο Pro!',
      sub: 'Ο βοηθός της σεζόν σου ξεκίνησε. Μάθε τα πάντα για τους αντιπάλους και τα στατιστικά σου.',
      button: 'Άνοιξε το Pro',
      why: 'Πήρες αυτό το email επειδή ξεκίνησες το Pro στο NetProphet.',
    },
    {
      checks: [
        'Your season month by month, with your path on the Ladder.',
        'A reminder before every match you play.',
        'A card for every win, ready to share.',
      ],
      tipLead: 'Turn on notifications',
      tip: 'for NetProphet on your phone, or the Pro alerts won’t reach you.',
      trialLine: ends ? `Your free week ends on ${ends}.${price ? ` Then ${price.full}.` : ''}` : null,
      subject: 'You’re Pro!',
      preheader: 'Your season assistant is on.',
      title: 'Welcome to Pro!',
      sub: 'Your season assistant is on. Get to know your opponents and your own stats inside out.',
      button: 'Open Pro',
      why: 'You got this email because you started Pro on NetProphet.',
    },
  );
  const feats = PRO_FEATURES[lang];
  return build(e, {
    subject: c.subject,
    preheader: c.preheader,
    hero: { kicker: 'PRO', title: c.title, sub: c.sub },
    body: [
      features(feats),
      block.checks(c.checks.map(esc)),
      block.tip(`<strong>${c.tipLead}</strong> ${esc(c.tip)}`),
      block.button(OPEN_URL, c.button),
      c.trialLine ? block.note(esc(c.trialLine)) : '',
    ].filter(Boolean),
    text: [
      ...feats.map(([a, b]) => `+ ${a}: ${b}`),
      '',
      ...c.checks.map((x) => `✓ ${x}`),
      '',
      `${c.tipLead} ${c.tip}`,
      '',
      `${c.button}: ${OPEN_URL}`,
      ...(c.trialLine ? ['', c.trialLine] : []),
    ],
    why: c.why,
  });
}

export function proTrialDay5Email(e: DueEmail): Mail | null {
  const lang = langOf(e);
  const p = pay(e);
  const ends = date(p.ends_at, lang);
  if (!ends) return null;
  const price = planPrice(p, lang);
  const store = storeHelp(p.store, lang);
  const c = t(
    e,
    {
      keep: price ? `Συνεχίζεις; Δεν κάνεις τίποτα. Στις ${ends} ξεκινάει η συνδρομή: ${price.full}.` : `Συνεχίζεις; Δεν κάνεις τίποτα. Η συνδρομή ξεκινάει στις ${ends}.`,
      cancel: store.name
        ? `Δεν το θες; Ακύρωσέ το από τις συνδρομές του ${store.name} πριν τις ${ends}. Δεν πληρώνεις τίποτα.`
        : `Δεν το θες; Ακύρωσέ το από εκεί που το ξεκίνησες, πριν τις ${ends}. Δεν πληρώνεις τίποτα.`,
      button: store.name ? 'Διαχείριση συνδρομής' : 'Άνοιξε το NetProphet',
      subject: '2 μέρες ακόμα δωρεάν',
      starts: `Η συνδρομή ξεκινάει στις ${ends}.`,
      title: 'μέρες ακόμα δωρεάν',
      sub: price ? `Μετά ${price.first}, από τις ${ends}.` : `Η συνδρομή ξεκινάει στις ${ends}.`,
      why: 'Πήρες αυτό το email επειδή είσαι στη δωρεάν εβδομάδα του Pro.',
    },
    {
      keep: price ? `Staying? Do nothing. Your subscription starts on ${ends}: ${price.full}.` : `Staying? Do nothing. Your subscription starts on ${ends}.`,
      cancel: store.name
        ? `Not for you? Cancel it in your ${store.name} subscriptions before ${ends}. You pay nothing.`
        : `Not for you? Cancel it where you started it, before ${ends}. You pay nothing.`,
      button: store.name ? 'Manage subscription' : 'Open NetProphet',
      subject: '2 more days free',
      starts: `Your subscription starts on ${ends}.`,
      title: 'more days free',
      sub: price ? `Then ${price.first}, from ${ends}.` : `Your subscription starts on ${ends}.`,
      why: 'You got this email because you’re on the Pro free week.',
    },
  );
  return build(e, {
    subject: c.subject,
    preheader: c.starts,
    hero: { kicker: 'PRO', big: '2', title: c.title, sub: esc(c.sub) },
    body: [
      block.paragraph(esc(c.keep)),
      block.paragraph(esc(c.cancel)),
      store.path ? block.note(esc(store.path)) : '',
      block.button(store.url, c.button),
    ].filter(Boolean),
    text: [c.keep, '', c.cancel, ...(store.path ? [store.path] : []), '', `${c.button}: ${store.url}`],
    why: c.why,
  });
}

export function proCancelEmail(e: DueEmail): Mail | null {
  const lang = langOf(e);
  const p = pay(e);
  const ends = date(p.ends_at, lang);
  if (!ends) return null;
  const c = t(
    e,
    {
      title: `Το Pro σου σταματάει στις ${ends}`,
      free: [
        'Η ψήφος σε κάθε ματς και το σερί σου.',
        'Τα αποτελέσματα και η Κατάταξη.',
        'Το quiz της ημέρας.',
        'Ο Baller σου και ό,τι έχεις μαζέψει.',
      ],
      trial: 'Ακύρωσες μέσα στη δωρεάν εβδομάδα, οπότε δεν πληρώνεις τίποτα.',
      stays: `Μετά τις ${ends} μένουν δωρεάν:`,
      reply: 'Κάτι δεν σου άρεσε; Απάντησε σε αυτό το email. Το διαβάζει όλη η ομάδα.',
      until: 'Ως τότε τα έχεις όλα όπως πριν.',
      why: 'Πήρες αυτό το email επειδή ακύρωσες το Pro στο NetProphet.',
    },
    {
      title: `Your Pro ends on ${ends}`,
      free: [
        'Your vote on every match, and your streak.',
        'Results and the Ladder.',
        'The quiz of the day.',
        'Your Baller and everything you’ve collected.',
      ],
      trial: 'You cancelled during the free week, so you pay nothing.',
      stays: `After ${ends}, these stay free:`,
      reply: 'Something you didn’t like? Reply to this email. The whole team reads it.',
      until: 'Until then you have everything, just as before.',
      why: 'You got this email because you cancelled Pro on NetProphet.',
    },
  );
  const trial = p.trial ? c.trial : null;
  return build(e, {
    subject: c.title,
    preheader: c.until,
    hero: { kicker: 'PRO', title: esc(c.title), sub: c.until },
    body: [
      trial ? block.paragraph(esc(trial)) : '',
      block.paragraph(esc(c.stays)),
      block.checks(c.free.map(esc)),
      block.paragraph(esc(c.reply)),
    ].filter(Boolean),
    text: [...(trial ? [trial, ''] : []), c.stays, ...c.free.map((f) => `✓ ${f}`), '', c.reply],
    why: c.why,
  });
}

export function proWinbackEmail(e: DueEmail): Mail | null {
  const lang = langOf(e);
  const p = pay(e);
  const code = typeof p.code === 'string' && p.code.trim() ? p.code.trim() : null;
  // never without a code: the database holds the email until the pool has one
  if (!code) return null;
  const url = redeemUrl(code);
  const until = date(p.code_expires_at, lang);
  const half = euro(WINBACK.price, lang);
  const full = euro(WINBACK.full, lang);
  const c = t(
    e,
    {
      offerLine: `${WINBACK.months} μήνες Pro στα ${half} τον μήνα, αντί για ${full}. Μετά ${full} τον μήνα, ακυρώνεις όποτε θες.`,
      checks: ['Ειδοποιήσεις live για την κλήρωση και την ώρα σου.', 'Τα αναλυτικά στατιστικά του αντιπάλου σου.', 'Τα στατιστικά σου και η σεζόν σου.'],
      // founder, 18 Nov 2026: no code to copy; the button carries the person's own code
      how: `Πάτα το κουμπί από το iPhone σου και η έκπτωση περνάει μόνη της στο App Store. Είναι μόνο για σένα${until ? ` και ισχύει ως τις ${until}` : ''}.`,
      once: 'Δεν θα σου ξαναστείλουμε αυτή την προσφορά.',
      subject: 'Το Pro σου έληξε. Γύρνα με τη μισή τιμή',
      preheader: `${WINBACK.months} μήνες Pro στα ${half} τον μήνα, μόνο για σένα.`,
      kicker: 'PRO · ΜΟΝΟ ΓΙΑ ΣΕΝΑ',
      title: 'Γύρνα με τη μισή τιμή',
      sub: `Το Pro σου έληξε. Για να γυρίσεις, ${WINBACK.months} μήνες στα ${half} τον μήνα.`,
      button: 'Γύρνα στο Pro με −50%',
      why: 'Πήρες αυτό το email επειδή είχες Pro στο NetProphet.',
    },
    {
      offerLine: `${WINBACK.months} months of Pro at ${half} a month, instead of ${full}. Then ${full} a month, cancel any time.`,
      checks: ['Live alerts for the draw and your time.', 'Your opponent’s detailed stats.', 'Your own stats and your season.'],
      how: `Tap the button on your iPhone and the discount goes through in the App Store by itself. It’s just for you${until ? ` and it’s good until ${until}` : ''}.`,
      once: 'We won’t send you this offer again.',
      subject: 'Your Pro has ended. Come back at half price',
      preheader: `${WINBACK.months} months of Pro at ${half} a month, just for you.`,
      kicker: 'PRO · JUST FOR YOU',
      title: 'Come back at half price',
      sub: `Your Pro has ended. To come back: ${WINBACK.months} months at ${half} a month.`,
      button: 'Back to Pro at −50%',
      why: 'You got this email because you had Pro on NetProphet.',
    },
  );
  return build(e, {
    subject: c.subject,
    preheader: c.preheader,
    hero: { kicker: c.kicker, big: '−50%', title: c.title, sub: esc(c.sub) },
    body: [offer(lang), block.checks(c.checks.map(esc)), block.button(url, c.button), block.note(`${esc(c.how)}<br>${esc(c.once)}`)],
    text: [c.offerLine, '', ...c.checks.map((x) => `✓ ${x}`), '', `${c.button}: ${url}`, '', c.how, '', c.once],
    why: c.why,
  });
}

/** the Pro kinds, registered in ./index.ts */
export const PRO_EMAILS: Record<string, (e: DueEmail) => Mail | null> = {
  pro_welcome: proWelcomeEmail,
  pro_trial_day5: proTrialDay5Email,
  pro_cancel: proCancelEmail,
  pro_winback: proWinbackEmail,
};
