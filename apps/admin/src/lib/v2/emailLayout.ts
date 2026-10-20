/**
 * The one layout every v2 email uses: the Supabase sign-in code emails (generated into supabase-v2/templates by
 * emailTemplates.test.ts), the Team invite and the 08:30 staff email (both through Resend).
 *
 * Email-client safe on purpose: tables, inline styles, bgcolor attributes, 600px wide, hosted PNG logos with their
 * background baked in (Gmail and Outlook block SVG and data URIs, and a transparent logo vanishes in dark mode).
 * The logos are served by apps/site from www.netprophetapp.com/email/.
 */
import { colors } from '@netprophet/tokens';

export type EmailLang = 'el' | 'en';

/** the canonical host: netprophetapp.com answers with a redirect to www, which some image proxies skip */
export const SITE_URL = 'https://www.netprophetapp.com';
export const CONTACT_EMAIL = 'hello@monadlabs.gr';
/** on ink, 176 x 33 shown, 352 x 66 file */
export const LOGO_URL = `${SITE_URL}/email/logo@2x.png`;
/** on paper, 112 x 21 shown, 224 x 42 file */
export const LOGO_SMALL_URL = `${SITE_URL}/email/logo-small@2x.png`;

const FONT = 'Helvetica,Arial,sans-serif';

export const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const footerCopy: Record<EmailLang, { privacy: string; support: string; contact: string; privacyUrl: string; supportUrl: string }> = {
  el: {
    privacy: 'Απόρρητο',
    support: 'Υποστήριξη',
    contact: 'Επικοινωνία',
    privacyUrl: `${SITE_URL}/privacy`,
    supportUrl: `${SITE_URL}/support`,
  },
  en: {
    privacy: 'Privacy',
    support: 'Support',
    contact: 'Contact',
    privacyUrl: `${SITE_URL}/en/privacy`,
    supportUrl: `${SITE_URL}/en/support`,
  },
};

/** building blocks for the content area, already styled */
export const block = {
  heading: (text: string) =>
    `<h1 style="margin:0 0 12px;font-family:${FONT};font-size:24px;line-height:30px;font-weight:700;color:${colors.ink}">${esc(text)}</h1>`,
  paragraph: (html: string) =>
    `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:24px;color:${colors.ink}">${html}</p>`,
  note: (html: string) =>
    `<p style="margin:0;font-family:${FONT};font-size:14px;line-height:21px;color:${colors.inkSoft}">${html}</p>`,
  /** the sign-in code: big ink text on a paper panel. `code` is inserted as is (it may be a template tag). */
  code: (code: string) =>
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px"><tr>` +
    `<td bgcolor="${colors.paper}" style="background-color:${colors.paper};border-radius:12px;padding:16px 24px;font-family:${FONT};font-size:40px;line-height:48px;font-weight:700;letter-spacing:8px;color:${colors.ink}">${code}</td>` +
    `</tr></table>`,
  subheading: (text: string) =>
    `<h2 style="margin:24px 0 8px;font-family:${FONT};font-size:17px;line-height:24px;font-weight:700;color:${colors.ink}">${esc(text)}</h2>`,
  list: (items: string[]) =>
    `<ul style="margin:0 0 8px;padding-left:20px;font-family:${FONT};font-size:15px;line-height:23px;color:${colors.ink}">` +
    items.map((i) => `<li style="margin:0 0 6px">${i}</li>`).join('') +
    `</ul>`,
  link: (href: string, text: string) => `<a href="${esc(href)}" style="color:${colors.blue};text-decoration:underline">${esc(text)}</a>`,
};

export interface EmailParts {
  lang: EmailLang;
  /** the subject, also the document title */
  subject: string;
  /** the inbox preview line (hidden in the body) */
  preheader?: string;
  /** the content area, built from `block` */
  bodyHtml: string;
  /** the same content as plain text */
  bodyText: string;
  /** one short line: why they got this email */
  why: string;
}

function footerHtml(lang: EmailLang, why: string): string {
  const f = footerCopy[lang];
  const a = (href: string, text: string) =>
    `<a href="${esc(href)}" style="color:${colors.inkSoft};text-decoration:underline">${esc(text)}</a>`;
  const line = (html: string, last = false) =>
    `<p style="margin:0 0 ${last ? 0 : 6}px;font-family:${FONT};font-size:13px;line-height:19px;color:${colors.inkSoft}">${html}</p>`;
  return [
    `<a href="${SITE_URL}" style="text-decoration:none"><img src="${LOGO_SMALL_URL}" width="112" height="21" alt="NetProphet" style="display:block;border:0;outline:none;width:112px;height:21px;margin:0 0 14px"></a>`,
    line(`${a(SITE_URL, 'netprophetapp.com')} &middot; ${a(f.privacyUrl, f.privacy)} &middot; ${a(f.supportUrl, f.support)}`),
    line(`${esc(f.contact)}: ${a(`mailto:${CONTACT_EMAIL}`, CONTACT_EMAIL)}`),
    `<p style="margin:14px 0 0;font-family:${FONT};font-size:12px;line-height:18px;color:${colors.inkSoft}">${esc(why)}</p>`,
  ].join('\n');
}

