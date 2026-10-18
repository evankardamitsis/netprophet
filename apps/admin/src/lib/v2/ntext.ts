/**
 * The notification texts' rules, the same as core.ntext_fill and api.admin_update_notification_text in
 * supabase-v2/migrations/20270208000000_notification_texts.sql, so the admin preview and checks match what is sent.
 *
 * Fill: {name} gets the value. The text is cut into pieces at « · »; a piece whose value is missing (null or
 * undefined) is left out with its « · ». An empty value keeps the piece.
 */
export const SEPARATOR = ' · ';
export const TITLE_MAX = 60;
export const BODY_MAX = 180;
const NAME = /\{([a-z_]+)\}/g;

export type Vars = Record<string, string | number | null | undefined>;

/** the {placeholders} in a text, in order */
export function placeholderNames(text: string): string[] {
  return Array.from(text.matchAll(NAME), (m) => m[1]);
}

/** characters as the database counts them (char_length) */
export const length = (text: string) => [...text.trim()].length;

export function fillText(text: string, vars: Vars): string {
  return text
    .split(SEPARATOR)
    .filter((piece) => placeholderNames(piece).every((n) => vars[n] !== null && vars[n] !== undefined))
    .map((piece) => piece.replace(NAME, (_, n: string) => String(vars[n])))
    .join(SEPARATOR);
}

export type TextProblem =
  | { code: 'title_required' | 'body_required' | 'title_too_long' | 'body_too_long' | 'em_dash' | 'stray_brace' }
  | { code: 'unknown_placeholder'; name: string };

/** what the database would refuse, checked before saving (the database checks again) */
export function checkText(title: string, body: string, allowed: string[]): TextProblem | null {
  const t = title.trim();
  const b = body.trim();
  if (!t) return { code: 'title_required' };
  if (!b) return { code: 'body_required' };
  if (length(t) > TITLE_MAX) return { code: 'title_too_long' };
  if (length(b) > BODY_MAX) return { code: 'body_too_long' };
  if ((t + b).includes('\u2014')) return { code: 'em_dash' };
  const unknown = [...placeholderNames(t), ...placeholderNames(b)].find((n) => !allowed.includes(n));
  if (unknown) return { code: 'unknown_placeholder', name: unknown };
  if (/[{}]/.test((t + b).replace(NAME, ''))) return { code: 'stray_brace' };
  return null;
}

/** a database error message («unknown_placeholder: count») as a problem, when it is one of ours */
export function problemFromError(message: string): TextProblem | null {
  const m = /^unknown_placeholder: ([a-z_]+)/.exec(message);
  if (m) return { code: 'unknown_placeholder', name: m[1] };
  const codes = ['title_required', 'body_required', 'title_too_long', 'body_too_long', 'em_dash', 'stray_brace'] as const;
  const code = codes.find((c) => message.startsWith(c));
  return code ? { code } : null;
}
