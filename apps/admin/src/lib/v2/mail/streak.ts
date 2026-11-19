/**
 * The daily σερί emails (founder's board, 18 Nov 2026): streak_lost, streak_milestone and streak_reminder_email, plus
 * the σερί line of the Monday email. core.streak_email_sweep and core.email_series_sweep queue them (migration
 * 20270427000000_daily_streak) and only while the daily σερί is switched on; this file only words them, in Greek or
 * in English (the row's lang). Any field can be missing («Send me a test» queues a kind with no data), so a line that
 * needs one is left out without it.
 */
import { DAY_FREEZE_FIRST_AT, MAX_FREEZES, earnsDayFreeze } from '@netprophet/core';
import { greekCaps, weekdayAccusative, weekdayName } from '@netprophet/copy';
import { block, esc, type EmailLang } from '../emailLayout';
import { OPEN_URL, build, fmtNum, langOf, t, type DueEmail, type Mail } from './core';

type Obj = Record<string, unknown>;
const num = (o: Obj | null | undefined, k: string): number | null => {
  const v = o?.[k];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
};

/** «1 μέρα», «7 μέρες»; «1 day», «7 days» */
const days = (n: number, lang: EmailLang = 'el') =>
  lang === 'en' ? `${fmtNum(n, lang)} ${n === 1 ? 'day' : 'days'}` : `${fmtNum(n)} ${n === 1 ? 'μέρα' : 'μέρες'}`;
const KICKER: Record<EmailLang, string> = { el: greekCaps('Το σερί σου'), en: greekCaps('Your streak') };
/** the milestone email's kicker (founder, 19 Nov: «ACHIEVEMENT», not «ΟΡΟΣΗΜΟ»), in both languages */
const ACHIEVEMENT = 'ACHIEVEMENT';
const str = (o: Obj, k: string) => (typeof o[k] === 'string' ? (o[k] as string) : null);
/**
 * The English for Ασφάλεια (the σερί freeze) in the emails. One place, so it follows the app's word if that changes
 * (packages/copy en.ts says «Streak Insurance» today; the email brief of 19 Nov says «Streak Freeze»).
 */
export const FREEZE_EN = 'Streak Freeze';

/** the σερί Frames by key (packages/core DAY_MILESTONE_FRAMES), their names in both languages and their art */
const FRAMES: Record<string, { name: Record<EmailLang, string>; art: string }> = {
  frame_seven: { name: { el: 'Επτά', en: 'Seven' }, art: 'streak_frame_seven' },
  frame_ten: { name: { el: 'Δέκα', en: 'Ten' }, art: 'streak_frame_ten' },
  frame_month: { name: { el: 'Μήνας', en: 'Month' }, art: 'streak_frame_month' },
  frame_hundred: { name: { el: 'Εκατό', en: 'Hundred' }, art: 'streak_frame_hundred' },
};
/** a free Ασφάλεια comes only while fewer than the max are held; unknown (an old row, a test) means do not promise it */
const freezeRoom = (p: Obj) => {
  const f = num(p, 'freezes');
  return f !== null && f < MAX_FREEZES;
};

/**
 * «τη Δευτέρα», «τη Δευτέρα και την Πέμπτη», «τη Δευτέρα, την Τρίτη και την Πέμπτη»; in English «Monday», «Monday and
 * Thursday», «Monday, Tuesday and Thursday»
 */
function dayList(isoDays: string[], lang: EmailLang): string | null {
  const names = isoDays.map((d) => (lang === 'en' ? weekdayName(d, 'en') : weekdayAccusative(d))).filter((d): d is string => !!d);
  if (names.length === 0) return null;
  const and = lang === 'en' ? 'and' : 'και';
  return names.length === 1 ? names[0]! : `${names.slice(0, -1).join(', ')} ${and} ${names[names.length - 1]}`;
}

/**
 * The Monday email's σερί line from payload.days {n, played, frozen: ['YYYY-MM-DD']}: «6 μέρες στη σειρά · 6 από 7 την
 * περασμένη εβδομάδα», then «Η Ασφάλεια κάλυψε την Πέμπτη.» when a freeze covered a day. Null without payload.days
 * (the daily σερί is off).
 */
