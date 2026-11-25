import { NextRequest, NextResponse } from 'next/server';
import { bearerMatches } from '@/lib/cronAuth';
import { createV2ServiceClient } from '@/lib/v2/service';
import { appleConfigured, appleDay, appleToken, googleToken, playConfigured, playMonth } from '@/lib/v2/storeFetch';
import { appleDaysToFetch, isoDay, playMonths } from '@/lib/v2/storeStats';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** the first day the app could be downloaded anywhere */
const STORE_FROM = '2026-11-01';

type Row = { store: 'apple' | 'google'; day: string; downloads: number };

/**
 * Once a day (Numbers desk, founder 25 Nov 2026): store downloads from Apple and Google into core.store_daily, and a
 * snapshot of who opened the app in the last 1, 7 and 30 days. Each part runs on its own; one failing does not stop
 * the others, and the answer says what happened to each.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not set' }, { status: 500 });
  if (!bearerMatches(request.headers.get('authorization'), secret)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const svc = createV2ServiceClient();
  if (!svc) return NextResponse.json({ error: 'v2 service client is not configured' }, { status: 500 });
  const { rpc } = svc;
  const out: Record<string, unknown> = {};

  const snap = await rpc('admin_activity_snapshot', {});
  out.snapshot = snap.error ? { error: snap.error.message } : snap.data;

  const yesterday = isoDay(new Date(Date.now() - 86_400_000));

  if (appleConfigured()) {
    try {
      const now = await rpc('admin_numbers', { p_days: 400 });
      if (now.error) throw new Error(now.error.message);
      const have = new Set(
        ((now.data as { days: { day: string; apple: number | null }[] }).days ?? []).filter((d) => d.apple !== null).map((d) => d.day),
      );
      const token = appleToken();
      const rows: Row[] = [];
      for (const day of appleDaysToFetch(have, STORE_FROM, yesterday)) rows.push({ store: 'apple', day, downloads: await appleDay(day, token) });
      const saved = await rpc('admin_store_record', { p_rows: rows });
      if (saved.error) throw new Error(saved.error.message);
      out.apple = { days: rows.length, downloads: rows.reduce((n, r) => n + r.downloads, 0) };
    } catch (e) {
      out.apple = { error: e instanceof Error ? e.message : 'failed' };
    }
  } else out.apple = { skipped: 'not configured' };

  if (playConfigured()) {
    try {
      const token = await googleToken();
      const rows: Row[] = [];
      for (const month of playMonths(isoDay(new Date()))) {
        for (const d of await playMonth(month, token)) if (d.day >= STORE_FROM) rows.push({ store: 'google', ...d });
      }
      const saved = await rpc('admin_store_record', { p_rows: rows });
      if (saved.error) throw new Error(saved.error.message);
      out.google = { days: rows.length, downloads: rows.reduce((n, r) => n + r.downloads, 0) };
    } catch (e) {
      out.google = { error: e instanceof Error ? e.message : 'failed' };
    }
  } else out.google = { skipped: 'not configured' };

  const failed = [out.apple, out.google, out.snapshot].some((p) => p && typeof p === 'object' && 'error' in p);
  return NextResponse.json(out, { status: failed ? 502 : 200 });
}
