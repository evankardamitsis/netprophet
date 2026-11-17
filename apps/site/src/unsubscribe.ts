/**
 * Turns off a person's game emails by the token in their email's link, with no sign-in: api.email_unsubscribe on the
 * v2 database, called with the public (publishable) key. The token is the secret; a wrong one changes nothing.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function unsubscribe(token: string): Promise<boolean> {
  const url = process.env.V2_SUPABASE_URL;
  const key = process.env.V2_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !UUID.test(token)) return false;
  const r = await fetch(`${url}/rest/v1/rpc/email_unsubscribe`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Content-Profile': 'api' },
    body: JSON.stringify({ p_token: token }),
    cache: 'no-store',
  });
  if (!r.ok) return false;
  return (await r.json()) === true;
}
