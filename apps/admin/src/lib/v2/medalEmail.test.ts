import { describe, expect, it } from 'vitest';
import { SITE_URL } from './emailLayout';
import { medalEmail, sendMedalEmails, type MedalDue } from './medalEmail';

const gold: MedalDue = { id: 'm1', email: 'a@test.local', first_name: 'Βαγγέλης', place: 1, month: '2026-10', tier: 'bronze' };
const silver: MedalDue = { id: 'm2', email: 'b@test.local', first_name: 'Xenofon', place: 2, month: '2026-10', tier: 'bronze' };

describe('the month medal email', () => {
  it('says the medal and the month in the subject, in Greek', () => {
    expect(medalEmail(gold).subject).toBe('Πήρες το χρυσό μετάλλιο τον Οκτώβριο!');
    expect(medalEmail({ ...silver, place: 3 }).subject).toBe('Πήρες το χάλκινο μετάλλιο τον Οκτώβριο!');
  });

  it('greets by name, says the place and the Κατηγορία, and names the medal with its month', () => {
    const e = medalEmail(gold);
    expect(e.text).toContain('Μπράβο, Βαγγέλη!');
    expect(e.text).toContain('Τα κατάφερες: τον Οκτώβριο τερμάτισες στην 1η θέση της Κατηγορίας σου (Χάλκινη).');
    expect(e.text).toContain('Χρυσό μετάλλιο, Οκτώβριος 2026');
    expect(e.text).toContain('το Στέμμα');
    expect(medalEmail(silver).text).toContain('στη 2η θέση');
    expect(medalEmail(silver).text).not.toContain('Στέμμα');
    expect(medalEmail({ ...silver, first_name: null }).text.startsWith('Μπράβο!')).toBe(true);
  });

  it('has the one blue button to the app and the way to switch it off', () => {
    const e = medalEmail(silver);
    expect(e.html).toContain(`href="${SITE_URL}"`);
    expect(e.html).toContain('Άνοιξε το NetProphet');
    expect(e.text).toContain('Εγώ › Ρυθμίσεις › Email για τα μετάλλια');
    expect(e.html).toContain('lang="el"');
  });

  it('keeps to the copy rules: no em dash, no betting words', () => {
    for (const p of [1, 2, 3] as const) {
      const e = medalEmail({ ...gold, place: p });
      const all = `${e.subject}${e.html}${e.text}`;
      expect(all).not.toContain(String.fromCharCode(0x2014));
      expect(all).not.toMatch(/στοίχημα|απόδοση|ποντάρ|κέρδη|επίπεδο/);
    }
  });
});

describe('sending the medal emails', () => {
  const fakeRpc = (due: MedalDue[]) => {
    const marked: string[] = [];
    const rpc = async (fn: string, args: object) => {
      if (fn === 'admin_medal_emails_due') return { data: due, error: null };
      marked.push(...((args as { p_ids: string[] }).p_ids ?? []));
      return { data: 1, error: null };
    };
    return { rpc, marked };
  };

  it('sends each one and marks it right after', async () => {
    const { rpc, marked } = fakeRpc([gold, silver]);
    const to: string[] = [];
    const r = await sendMedalEmails(rpc, async (addr) => {
      to.push(addr);
      return true;
    });
    expect(r).toEqual({ sent: 2, failed: 0 });
    expect(to).toEqual(['a@test.local', 'b@test.local']);
    expect(marked).toEqual(['m1', 'm2']);
  });

  it('leaves one that did not go unmarked, for the next run', async () => {
    const { rpc, marked } = fakeRpc([gold, silver]);
    const r = await sendMedalEmails(rpc, async (addr) => {
      if (addr === 'a@test.local') throw new Error('down');
      return true;
    });
    expect(r).toEqual({ sent: 1, failed: 1 });
    expect(marked).toEqual(['m2']);
  });

  it('never throws when the database says no', async () => {
    const r = await sendMedalEmails(async () => ({ data: null, error: { message: 'forbidden' } }), async () => true);
    expect(r).toEqual({ sent: 0, failed: 0, error: 'forbidden' });
  });
});
