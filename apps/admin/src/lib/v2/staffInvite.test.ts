import { describe, expect, it } from 'vitest';
import { ADMIN_LOGIN_URL, inviteEmail, looksLikeEmail, normaliseEmail } from './staffInvite';

describe('the staff email', () => {
  it('is trimmed and lowercased', () => {
    expect(normaliseEmail('  Maria@Example.COM ')).toBe('maria@example.com');
  });
  it('needs an @ and a dot, no spaces', () => {
    expect(looksLikeEmail('maria@example.com')).toBe(true);
    expect(looksLikeEmail('maria@example')).toBe(false);
    expect(looksLikeEmail('maria example.com')).toBe(false);
    expect(looksLikeEmail('')).toBe(false);
  });
});

describe('the invite email', () => {
  it('says who added them, as what, and how to sign in', () => {
    const e = inviteEmail({ role: 'editor', inviter: 'Άννα Μπος' });
    expect(e.subject).toBe('You are an editor on NetProphet admin');
    expect(e.text).toContain('Άννα Μπος added you to the NetProphet admin as an editor.');
    expect(e.text).toContain(`Sign in here: ${ADMIN_LOGIN_URL}`);
    expect(e.text).toContain('6-digit code');
    expect(e.html).toContain(`href="${ADMIN_LOGIN_URL}"`);
  });
  it('names the admin role', () => {
    expect(inviteEmail({ role: 'admin', inviter: 'X' }).subject).toBe('You are an admin on NetProphet admin');
  });
  it('escapes the inviter name in the html and falls back when it is empty', () => {
    expect(inviteEmail({ role: 'admin', inviter: '<b>Bob</b>' }).html).toContain('&lt;b&gt;Bob&lt;/b&gt;');
    expect(inviteEmail({ role: 'admin', inviter: ' ' }).text).toContain('The NetProphet team added you');
  });
  it('has no em dash', () => {
    const e = inviteEmail({ role: 'editor', inviter: 'A' });
    expect(`${e.subject}${e.text}${e.html}`).not.toContain('\u2014');
  });
});
