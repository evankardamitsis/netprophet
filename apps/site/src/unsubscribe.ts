/**
 * The email links of the website, with no sign-in: api RPCs on the v2 database, called with the public
 * (publishable) key. The token in a link is the secret; a wrong one changes nothing.
 *   * a player's token (game and Pro emails): api.email_unsubscribe
 *   * a list token (the website's weekly, k=list in the link): api.list_unsubscribe, api.list_confirm
 * The two kinds never mix: each RPC looks only in its own table.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type TokenKind = 'player' | 'list';
export const tokenKind = (k: string | null | undefined): TokenKind => (k === 'list' ? 'list' : 'player');
export const validToken = (t: string) => UUID.test(t);

async function rpc(fn: string, args: Record<string, unknown>): Promise<boolean> {
  const url = process.env.V2_SUPABASE_URL;
  const key = process.env.V2_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return false;
  try {
    const r = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Content-Profile': 'api' },
      body: JSON.stringify(args),
      cache: 'no-store',
    });
    if (!r.ok) return false;
    return (await r.json()) === true;
  } catch {
    return false;
  }
}

export async function unsubscribe(token: string, kind: TokenKind = 'player'): Promise<boolean> {
  if (!UUID.test(token)) return false;
  return kind === 'list' ? rpc('list_unsubscribe', { p_token: token }) : rpc('email_unsubscribe', { p_token: token });
}

export async function confirmList(token: string): Promise<boolean> {
  if (!UUID.test(token)) return false;
  return rpc('list_confirm', { p_token: token });
}

/**
 * The sign-up box: 'ok' for any well-formed address (the database answers the same whatever its state), 'bad' for
 * something that is not an email, 'error' when the database could not be reached.
 */
export async function subscribeList(email: string, lang: 'el' | 'en', source = 'site'): Promise<'ok' | 'bad' | 'error'> {
  const e = email.trim().toLowerCase();
  if (e.length > 254 || !EMAIL.test(e)) return 'bad';
  return (await rpc('list_subscribe', { p_email: e, p_source: source, p_lang: lang })) ? 'ok' : 'error';
}
