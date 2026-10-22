#!/usr/bin/env node
/**
 * Read-only inventory of the v1 project for the cutover (docs/v2/cutover-runbook.md): counts per table, what changed
 * since a moment (the backup), and the sign-in providers of the accounts. Only GET and HEAD requests; prints
 * counts, never names, emails or ids.
 *
 *   node tools/migrate/v1_inventory.mjs                        changes since the 9 Oct 2026 backup
 *   node tools/migrate/v1_inventory.mjs 2026-11-02T07:00:00Z   changes since that moment
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (v1) from the root .env.local, or the environment
 * (V1_SUPABASE_URL / V1_SUPABASE_SERVICE_ROLE_KEY win).
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const V1_REF = 'mgojbigzulgkjomgirrm';
const SINCE = process.argv[2] ?? '2026-10-09T08:13:51Z';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const fileEnv = {};
const envPath = process.env.ENV_FILE ?? join(root, '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) fileEnv[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
const env = (...names) => names.map((n) => process.env[n] ?? fileEnv[n]).find(Boolean) ?? null;
const url = env('V1_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL');
const key = env('V1_SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY');
if (!url || !key) {
  console.error('Missing the v1 URL or service role key. See the top of this file.');
  process.exit(1);
}
if (!url.includes(V1_REF)) {
  console.error('The URL is not the v1 project; refusing.');
  process.exit(1);
}
const H = { apikey: key, Authorization: `Bearer ${key}` };

async function count(path) {
  const res = await fetch(`${url}/rest/v1/${path}`, { method: 'HEAD', headers: { ...H, Prefer: 'count=exact', Range: '0-0' } });
  return res.ok ? Number(res.headers.get('content-range')?.split('/')[1]) : `error ${res.status}`;
}

const rows = [
  ['players', 'players?select=id'],
  ['  claimed', 'players?select=id&claimed_by_user_id=not.is.null'],
  ['  demo', 'players?select=id&is_demo_player=eq.true'],
  ['  age 5 to 17 (minors)', 'players?select=id&age=gte.5&age=lte.17'],
  ['profiles', 'profiles?select=id'],
  ['  admins', 'profiles?select=id&is_admin=eq.true'],
  ['  creation requested', 'profiles?select=id&profile_claim_status=eq.creation_requested'],
  ['tournaments', 'tournaments?select=id'],
  ['tournament categories', 'tournament_categories?select=id'],
  ['matches', 'matches?select=id'],
  ['match results', 'match_results?select=id'],
  ['dropped: bets', 'bets?select=id'],
  ['dropped: transactions', 'transactions?select=id'],
  ['dropped: profiles with a coin balance', 'profiles?select=id&balance=gt.0'],
  [`changed since ${SINCE}: players`, `players?select=id&updated_at=gt.${SINCE}`],
  ['  tournaments', `tournaments?select=id&updated_at=gt.${SINCE}`],
  ['  matches created', `matches?select=id&created_at=gt.${SINCE}`],
  ['  matches updated', `matches?select=id&updated_at=gt.${SINCE}`],
  ['  results created', `match_results?select=id&created_at=gt.${SINCE}`],
  ['  profiles created', `profiles?select=id&created_at=gt.${SINCE}`],
  ['  bets created', `bets?select=id&created_at=gt.${SINCE}`],
];
for (const [label, path] of rows) console.log(label.padEnd(48), await count(path));

const users = [];
for (let page = 1; ; page += 1) {
  const res = await fetch(`${url}/auth/v1/admin/users?page=${page}&per_page=1000`, { headers: H });
  const batch = (await res.json()).users ?? [];
  users.push(...batch);
  if (batch.length < 1000) break;
}
const providers = {};
let after = 0, signedIn = 0, unconfirmed = 0;
for (const u of users) {
  // the list endpoint leaves identities out; app_metadata.providers says the same
  const p = (u.app_metadata?.providers ?? [u.app_metadata?.provider]).filter(Boolean).sort().join('+') || '(none)';
  providers[p] = (providers[p] ?? 0) + 1;
  if (u.created_at > SINCE) after += 1;
  if (u.last_sign_in_at && u.last_sign_in_at > SINCE) signedIn += 1;
  if (!u.email_confirmed_at) unconfirmed += 1;
}
console.log('accounts'.padEnd(48), users.length);
console.log('  sign-in providers'.padEnd(48), JSON.stringify(providers));
console.log('  email not confirmed'.padEnd(48), unconfirmed);
console.log(`  created since ${SINCE}`.padEnd(48), after);
console.log(`  signed in since ${SINCE}`.padEnd(48), signedIn);
