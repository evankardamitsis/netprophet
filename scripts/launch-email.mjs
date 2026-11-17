#!/usr/bin/env node
/**
 * The launch email to the old NetProphet's accounts (launch_v1, founder's email board, 17 Nov 2026).
 *
 * It is one email to one list, so it is not queued per person: this script renders it from the same template the
 * admin uses (apps/admin/src/lib/v2/mail/list.ts, bundled on the fly with esbuild) and either writes it to files or
 * leaves it in Resend as a DRAFT broadcast. It never sends. The founder opens the draft in Resend, sends a test to
 * himself, and presses Send there.
 *
 *   node scripts/launch-email.mjs                       dry run (default): writes launch-email.html and .txt
 *   node scripts/launch-email.mjs --out /some/dir       the same, into that folder
 *   node scripts/launch-email.mjs --draft --segment <id>
 *        creates the draft broadcast for that Resend segment (Resend now calls audiences segments; --audience <id>
 *        is taken too). The v1 list is the one scripts/v1-users-to-resend.mjs fills («NetProphet v1 users»).
 *
 * Before pressing Send: deploy apps/site with this change, so the screens under /email/screens/ and the art under
 * /email/art/ exist (the email links them from www.netprophetapp.com).
 *
 * Reads the root .env.local, then the environment (the environment wins). --draft needs RESEND_API_KEY.
 * Resend puts each contact's own unsubscribe link where the email says {{{RESEND_UNSUBSCRIBE_URL}}}.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const FROM = 'NetProphet <hello@netprophetapp.com>';
const REPLY_TO = 'hello@monadlabs.gr';
const NAME = 'Launch: the new NetProphet (v1 accounts)';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (...names) => {
  for (const n of names) {
    const i = args.indexOf(n);
    if (i >= 0 && args[i + 1] && !args[i + 1].startsWith('--')) return args[i + 1];
  }
  return null;
};

const fileEnv = {};
const envPath = join(root, '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) fileEnv[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
const env = (name) => process.env[name] ?? fileEnv[name] ?? null;

/** the template, bundled from the admin's TypeScript into a temporary module */
async function render() {
  const dir = mkdtempSync(join(tmpdir(), 'np-launch-'));
  const out = join(dir, 'list.mjs');
  try {
    await build({
      entryPoints: [join(root, 'apps/admin/src/lib/v2/mail/list.ts')],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile: out,
      logLevel: 'error',
    });
    const mod = await import(pathToFileURL(out).href);
    return mod.launchEmail();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const mail = await render();

if (!flag('--draft')) {
  const dir = resolve(value('--out') ?? process.cwd());
  writeFileSync(join(dir, 'launch-email.html'), mail.html);
  writeFileSync(join(dir, 'launch-email.txt'), mail.text);
  console.log(`Dry run. Subject: ${mail.subject}`);
  console.log(`Wrote ${join(dir, 'launch-email.html')} and launch-email.txt. Nothing was sent to Resend.`);
  console.log('To leave it in Resend as a draft: node scripts/launch-email.mjs --draft --segment <id>');
  process.exit(0);
}

const key = env('RESEND_API_KEY');
const segment = value('--segment', '--audience');
if (!key || !segment) {
  console.error('--draft needs RESEND_API_KEY and --segment <id>.');
  process.exit(1);
}

// a draft only: no `send`, no `scheduled_at`. Resend keeps it until someone presses Send in its dashboard.
const res = await fetch('https://api.resend.com/broadcasts', {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    segment_id: segment,
    from: FROM,
    reply_to: REPLY_TO,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    name: NAME,
  }),
});
const body = await res.json().catch(() => null);
if (!res.ok) {
  console.error(`Resend said ${res.status}: ${body?.message ?? JSON.stringify(body)}`);
  process.exit(1);
}
console.log(`Draft broadcast created: ${body?.id}. Nothing was sent.`);
console.log('Open it at https://resend.com/broadcasts, send yourself a test, then press Send.');
