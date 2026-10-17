// RevenueCat webhook (founder, 17 Oct 2026: Pro and the cosmetics are paid for through RevenueCat: Stripe on the web,
// Google Play, later Apple). RevenueCat posts every purchase event here with the Authorization header set in its
// dashboard; we check it against REVENUECAT_WEBHOOK_SECRET and hand the body to api.apply_store_event, which applies
// each event once. Deploy without JWT checks (RevenueCat sends no Supabase token):
//   supabase functions deploy revenuecat-webhook --no-verify-jwt
// Secrets (set in Supabase, never in the repo): REVENUECAT_WEBHOOK_SECRET. SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are provided by the platform.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET') ?? '';
const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
  db: { schema: 'api' },
  auth: { persistSession: false },
});

/** constant-time compare, so the secret cannot be guessed by timing */
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const auth = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!SECRET || !same(auth, SECRET)) return new Response('unauthorized', { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response('bad json', { status: 400 });
  }
  const { data, error } = await db.rpc('apply_store_event', { p_event: body });
  if (error) {
    // a non-2xx makes RevenueCat retry later, which is what we want for a passing failure
    console.error('apply_store_event failed', error.message);
    return new Response('not applied', { status: 500 });
  }
  return Response.json(data);
});
