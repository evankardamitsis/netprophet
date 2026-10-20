/**
 * supabase-v2/templates/*.html are generated from emailLayout.ts, so every email shares one layout.
 * After a layout change: `UPDATE_EMAIL_TEMPLATES=1 pnpm --filter @netprophet/admin test emailTemplates`
 * rewrites the templates and the previews in docs/v2/emails (previews use the local logo and sample data).
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { AUTH_SUBJECT, LOGO_SMALL_URL, LOGO_URL, authEmail, renderEmail, type AuthTemplate } from './emailLayout';
import { inviteEmail } from './staffInvite';
import { morningEmail } from './morningEmail';

const root = (p: string) => fileURLToPath(new URL(`../../../../../${p}`, import.meta.url));
const update = process.env.UPDATE_EMAIL_TEMPLATES === '1';
const kinds: AuthTemplate[] = ['magic_link', 'confirmation'];

const forPreview = (html: string) => html.split(LOGO_URL).join('./logo@2x.png').split(LOGO_SMALL_URL).join('./logo-small@2x.png');

describe('the Supabase auth templates', () => {
  for (const kind of kinds) {
    it(`${kind}.html is the shared layout with the code tag`, () => {
      const { html } = authEmail(kind);
      const path = root(`supabase-v2/templates/${kind}.html`);
      if (update) writeFileSync(path, html);
      expect(readFileSync(path, 'utf8')).toBe(html);
      expect(html.split('{{ .Token }}').length - 1).toBe(2); // the preview line and the code
      expect(html.match(/\{\{/g)?.length).toBe(2); // no other Go template tags
    });
  }
  it('keeps the subject in config.toml and the hosted push scripts the same', () => {
    expect(readFileSync(root('supabase-v2/config.toml'), 'utf8').split(`subject = "${AUTH_SUBJECT}"`).length - 1).toBe(2);
    expect(readFileSync(root('scripts/v2-email-templates-push.sh'), 'utf8')).toContain(AUTH_SUBJECT);
    expect(readFileSync(root('scripts/v2-project-settings.sh'), 'utf8')).toContain(AUTH_SUBJECT);
  });
});

describe('the shared layout', () => {
  const e = renderEmail({ lang: 'el', subject: 'Θέμα', bodyHtml: '<p>x</p>', bodyText: 'x', why: 'Γιατί.' });
  it('is 600px wide, with both hosted logos and alt text', () => {
    expect(e.html).toContain('max-width:600px');
    expect(e.html).toContain(`src="${LOGO_URL}" width="176" height="33" alt="NetProphet"`);
    expect(e.html).toContain(`src="${LOGO_SMALL_URL}" width="112" height="21" alt="NetProphet"`);
    expect(LOGO_URL).toBe('https://www.netprophetapp.com/email/logo@2x.png');
  });
  it('signs off with the publisher, the links, the contact and why', () => {
    for (const s of ['https://www.netprophetapp.com/privacy', 'https://www.netprophetapp.com/support', 'mailto:hello@monadlabs.gr', 'Γιατί.'])
      expect(e.html).toContain(s);
    expect(e.text).not.toContain('Monad Labs');
    expect(e.text).toContain('Επικοινωνία: hello@monadlabs.gr');
    expect(e.text.trim().endsWith('Γιατί.')).toBe(true);
  });
  it('uses English links for English emails', () => {
    const en = renderEmail({ lang: 'en', subject: 's', bodyHtml: '', bodyText: '', why: 'w' });
    expect(en.html).not.toContain('Monad Labs');
    expect(en.html).toContain('https://www.netprophetapp.com/en/privacy');
  });
  it('has no dashes the copy rules forbid, and no lime', () => {
    const all = [...kinds.map((k) => authEmail(k).html), inviteEmail({ role: 'admin', inviter: 'A' }).html, e.html].join('');
    expect(all).not.toMatch(/[\u2013\u2014]/);
    expect(all.toUpperCase()).not.toContain('#D9F03F');
  });
});

// writes the review copies: real layout, local logos, sample data
it.runIf(update)('writes the previews to docs/v2/emails', () => {
  const dir = root('docs/v2/emails');
  mkdirSync(dir, { recursive: true });
  copyFileSync(root('apps/site/public/email/logo@2x.png'), `${dir}/logo@2x.png`);
  copyFileSync(root('apps/site/public/email/logo-small@2x.png'), `${dir}/logo-small@2x.png`);
  const morning = morningEmail({
    date: '2026-10-20',
    recipients: [],
    decisions: { people: 2, walkovers: 1, score_conflicts: 0 },
    results_for_you: 3,
    overdue: [{ tournament: 'Athens Open', matches: 2 }],
    sheet_problems: [],
    postponed: 1,
    today: [{ tournament: 'Athens Open', matches: 14 }],
    last_runs: 3,
    new_players: [{ tournament: 'Athens Open', count: 2, names: ['Νίκος Παππάς', 'Ελένη Δήμου'] }],
  });
  const previews: Record<string, { html: string; text: string }> = {
    'sign-in-code': authEmail('magic_link', '482913'),
    'first-sign-in-code': authEmail('confirmation', '482913'),
    'staff-invite': inviteEmail({ role: 'editor', inviter: 'Άννα Μπος' }),
    'staff-morning': morning,
  };
  for (const [name, mail] of Object.entries(previews)) {
    writeFileSync(`${dir}/${name}.html`, forPreview(mail.html));
    writeFileSync(`${dir}/${name}.txt`, mail.text);
  }
});
