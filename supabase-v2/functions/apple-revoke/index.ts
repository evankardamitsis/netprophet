// Sign in with Apple, revoked when the account goes (App Store 5.1.1(v); the review of 28 Oct 2026 deleted a Sign in
// with Apple account). The app, just before api.delete_my_account, shows Apple's sheet once more and posts the fresh
// authorization code here; we trade it for the user's tokens at Apple and revoke the refresh token (or the access
// token when Apple gives no refresh token), which removes the app from the person's Apple ID.
// Only the signed-in user, and only an account with an Apple sign-in. Deployed with JWT checks on (the default):
//   supabase functions deploy apple-revoke
// Secrets (set in Supabase, never in the repo): APPLE_TEAM_ID, APPLE_SIWA_KEY_ID, APPLE_SIWA_PRIVATE_KEY (the .p8 of a
// key with Sign in with Apple enabled), APPLE_CLIENT_ID (the bundle id, gr.monadlabs.netprophet). SUPABASE_URL and
// SUPABASE_ANON_KEY are provided by the platform.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const TEAM = Deno.env.get('APPLE_TEAM_ID') ?? '';
const KID = Deno.env.get('APPLE_SIWA_KEY_ID') ?? '';
const PEM = Deno.env.get('APPLE_SIWA_PRIVATE_KEY') ?? '';
const CLIENT = Deno.env.get('APPLE_CLIENT_ID') ?? '';
const APPLE = 'https://appleid.apple.com';

const b64u = (b: Uint8Array | string) =>
  btoa(typeof b === 'string' ? b : String.fromCharCode(...b)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

/** the client secret Apple asks for: an ES256 JWT signed with the Sign in with Apple key, good for five minutes */
async function clientSecret(): Promise<string> {
  const der = Uint8Array.from(atob(PEM.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: 'ES256', kid: KID }));
  const body = b64u(JSON.stringify({ iss: TEAM, iat: now, exp: now + 300, aud: APPLE, sub: CLIENT }));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(`${head}.${body}`)));
  return `${head}.${body}.${b64u(sig)}`;
}

const form = (o: Record<string, string>) => new URLSearchParams(o).toString();

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  if (!TEAM || !KID || !PEM || !CLIENT) return Response.json({ error: 'not_configured' }, { status: 500 });

  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { auth: { persistSession: false } });
  const { data: who, error: whoError } = await db.auth.getUser(jwt);
  if (whoError || !who.user) return Response.json({ error: 'unauthorized' }, { status: 401 });
  if (!(who.user.identities ?? []).some((i) => i.provider === 'apple')) return Response.json({ error: 'no_apple_sign_in' }, { status: 400 });

  let code = '';
  try {
    code = String(((await req.json()) as { code?: unknown }).code ?? '');
  } catch {
    // falls through to the check below
  }
  if (!code) return Response.json({ error: 'no_code' }, { status: 400 });

  const secret = await clientSecret();
  const headers = { 'content-type': 'application/x-www-form-urlencoded' };
  const tok = await fetch(`${APPLE}/auth/token`, {
    method: 'POST',
    headers,
    body: form({ client_id: CLIENT, client_secret: secret, code, grant_type: 'authorization_code' }),
  });
  const tokens = (await tok.json().catch(() => ({}))) as { refresh_token?: string; access_token?: string; error?: string };
  if (!tok.ok) {
    console.error('apple token exchange failed', tok.status, tokens.error ?? '');
    return Response.json({ error: 'token_exchange_failed' }, { status: 502 });
  }
  const token = tokens.refresh_token ?? tokens.access_token;
  if (!token) return Response.json({ error: 'no_token' }, { status: 502 });
  const rev = await fetch(`${APPLE}/auth/revoke`, {
    method: 'POST',
    headers,
    body: form({ client_id: CLIENT, client_secret: secret, token, token_type_hint: tokens.refresh_token ? 'refresh_token' : 'access_token' }),
  });
  if (!rev.ok) {
    console.error('apple revoke failed', rev.status);
    return Response.json({ error: 'revoke_failed' }, { status: 502 });
  }
  return Response.json({ revoked: true });
});
