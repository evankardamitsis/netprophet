/** Team page helpers: the email as people type it, and the short invite email (sent through Resend). */
import { block, esc, renderEmail } from './emailLayout';

export type TeamRole = 'admin' | 'editor';

export const ADMIN_LOGIN_URL = 'https://admin.netprophetapp.com/v2/login';

/** trim and lowercase, the way the login and the invite look an account up */
export const normaliseEmail = (email: string) => email.trim().toLowerCase();

/** a plain check before asking the server: something@something.something, no spaces */
export const looksLikeEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const article = (role: TeamRole) => (role === 'admin' ? 'an admin' : 'an editor');

/** the invite: who added them, as what, where to sign in and how */
export function inviteEmail({ role, inviter, loginUrl = ADMIN_LOGIN_URL }: { role: TeamRole; inviter: string; loginUrl?: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const by = inviter.trim() || 'The NetProphet team';
  const subject = `You are ${article(role)} on NetProphet admin`;
  const { html, text } = renderEmail({
    lang: 'en',
    subject,
    preheader: `${esc(by)} added you to the NetProphet admin.`,
    bodyHtml: [
      block.heading('Welcome to the team'),
      block.paragraph(`${esc(by)} added you to the NetProphet admin as ${article(role)}.`),
      block.paragraph(`Sign in here: ${block.link(loginUrl, loginUrl)}`),
      block.note('Type this email and we send you a 6-digit code. No password needed.'),
    ].join('\n'),
    bodyText: [
      `${by} added you to the NetProphet admin as ${article(role)}.`,
      `Sign in here: ${loginUrl}`,
      'Type this email and we send you a 6-digit code. No password needed.',
    ].join('\n\n'),
    why: 'You got this email because a NetProphet admin added you to the team. Not expecting it? Write to us.',
  });
  return { subject, html, text };
}