export function mondayStreakLines(p: Obj, lang: EmailLang = 'el'): string[] | null {
  const d = p.days;
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  const o = d as Obj;
  const n = num(o, 'n');
  const played = num(o, 'played');
  const frozen = Array.isArray(o.frozen) ? o.frozen.filter((x): x is string => typeof x === 'string') : [];
  const en = lang === 'en';
  const parts = [
    n !== null && n > 0 ? `${days(n, lang)} ${en ? 'in a row' : 'στη σειρά'}` : null,
    played !== null ? (en ? `${fmtNum(played, lang)} of 7 last week` : `${fmtNum(played)} από 7 την περασμένη εβδομάδα`) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const lines = parts ? [parts] : [];
  const covered = dayList(frozen, lang);
  if (covered) lines.push(en ? `Your ${FREEZE_EN}${frozen.length > 1 ? 's' : ''} covered ${covered}.` : `Η Ασφάλεια κάλυψε ${covered}.`);
  return lines.length ? lines : null;
}

/** streak_lost: a σερί of 7 days or more broke yesterday (no freeze left); shows the first prize of a new one */
export function streakLostEmail(e: DueEmail): Mail {
  const lang = langOf(e);
  const n = num(e.payload, 'n');
  const best = num(e.payload, 'best');
  const first = fmtNum(DAY_FREEZE_FIRST_AT, lang);
  const c = t(
    e,
    {
      record: best !== null ? `Το ρεκόρ σου είναι ${days(best)} και κανείς δεν σου το παίρνει. ` : '',
      again: 'Μία ψήφος ή το quiz σήμερα και ξεκινάς νέο σερί.',
      sub: 'Χθες δεν έπαιξες και δεν είχες Ασφάλεια.',
      prizeTitle: 'Μία Ασφάλεια δώρο',
      prizeSub: `Κράτα το νέο σερί ${first} μέρες και την παίρνεις.`,
      prizeKicker: greekCaps(`Στις ${first} μέρες`),
      subject: n !== null ? `Το σερί σου έσπασε στις ${days(n)}` : 'Το σερί σου έσπασε',
      preheader: 'Ένα tap σήμερα και ξεκινάς νέο.',
      title: n !== null ? `${days(n)}. Πάμε για ${fmtNum(n + 1)};` : 'Πάμε για νέο σερί;',
      button: 'Ξεκίνα νέο σερί',
      why: 'Πήρες αυτό το email επειδή το σερί σου στο NetProphet ήταν μία εβδομάδα και πάνω.',
    },
    {
      record: best !== null ? `Your record is ${days(best, lang)} and nobody can take that away. ` : '',
      again: 'One vote or the quiz today and a new streak begins.',
      sub: `You didn’t play yesterday and had no ${FREEZE_EN} left.`,
      prizeTitle: `A free ${FREEZE_EN}`,
      prizeSub: `Keep the new streak going for ${first} days and it’s yours.`,
      prizeKicker: greekCaps(`At ${first} days`),
      subject: n !== null ? `Your streak ended at ${days(n, lang)}` : 'Your streak ended',
      preheader: 'One tap today and a new one begins.',
      title: n !== null ? `${days(n, lang)}. Going for ${fmtNum(n + 1, lang)}?` : 'Up for a new streak?',
      button: 'Start a new streak',
      why: 'You got this email because your NetProphet streak had reached a week or more.',
    },
  );
  const body = `${c.record}${c.again}`;
  const prize = freezeRoom(e.payload);
  return build(e, {
    subject: c.subject,
    preheader: c.preheader,
    hero: { kicker: KICKER[lang], title: esc(c.title), sub: esc(c.sub), art: prize ? 'streak_freeze' : undefined },
    body: [
      block.paragraph(esc(body)),
      prize ? block.card({ kicker: c.prizeKicker, title: c.prizeTitle, sub: c.prizeSub }) : '',
      block.button(OPEN_URL, c.button),
    ],
    text: [body, ...(prize ? ['', `${c.prizeTitle}: ${c.prizeSub}`] : []), '', `${c.button}: ${OPEN_URL}`],
    why: c.why,
  });
}

/** streak_milestone: 30 or 100 days in a row, with the Frame that came with it, drawn on the Baller */
export function streakMilestoneEmail(e: DueEmail): Mail {
  const lang = langOf(e);
  const n = num(e.payload, 'n') ?? 30;
  const key = str(e.payload, 'frame') ?? (n === 100 ? 'frame_hundred' : n === 30 ? 'frame_month' : null);
  const frame = key ? FRAMES[key] ?? null : null;
  const won = frame ? `Frame «${frame.name[lang]}»` : null;
  const c = t(
    e,
    {
      subject: n === 100 ? 'Εκατό μέρες στη σειρά!' : n === 30 ? 'Ένας μήνας στη σειρά!' : `${days(n)} στη σειρά!`,
      body:
        n === 100 ? 'Εκατό μέρες, κάθε μέρα. Το Frame «Εκατό» είναι ήδη στον Baller σου.'
        : n === 30 ? 'Ένα ολόκληρο μήνα, κάθε μέρα. Το Frame «Μήνας» είναι ήδη στον Baller σου.'
        : 'Κάθε μέρα, χωρίς διακοπή. Συνέχισε έτσι.',
      newFrame: `${days(n)} σερί και ένα νέο Frame.`,
      title: 'μέρες στη σειρά!',
      earned: `Κέρδισες: ${won}`,
      earnedSub: 'Είναι ήδη στον Baller σου.',
      button: frame ? 'Δες το Frame' : 'Άνοιξε το NetProphet',
      why: `Πήρες αυτό το email επειδή έφτασες ${days(n)} στη σειρά στο NetProphet.`,
    },
    {
      subject: n === 100 ? 'A hundred days in a row!' : n === 30 ? 'A whole month in a row!' : `${days(n, lang)} in a row!`,
      body:
        n === 100 ? 'A hundred days, every single day. The «Hundred» Frame is already on your Baller.'
        : n === 30 ? 'A whole month, every single day. The «Month» Frame is already on your Baller.'
        : 'Every day, no breaks. Keep it going.',
      newFrame: `A ${fmtNum(n, lang)}-day streak and a new Frame.`,
      title: 'days in a row!',
      earned: `You earned: ${won}`,
      earnedSub: 'It’s already on your Baller.',
      button: frame ? 'See the Frame' : 'Open NetProphet',
      why: `You got this email because you reached ${days(n, lang)} in a row on NetProphet.`,
    },
  );
  return build(e, {
    subject: c.subject,
    preheader: frame ? c.newFrame : c.body,
    hero: { kicker: ACHIEVEMENT, big: fmtNum(n, lang), title: c.title, art: frame?.art },
    body: [won ? block.earned(c.earned, c.earnedSub) : '', block.paragraph(esc(c.body)), block.button(OPEN_URL, c.button)],
    text: [...(won ? [c.earned, ''] : []), c.body, '', `${c.button}: ${OPEN_URL}`],
    why: c.why,
  });
}

/**
 * streak_reminder_email: 20:00, a σερί at risk, for people without a device (the push's texts), with what tonight's
 * play would give: the Frame of the next day (payload.next_frame, only when not owned) and a free Ασφάλεια (day 3 and
 * every 7th, only while there is room).
 */
export function streakReminderEmail(e: DueEmail): Mail {
  const lang = langOf(e);
  const n = num(e.payload, 'n');
  const nf = str(e.payload, 'next_frame');
  const frame = nf ? FRAMES[nf] ?? null : null;
  const freeze = n !== null && earnsDayFreeze(n + 1) && freezeRoom(e.payload);
  const c = t(
    e,
    {
      body: n === 1 ? 'Ξεκίνησες σερί χθες. Παίξε και σήμερα να γίνει 2.' : `${n !== null ? `${days(n)} στη σειρά. ` : ''}Μία ψήφος ή το quiz και το κρατάς.`,
      keep: 'Μία ψήφος ή το quiz και το κρατάς.',
      frameSub: n !== null ? `Στις ${days(n + 1)} γίνεται δικό σου, στον Baller σου.` : '',
      freezeTitle: 'Μία Ασφάλεια',
      freezeShort: 'Μία Ασφάλεια',
      freezeSub: 'Καλύπτει μόνη της μία μέρα που δεν θα παίξεις.',
      today: 'Σήμερα κερδίζεις',
      and: ' και ',
      subject: 'Το σερί σου κινδυνεύει',
      preheader: 'Παίξε σήμερα και κερδίζεις:',
      title: 'μέρες στη σειρά',
      button: 'Κράτα το σερί',
      why: 'Πήρες αυτό το email επειδή έχεις σερί στο NetProphet και δεν έχεις ειδοποιήσεις στο κινητό.',
    },
    {
      body: n === 1 ? 'You started a streak yesterday. Play today too and make it 2.' : `${n !== null ? `${days(n, lang)} in a row. ` : ''}One vote or the quiz and you keep it.`,
      keep: 'One vote or the quiz and you keep it.',
      frameSub: n !== null ? `At ${days(n + 1, lang)} it’s yours, on your Baller.` : '',
      freezeTitle: `A ${FREEZE_EN}`,
      freezeShort: `a ${FREEZE_EN}`,
      freezeSub: 'It covers a day you miss, all by itself.',
      today: 'Up for grabs today',
      and: ' and ',
      subject: 'Your streak is at risk',
      preheader: 'Play today and you get:',
      title: 'days in a row',
      button: 'Keep the streak',
      why: 'You got this email because you have a streak on NetProphet and notifications are off on your phone.',
    },
  );
  const prizes: { title: string; sub: string; short: string }[] = [];
  if (frame) prizes.push({ title: `Frame «${frame.name[lang]}»`, sub: c.frameSub, short: `Frame «${frame.name[lang]}»` });
  if (freeze) prizes.push({ title: c.freezeTitle, sub: c.freezeSub, short: c.freezeShort });
  const art = frame?.art ?? (freeze ? 'streak_freeze' : undefined);
  const today = greekCaps(c.today);
  return build(e, {
    subject: c.subject,
    preheader: prizes.length ? `${c.preheader} ${prizes.map((x) => x.short).join(c.and)}.` : c.body,
    hero: n !== null && n > 1
      ? { kicker: KICKER[lang], big: fmtNum(n, lang), title: c.title, sub: esc(c.keep), art }
      : { kicker: KICKER[lang], title: c.subject, sub: esc(c.body), art },
    body: [...prizes.map((x) => block.card({ kicker: today, title: x.title, sub: x.sub })), block.button(OPEN_URL, c.button)],
    text: [c.body, ...prizes.map((x) => `${c.today}: ${x.title}. ${x.sub}`), '', `${c.button}: ${OPEN_URL}`],
    why: c.why,
  });
}

/** the σερί kinds for the registry in index.ts */
export const STREAK_EMAILS: Record<string, (e: DueEmail) => Mail | null> = {
  streak_lost: streakLostEmail,
  streak_milestone: streakMilestoneEmail,
  streak_reminder_email: streakReminderEmail,
};
