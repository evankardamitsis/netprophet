import { describe, expect, it } from 'vitest';
import { renderDue, type DueEmail } from './index';

const base: DueEmail = {
  id: '00000000-0000-0000-0000-000000000001',
  kind: 'welcome',
  group: 'game',
  to: 'nikos@example.com',
  payload: {},
  first_name: 'Νίκος',
  gender: null,
  lang: 'el',
  unsubscribe_token: '11111111-2222-3333-4444-555555555555',
};
const KINDS: [string, DueEmail['group']][] = [
  ['welcome', 'game'],
  ['claim_ok', 'account'],
  ['claim_no', 'account'],
  ['new_player_ok', 'account'],
  ['new_player_no', 'account'],
  ['deleted', 'account'],
];

describe('the welcome and account emails', () => {
  it.each(KINDS)('%s renders with a subject, html and text', (kind, group) => {
    const m = renderDue({ ...base, kind, group, payload: { player_name: 'Νίκος Παπαχρήστος' } });
    expect(m).not.toBeNull();
    expect(m!.subject.length).toBeGreaterThan(5);
    expect(m!.html).toContain('<!doctype html>');
    expect(m!.text.length).toBeGreaterThan(20);
  });

  it.each(KINDS)('%s follows the copy rules: no em dash, no betting words', (kind, group) => {
    const m = renderDue({ ...base, kind, group, payload: { player_name: 'Νίκος Παπαχρήστος' } })!;
    for (const part of [m.subject, m.html, m.text]) {
      expect(part).not.toContain('—');
      expect(part).not.toMatch(/στοίχημα|απόδοση|ποντάρ|κέρδη/);
    }
  });

  it('greets by name in the form the medal email uses', () => {
    expect(renderDue(base)!.subject).toBe('Μπήκες, Νίκο. Πάμε!');
    expect(renderDue({ ...base, first_name: null })!.subject).toBe('Μπήκες. Πάμε!');
  });

  it('game emails carry the one-click unsubscribe link, account emails do not', () => {
    const welcome = renderDue(base)!;
    expect(welcome.unsubscribeUrl).toBe('https://www.netprophetapp.com/email/unsubscribe?t=11111111-2222-3333-4444-555555555555');
    expect(welcome.html).toContain('Διαγραφή');
    const claim = renderDue({ ...base, kind: 'claim_ok', group: 'account' })!;
    expect(claim.unsubscribeUrl).toBeUndefined();
    expect(claim.html).not.toContain('email/unsubscribe');
  });

  it('names the player in the claim emails and escapes it', () => {
    const m = renderDue({ ...base, kind: 'claim_no', group: 'account', payload: { player_name: 'Α & <Β>' } })!;
    expect(m.html).toContain('Α &amp; &lt;Β&gt;');
    expect(m.html).not.toContain('<Β>');
  });

  it('uses the hosted art and the open-app page', () => {
    const m = renderDue(base)!;
    expect(m.html).toContain('https://www.netprophetapp.com/email/art/welcome.png');
    expect(m.html).toContain('https://www.netprophetapp.com/open');
  });

  it('has no template for an unknown kind', () => {
    expect(renderDue({ ...base, kind: 'nope' })).toBeNull();
  });
});
