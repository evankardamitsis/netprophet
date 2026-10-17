#!/usr/bin/env node
/**
 * v1 users into v2 and into Resend, for the launch email (founder, 17 Oct 2026).
 *
 *   1. Any v1 account not yet in v2 is created there with the same id and email (no password moves: v2 signs in
 *      with the email code or Google, and Google links by the confirmed email). The v2 profile is made by the
 *      new-user trigger from the account's name.
 *   2. Every v1 account with an email is added to the Resend audience «NetProphet v1 users» (created if missing),
 *      with first and last name. Contacts already there are left as they are, so someone who unsubscribed stays so.
 *
 * Reads the root .env.local, then the environment (the environment wins). Needed:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY            v1 (already in .env.local)
 *   V2_SUPABASE_URL (or NEXT_PUBLIC_V2_SUPABASE_URL), V2_SUPABASE_SERVICE_ROLE_KEY
 *   RESEND_API_KEY                                                  a key that can manage audiences
 *
 *   node scripts/v1-users-to-resend.mjs            dry run: counts only, writes nothing
 *   node scripts/v1-users-to-resend.mjs --apply    does it
 *
 * Prints counts, never addresses. Safe to run again.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AUDIENCE = 'NetProphet v1 users';
const APPLY = process.argv.includes('--apply');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fileEnv = {};
const envPath = join(root, '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) fileEnv[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
const env = (name, ...fallbacks) => {
  for (const n of [name, ...fallbacks]) {
    const v = process.env[n] ?? fileEnv[n];
    if (v) return v;
  }
  return null;
};

const cfg = {
  v1Url: env('V1_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'),
  v1Key: env('V1_SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY'),
  v2Url: env('V2_SUPABASE_URL', 'NEXT_PUBLIC_V2_SUPABASE_URL'),
  v2Key: env('V2_SUPABASE_SERVICE_ROLE_KEY'),
  resend: env('RESEND_API_KEY'),
};
const missing = Object.entries(cfg).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.error(`Missing settings: ${missing.join(', ')}. See the top of this file.`);
  process.exit(1);
}
if (cfg.v1Url === cfg.v2Url) {
  console.error('v1 and v2 point at the same project. Check NEXT_PUBLIC_SUPABASE_URL and V2_SUPABASE_URL.');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function http(url, init, label) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const res = await fetch(url, init);
    if (res.status === 429) {
      await sleep(1000 * (attempt + 1));
      continue;
    }
    const text = await res.text();
    const body = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error(`${label}: ${res.status} ${body?.message ?? body?.msg ?? text.slice(0, 200)}`);
    return body;
  }
  throw new Error(`${label}: rate limited`);
}

/** every account in a project, through the auth admin API */
async function allUsers(url, key) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const body = await http(`${url}/auth/v1/admin/users?page=${page}&per_page=1000`, { headers: { apikey: key, Authorization: `Bearer ${key}` } }, 'list users');
    const batch = body.users ?? [];
    users.push(...batch);
    if (batch.length < 1000) return users;
  }
}

/** first and last name from whatever the v1 sign-up stored */
function names(u) {
  const m = u.user_metadata ?? {};
  let first = m.firstName ?? m.first_name ?? m.given_name ?? '';
  let last = m.lastName ?? m.last_name ?? m.surname ?? m.family_name ?? '';
  if (!first && !last && (m.full_name || m.name)) {
    const parts = String(m.full_name || m.name).trim().split(/\s+/);
    first = parts.shift() ?? '';
    last = parts.join(' ');
  }
  return { first: String(first).trim(), last: String(last).trim() };
}

const resend = (path, init = {}) =>
  http(`https://api.resend.com${path}`, { ...init, headers: { Authorization: `Bearer ${cfg.resend}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) } }, `resend ${path}`);

async function main() {
  console.log(APPLY ? 'Applying.' : 'Dry run: nothing is written. Add --apply to do it.');

  const v1 = (await allUsers(cfg.v1Url, cfg.v1Key)).filter((u) => u.email && !u.deleted_at);
  const v2 = await allUsers(cfg.v2Url, cfg.v2Key);
  const v2Ids = new Set(v2.map((u) => u.id));
  const v2Emails = new Set(v2.map((u) => (u.email ?? '').toLowerCase()));
  const toCreate = v1.filter((u) => !v2Ids.has(u.id));
  const clash = toCreate.filter((u) => v2Emails.has(u.email.toLowerCase()));
  console.log(`v1 accounts with an email: ${v1.length}`);
  console.log(`already in v2: ${v1.length - toCreate.length}`);
  console.log(`to add to v2: ${toCreate.length - clash.length}${clash.length ? ` (${clash.length} skipped: the email already has a different v2 account)` : ''}`);

  let created = 0;
  for (const u of toCreate) {
    if (clash.includes(u)) continue;
    if (!APPLY) continue;
    const n = names(u);
    await http(
      `${cfg.v2Url}/auth/v1/admin/users`,
      {
        method: 'POST',
        headers: { apikey: cfg.v2Key, Authorization: `Bearer ${cfg.v2Key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: u.id,
          email: u.email.toLowerCase(),
          email_confirm: true,
          // what the v2 new-user trigger reads to fill the profile
          user_metadata: { ...(u.user_metadata ?? {}), first_name: n.first || undefined, surname: n.last || undefined, migrated_from: 'v1' },
        }),
      },
      'create v2 account',
    );
    created += 1;
  }
  if (APPLY) console.log(`added to v2: ${created}`);

  // Resend: find or make the audience, then add who is not there yet
  const audiences = (await resend('/audiences')).data ?? [];
  let audience = audiences.find((a) => a.name === AUDIENCE);
  if (!audience) {
    console.log(`Resend audience «${AUDIENCE}»: ${APPLY ? 'creating' : 'would be created'}`);
    if (APPLY) audience = await resend('/audiences', { method: 'POST', body: JSON.stringify({ name: AUDIENCE }) });
  }
  const existing = new Set();
  if (audience?.id) {
    const contacts = (await resend(`/audiences/${audience.id}/contacts`)).data ?? [];
    for (const c of contacts) existing.add(c.email.toLowerCase());
  }
  const toAdd = v1.filter((u) => !existing.has(u.email.toLowerCase()));
  console.log(`Resend: ${existing.size} already in the audience, ${toAdd.length} to add`);

  let added = 0;
  if (APPLY) {
    for (const u of toAdd) {
      const n = names(u);
      await resend(`/audiences/${audience.id}/contacts`, {
        method: 'POST',
        body: JSON.stringify({ email: u.email.toLowerCase(), first_name: n.first || undefined, last_name: n.last || undefined, unsubscribed: false }),
      });
      added += 1;
      // Resend allows 2 requests a second
      await sleep(600);
    }
    console.log(`Resend: added ${added}`);
  }
  console.log('Done.');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
