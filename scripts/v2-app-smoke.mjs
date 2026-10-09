#!/usr/bin/env node
// End-to-end check of the app's data path on the LOCAL v2 stack (scripts/v2-db-remote.sh starts it, with mail):
// a new user signs in with an email code, reads the feed, votes, reads get_me. Run from the repo root:
//   node scripts/v2-app-smoke.mjs
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../packages/db/package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');

const status = JSON.parse(execFileSync('supabase', ['--workdir', '.supabase-v2', 'status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
const { API_URL, ANON_KEY, MAILPIT_URL } = status;
if (!MAILPIT_URL) throw new Error('local stack runs without mail; start it without -x inbucket');

const email = `smoke-${Date.now()}@test.local`;
const sb = createClient(API_URL, ANON_KEY, { db: { schema: 'api' }, auth: { persistSession: false } });
const ok = (label, cond, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${detail ? `  ${detail}` : ''}`);
  if (!cond) process.exitCode = 1;
};

{
  const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  ok('code sent', !error, error?.message);
}

let code = null;
for (let i = 0; i < 20 && !code; i += 1) {
  await new Promise((r) => setTimeout(r, 300));
  const list = await (await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json();
  const id = list.messages?.[0]?.ID;
  if (id) {
    const msg = await (await fetch(`${MAILPIT_URL}/api/v1/message/${id}`)).json();
    code = /\b(\d{6})\b/.exec(msg.Text ?? '')?.[1] ?? null;
  }
}
ok('code arrived by email', !!code);

{
  const { data, error } = await sb.auth.verifyOtp({ email, token: code, type: 'email' });
  ok('signed in with the code', !!data?.session && !error, error?.message);
}

const feed = await sb.rpc('get_feed', { p_limit: 30 });
ok('get_feed works for a brand-new user (profile was bootstrapped)', !feed.error, feed.error?.message);
const matches = (feed.data?.items ?? []).filter((it) => it.kind === 'match');
ok('feed has open matches', matches.length > 0, `${matches.length} cards`);

const target = matches.find((m) => m.my_vote == null);
const vote = await sb.rpc('cast_vote', { p_match_id: target.match_id, p_side: 1 });
ok('cast_vote returns a split', !vote.error && vote.data?.split?.total >= 1, vote.error?.message ?? JSON.stringify(vote.data?.split));
const again = await sb.rpc('cast_vote', { p_match_id: target.match_id, p_side: 1 });
ok('the same vote again is a replay', again.data?.replayed === true);
const change = await sb.rpc('cast_vote', { p_match_id: target.match_id, p_side: 2 });
ok('a changed vote is refused', change.error?.message?.startsWith('already_voted'), change.error?.message);

const after = await sb.rpc('get_feed', { p_limit: 30 });
const voted = after.data.items.find((it) => it.kind === 'match' && it.match_id === target.match_id);
ok('feed shows my vote and the split', voted?.my_vote === 1 && voted?.split != null);

const me = await sb.rpc('get_me');
ok('get_me returns game state', !me.error && typeof me.data?.game?.streak === 'number', me.error?.message ?? `streak ${me.data?.game?.streak}, points ${me.data?.game?.total_points}`);

const areas = await sb.from('areas').select('id, name_el');
ok('areas are readable', !areas.error && areas.data.length > 0, areas.error?.message);
