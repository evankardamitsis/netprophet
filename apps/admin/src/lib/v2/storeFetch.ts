import { createSign, sign } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { appleDownloads, decodeReport, playDownloads, type StoreDay } from './storeStats';

/**
 * Server only: fetches the store reports for the Numbers desk's daily cron. The keys come from the admin's server
 * environment and never reach a browser:
 *   ASC_KEY_ID, ASC_ISSUER_ID, ASC_PRIVATE_KEY (the .p8 text), ASC_VENDOR_NUMBER: App Store Connect sales reports
 *   PLAY_SERVICE_ACCOUNT_JSON, PLAY_REPORTS_BUCKET: the Play service account and its reports bucket
 */

export const PLAY_PACKAGE = 'gr.monadlabs.netprophet';

const b64u = (b: string | Buffer) => Buffer.from(b).toString('base64url');

export function appleConfigured(): boolean {
  return Boolean(process.env.ASC_KEY_ID && process.env.ASC_ISSUER_ID && process.env.ASC_PRIVATE_KEY && process.env.ASC_VENDOR_NUMBER);
}

export function playConfigured(): boolean {
  return Boolean(process.env.PLAY_SERVICE_ACCOUNT_JSON && process.env.PLAY_REPORTS_BUCKET);
}

/** a key pasted into an environment variable may carry literal «\n» */
const pem = (k: string) => k.replace(/\\n/g, '\n');

function appleToken(): string {
  const now = Math.floor(Date.now() / 1000);
  const h = b64u(JSON.stringify({ alg: 'ES256', kid: process.env.ASC_KEY_ID, typ: 'JWT' }));
  const p = b64u(JSON.stringify({ iss: process.env.ASC_ISSUER_ID, iat: now, exp: now + 900, aud: 'appstoreconnect-v1' }));
  const sig = sign('sha256', Buffer.from(`${h}.${p}`), { key: pem(process.env.ASC_PRIVATE_KEY ?? ''), dsaEncoding: 'ieee-p1363' });
  return `${h}.${p}.${b64u(sig)}`;
}

/** one day's first-time App Store downloads; 0 when Apple has no sales for that day (or the report is not out yet) */
export async function appleDay(day: string, token = appleToken()): Promise<number> {
  const q = new URLSearchParams({
    'filter[frequency]': 'DAILY',
    'filter[reportType]': 'SALES',
    'filter[reportSubType]': 'SUMMARY',
    'filter[version]': '1_1',
    'filter[vendorNumber]': process.env.ASC_VENDOR_NUMBER ?? '',
    'filter[reportDate]': day,
  });
  const r = await fetch(`https://api.appstoreconnect.apple.com/v1/salesReports?${q}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/a-gzip' },
  });
  if (r.status === 404) return 0;
  if (!r.ok) throw new Error(`Apple answered ${r.status} for ${day}`);
  return appleDownloads(gunzipSync(Buffer.from(await r.arrayBuffer())).toString('utf8'));
}

export { appleToken };

async function googleToken(): Promise<string> {
  const sa = JSON.parse(process.env.PLAY_SERVICE_ACCOUNT_JSON ?? '{}') as { client_email?: string; private_key?: string };
  if (!sa.client_email || !sa.private_key) throw new Error('PLAY_SERVICE_ACCOUNT_JSON has no client_email or private_key');
  const now = Math.floor(Date.now() / 1000);
  const h = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const p = b64u(
    JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/devstorage.read_only', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }),
  );
  const s = createSign('RSA-SHA256');
  s.update(`${h}.${p}`);
  const assertion = `${h}.${p}.${b64u(s.sign(pem(sa.private_key)))}`;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  const j = (await r.json()) as { access_token?: string; error?: string };
  if (!r.ok || !j.access_token) throw new Error(`Google token: ${j.error ?? r.status}`);
  return j.access_token;
}

/** the days in one month's Play installs overview («202611»); none when Google has not written that month yet */
export async function playMonth(month: string, token?: string): Promise<StoreDay[]> {
  const t = token ?? (await googleToken());
  const name = `stats/installs/installs_${PLAY_PACKAGE}_${month}_overview.csv`;
  const r = await fetch(`https://storage.googleapis.com/storage/v1/b/${process.env.PLAY_REPORTS_BUCKET}/o/${encodeURIComponent(name)}?alt=media`, {
    headers: { Authorization: `Bearer ${t}` },
  });
  if (r.status === 404) return [];
  if (!r.ok) throw new Error(`Google answered ${r.status} for ${month}`);
  return playDownloads(decodeReport(new Uint8Array(await r.arrayBuffer())));
}

export { googleToken };