function footerText(lang: EmailLang, why: string): string {
  const f = footerCopy[lang];
  return [
    '--',
    'NetProphet',
    `${SITE_URL} · ${f.privacy}: ${f.privacyUrl} · ${f.support}: ${f.supportUrl}`,
    `${f.contact}: ${CONTACT_EMAIL}`,
    '',
    why,
  ].join('\n');
}

/** the whole email: ink header with the logo, the content on a white card, the footer on paper */
export function renderEmail(p: EmailParts): { html: string; text: string } {
  const pre = p.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${colors.paper};opacity:0">${p.preheader}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>\n`
    : '';
  const html = `<!doctype html>
<html lang="${p.lang}" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(p.subject)}</title>
<style>
  :root { color-scheme: light; supported-color-schemes: light; }
  body { margin:0 !important; padding:0 !important; width:100% !important; }
  a { color:${colors.blue}; }
  @media only screen and (max-width:620px) {
    .np-pad { padding-left:20px !important; padding-right:20px !important; }
    .np-outer { padding:16px 8px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${colors.paper}" bgcolor="${colors.paper}">
${pre}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${colors.paper}" style="background-color:${colors.paper}">
<tr><td align="center" class="np-outer" style="padding:32px 12px">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%">
<tr><td class="np-pad" bgcolor="${colors.ink}" style="background-color:${colors.ink};border-radius:16px 16px 0 0;padding:28px 32px">
<a href="${SITE_URL}" style="text-decoration:none"><img src="${LOGO_URL}" width="176" height="33" alt="NetProphet" style="display:block;border:0;outline:none;width:176px;height:33px"></a>
</td></tr>
<tr><td class="np-pad" bgcolor="${colors.white}" style="background-color:${colors.white};border-radius:0 0 16px 16px;padding:36px 32px 40px">
${p.bodyHtml}
</td></tr>
<tr><td class="np-pad" style="padding:28px 32px 8px">
${footerHtml(p.lang, p.why)}
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>
`;
  return { html, text: `${p.bodyText}\n\n${footerText(p.lang, p.why)}\n` };
}

/** Supabase sign-in code emails. `token` stays a Go template tag in the real templates. */
export const AUTH_SUBJECT = 'Ο κωδικός σου για το NetProphet';
export type AuthTemplate = 'magic_link' | 'confirmation';

export function authEmail(kind: AuthTemplate, token = '{{ .Token }}'): { subject: string; html: string; text: string } {
  const first = kind === 'confirmation';
  const { html, text } = renderEmail({
    lang: 'el',
    subject: AUTH_SUBJECT,
    preheader: `Ο κωδικός σου: ${token}`,
    bodyHtml: [
      block.heading(first ? 'Καλώς ήρθες στο NetProphet' : 'Ο κωδικός σου'),
      block.paragraph(first ? 'Γράψε αυτόν τον κωδικό στην εφαρμογή για να ξεκινήσεις:' : 'Γράψε αυτόν τον κωδικό στο NetProphet για να μπεις:'),
      block.code(token),
      block.note('Ισχύει για μία ώρα. Μην τον δώσεις σε κανέναν.'),
    ].join('\n'),
    bodyText: [
      first ? 'Καλώς ήρθες στο NetProphet' : 'Ο κωδικός σου',
      '',
      first ? 'Γράψε αυτόν τον κωδικό στην εφαρμογή για να ξεκινήσεις:' : 'Γράψε αυτόν τον κωδικό στο NetProphet για να μπεις:',
      '',
      token,
      '',
      'Ισχύει για μία ώρα. Μην τον δώσεις σε κανέναν.',
    ].join('\n'),
    why: first
      ? 'Πήρες αυτό το email επειδή ζητήθηκε λογαριασμός NetProphet με αυτή τη διεύθυνση. Αν δεν ήσουν εσύ, αγνόησέ το.'
      : 'Πήρες αυτό το email επειδή ζητήθηκε κωδικός σύνδεσης στο NetProphet. Αν δεν ήσουν εσύ, αγνόησέ το.',
  });
  return { subject: AUTH_SUBJECT, html, text };
}
