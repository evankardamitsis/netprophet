/** Team page helpers: the email as people type it, and the short invite email (sent through Resend). */

export type TeamRole = 'admin' | 'editor';

export const ADMIN_LOGIN_URL = 'https://admin.netprophetapp.com/v2/login';

/** trim and lowercase, the way the login and the invite look an account up */
export const normaliseEmail = (email: string) => email.trim().toLowerCase();

/** a plain check before asking the server: something@something.something, no spaces */
export const looksLikeEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const article = (role: TeamRole) => (role === 'admin' ? 'an admin' : 'an editor');

/** the invite: who added them, as what, where to sign in and how */
export function inviteEmail({ role, inviter, loginUrl = ADMIN_LOGIN_URL }: { role: TeamRole; inviter: string; loginUrl?: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const by = inviter.trim() || 'The NetProphet team';
  const lines = [
    `${by} added you to the NetProphet admin as ${article(role)}.`,
    `Sign in here: ${loginUrl}`,
    'Type this email and we send you a 6-digit code. No password needed.',
  ];
  const html = [
    `<p>${esc(by)} added you to the NetProphet admin as ${article(role)}.</p>`,
    `<p>Sign in here: <a href="${esc(loginUrl)}">${esc(loginUrl)}</a></p>`,
    '<p>Type this email and we send you a 6-digit code. No password needed.</p>',
  ].join('\n');
  return { subject: `You are ${article(role)} on NetProphet admin`, html, text: lines.join('\n\n') };
}
