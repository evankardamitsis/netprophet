/**
 * The month medal email (founder, 2 Nov 2026): when a month closes, each of the top 3 of a Κατηγορία group gets a
 * Greek email with their place, their Κατηγορία, the medal and a button to the app. Sent by the 08:30 morning route
 * from api.admin_medal_emails_due, each medal once (api.admin_medal_emails_sent). The switch is Εγώ › Ρυθμίσεις.
 */
import { accusativeWord, getCopy, nameGender } from '@netprophet/copy';
import { SITE_URL, block, esc, renderEmail } from './emailLayout';

export interface MedalDue {
  id: string;
  email: string;
  first_name: string | null;
  place: 1 | 2 | 3;
  /** «2026-10» */
  month: string;
  tier: 'bronze' | 'silver' | 'gold';
}

const el = getCopy('el');
/** «στην 1η θέση», «στη 2η», «στην 3η»: the ν stays before π and τ */
const AT_PLACE: Record<1 | 2 | 3, string> = { 1: 'στην 1η θέση', 2: 'στη 2η θέση', 3: 'στην 3η θέση' };
/** the subject's medal, in the accusative with its article */
const THE_MEDAL: Record<1 | 2 | 3, string> = { 1: 'το χρυσό μετάλλιο', 2: 'το ασημένιο μετάλλιο', 3: 'το χάλκινο μετάλλιο' };

/** «Οκτώβριος» */
const monthName = (key: string) => el.season.months[Number(key.slice(5, 7)) - 1] ?? key;

export function medalEmail(m: MedalDue): { subject: string; html: string; text: string } {
  const month = monthName(m.month);
  const year = m.month.slice(0, 4);
  // «τον Οκτώβριο»: months are masculine
  const monthIn = `τον ${accusativeWord(month, 'm')}`;
  const name = m.first_name?.trim() ? accusativeWord(m.first_name.trim(), nameGender(m.first_name.trim())) : null;
  const medal = el.ladder.medals.names[m.place - 1] ?? '';
  const tier = el.ladder.tiers[m.tier];
  const subject = `Πήρες ${THE_MEDAL[m.place]} ${monthIn}!`;
  const hello = name ? `Μπράβο, ${name}!` : 'Μπράβο!';
  const lead = `Τα κατάφερες: ${monthIn} τερμάτισες ${AT_PLACE[m.place]} της Κατηγορίας σου (${tier}).`;
  const extra =
    m.place === 1
      ? 'Μαζί του παίρνεις το Στέμμα για τον Baller σου και Frame Κορυφαίος του μήνα.'
      : 'Μαζί του παίρνεις Frame Κορυφαίος του μήνα.';
  const shelf = 'Το μετάλλιο μπαίνει στα Μετάλλια στο Εγώ, και το βλέπουν όλοι στο προφίλ σου.';
  const next = 'Νέος μήνας, νέα Κατάταξη. Πάμε για άλλο ένα;';
  const cta = 'Άνοιξε το NetProphet';
  const why =
    'Πήρες αυτό το email επειδή μπήκες στους 3 πρώτους της Κατηγορίας σου. Δεν το θες; Κλείσ’ το στο Εγώ › Ρυθμίσεις › Email για τα μετάλλια.';
  const { html, text } = renderEmail({
    lang: 'el',
    subject,
    preheader: esc(lead),
    bodyHtml: [
      block.heading(hello),
      block.paragraph(esc(lead)),
      block.earned(medal, `${month} ${year}`),
      block.paragraph(esc(`${extra} ${shelf}`)),
      block.button(SITE_URL, cta),
      block.note(esc(next)),
    ].join('\n'),
    bodyText: [hello, '', lead, '', `${medal}, ${month} ${year}`, '', `${extra} ${shelf}`, '', `${cta}: ${SITE_URL}`, '', next].join('\n'),
    why,
  });
  return { subject, html, text };
}

type Rpc = (fn: string, args: object) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
/** sends one email; true when the provider took it */
export type SendOne = (to: string, mail: { subject: string; html: string; text: string }) => Promise<boolean>;

/**
 * Every medal not emailed yet: one email each, and each one is marked right after it went, so a run that stops
 * half way never sends the same medal twice. Never throws: the morning email goes out whatever happens here.
 */
export async function sendMedalEmails(rpc: Rpc, send: SendOne): Promise<{ sent: number; failed: number; error?: string }> {
  try {
    const due = await rpc('admin_medal_emails_due', {});
    if (due.error) return { sent: 0, failed: 0, error: due.error.message };
    let sent = 0;
    let failed = 0;
    for (const m of (due.data as MedalDue[] | null) ?? []) {
      let ok = false;
      try {
        ok = await send(m.email, medalEmail(m));
      } catch {
        ok = false;
      }
      if (!ok) {
        failed += 1;
        continue;
      }
      const mark = await rpc('admin_medal_emails_sent', { p_ids: [m.id] });
      if (mark.error) return { sent, failed, error: mark.error.message };
      sent += 1;
    }
    return { sent, failed };
  } catch (e) {
    return { sent: 0, failed: 0, error: e instanceof Error ? e.message : String(e) };
  }
}
