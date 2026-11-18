/**
 * The daily σερί emails (founder's board, 18 Nov 2026): streak_lost, streak_milestone and streak_reminder_email, plus
 * the σερί line of the Monday email. core.streak_email_sweep and core.email_series_sweep queue them (migration
 * 20270427000000_daily_streak) and only while the daily σερί is switched on; this file only words them. Any field can
 * be missing («Send me a test» queues a kind with no data), so a line that needs one is left out without it.
 */
import { greekCaps, weekdayAccusative } from '@netprophet/copy';
import { block, esc } from '../emailLayout';
import { OPEN_URL, build, type DueEmail, type Mail } from './core';

type Obj = Record<string, unknown>;
const num = (o: Obj | null | undefined, k: string): number | null => {
  const v = o?.[k];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
};

const NUM = new Intl.NumberFormat('el-GR');
const fmt = (n: number) => NUM.format(n);
/** «1 μέρα», «7 μέρες» */
const days = (n: number) => `${fmt(n)} ${n === 1 ? 'μέρα' : 'μέρες'}`;
const KICKER = greekCaps('Το σερί σου');

/** «τη Δευτέρα», «τη Δευτέρα και την Πέμπτη», «τη Δευτέρα, την Τρίτη και την Πέμπτη» */
function dayList(isoDays: string[]): string | null {
  const names = isoDays.map(weekdayAccusative).filter((d): d is string => !!d);
  if (names.length === 0) return null;
  return names.length === 1 ? names[0]! : `${names.slice(0, -1).join(', ')} και ${names[names.length - 1]}`;
}

/**
 * The Monday email's σερί line from payload.days {n, played, frozen: ['YYYY-MM-DD']}: «6 μέρες στη σειρά · 6 από 7 την
 * περασμένη εβδομάδα», then «Η Ασφάλεια κάλυψε την Πέμπτη.» when a freeze covered a day. Null without payload.days
 * (the daily σερί is off).
 */
export function mondayStreakLines(p: Obj): string[] | null {
  const d = p.days;
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  const o = d as Obj;
  const n = num(o, 'n');
  const played = num(o, 'played');
  const frozen = Array.isArray(o.frozen) ? o.frozen.filter((x): x is string => typeof x === 'string') : [];
  const parts = [n !== null && n > 0 ? `${days(n)} στη σειρά` : null, played !== null ? `${fmt(played)} από 7 την περασμένη εβδομάδα` : null]
    .filter(Boolean)
    .join(' · ');
  const lines = parts ? [parts] : [];
  const covered = dayList(frozen);
  if (covered) lines.push(`Η Ασφάλεια κάλυψε ${covered}.`);
  return lines.length ? lines : null;
}

/** streak_lost: a σερί of 7 days or more broke yesterday (no freeze left) */
export function streakLostEmail(e: DueEmail): Mail {
  const n = num(e.payload, 'n');
  const best = num(e.payload, 'best');
  const record = best !== null ? `Το ρεκόρ σου είναι ${days(best)} και κανείς δεν σου το παίρνει. ` : '';
  const body = `${record}Μία ψήφος ή το quiz σήμερα και ξεκινάς νέο σερί.`;
  const sub = 'Χθες δεν έπαιξες και δεν είχες Ασφάλεια.';
  return build(e, {
    subject: n !== null ? `Το σερί σου έσπασε στις ${days(n)}` : 'Το σερί σου έσπασε',
    preheader: 'Ένα tap σήμερα και ξεκινάς νέο.',
    hero: { kicker: KICKER, title: esc(n !== null ? `${days(n)}. Πάμε για ${fmt(n + 1)};` : 'Πάμε για νέο σερί;'), sub: esc(sub) },
    body: [block.paragraph(esc(body)), block.button(OPEN_URL, 'Ξεκίνα νέο σερί')],
    text: [body, '', `Ξεκίνα νέο σερί: ${OPEN_URL}`],
    why: 'Πήρες αυτό το email επειδή το σερί σου στο NetProphet ήταν μία εβδομάδα και πάνω.',
  });
}

/** streak_milestone: 30 or 100 days in a row, with the Frame that came with it */
export function streakMilestoneEmail(e: DueEmail): Mail {
  const n = num(e.payload, 'n') ?? 30;
  const subject = n === 100 ? 'Εκατό μέρες στη σειρά!' : n === 30 ? 'Ένας μήνας στη σειρά!' : `${days(n)} στη σειρά!`;
  const body =
    n === 100 ? 'Εκατό μέρες, κάθε μέρα. Το Frame «Εκατό» είναι ήδη στον Baller σου.'
    : n === 30 ? 'Ένα ολόκληρο μήνα, κάθε μέρα. Το Frame «Μήνας» είναι ήδη στον Baller σου.'
    : 'Κάθε μέρα, χωρίς διακοπή. Συνέχισε έτσι.';
  return build(e, {
    subject,
    preheader: body,
    hero: { kicker: KICKER, big: fmt(n), title: 'μέρες στη σειρά!' },
    body: [block.paragraph(esc(body)), block.button(OPEN_URL, 'Δες το Frame')],
    text: [body, '', `Δες το Frame: ${OPEN_URL}`],
    why: `Πήρες αυτό το email επειδή έφτασες ${days(n)} στη σειρά στο NetProphet.`,
  });
}

/** streak_reminder_email: 20:00, a σερί at risk, for people without a device (the push's texts) */
export function streakReminderEmail(e: DueEmail): Mail {
  const n = num(e.payload, 'n');
  const body = n === 1 ? 'Ξεκίνησες σερί χθες. Παίξε και σήμερα να γίνει 2.' : `${n !== null ? `${days(n)} στη σειρά. ` : ''}Μία ψήφος ή το quiz και το κρατάς.`;
  return build(e, {
    subject: 'Το σερί σου κινδυνεύει',
    preheader: body,
    hero: n !== null && n > 1
      ? { kicker: KICKER, big: fmt(n), title: 'μέρες στη σειρά', sub: esc('Μία ψήφος ή το quiz και το κρατάς.') }
      : { kicker: KICKER, title: 'Το σερί σου κινδυνεύει', sub: esc(body) },
    body: [block.button(OPEN_URL, 'Κράτα το σερί')],
    text: [body, '', `Κράτα το σερί: ${OPEN_URL}`],
    why: 'Πήρες αυτό το email επειδή έχεις σερί στο NetProphet και δεν έχεις ειδοποιήσεις στο κινητό.',
  });
}

/** the σερί kinds for the registry in index.ts */
export const STREAK_EMAILS: Record<string, (e: DueEmail) => Mail | null> = {
  streak_lost: streakLostEmail,
  streak_milestone: streakMilestoneEmail,
  streak_reminder_email: streakReminderEmail,
};
