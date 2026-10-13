import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { V2_URL } from '@/lib/v2/env';
import { rowsForTournament } from '@/lib/v2/sheets';

export const dynamic = 'force-dynamic';

type Rpc = (fn: string, args: object) => Promise<{ data: unknown; error: { message: string } | null }>;

interface Due {
  id: string;
  name: string;
  source_kind: string | null;
  source_url: string | null;
  season_start_year: number | null;
  last_run_at: string | null;
}

const athensHour = () =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));

/**
 * Scheduled read of the organisers' sheets (M4 part 1). Vercel fires it at 05, 06, 19 and 20 UTC; only the two
 * that land on 08:00 and 22:00 in Athens do the work (summer and winter), unless ?force=1.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not set' }, { status: 500 });
  if (request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hour = athensHour();
  if (request.nextUrl.searchParams.get('force') !== '1' && hour !== 8 && hour !== 22) {
    return NextResponse.json({ skipped: true, athensHour: hour });
  }

  const key = process.env.V2_SUPABASE_SERVICE_ROLE_KEY;
  if (!V2_URL || !key) return NextResponse.json({ error: 'v2 service client is not configured' }, { status: 500 });
  const client = createClient(V2_URL, key, { db: { schema: 'api' }, auth: { persistSession: false, autoRefreshToken: false } });
  const rpc = client.rpc.bind(client) as unknown as Rpc;

  const due = await rpc('ingest_due', {});
  if (due.error) return NextResponse.json({ error: due.error.message }, { status: 500 });

  const results: { id: string; name: string; ok: boolean; result?: unknown; error?: string }[] = [];
  for (const t of (due.data ?? []) as Due[]) {
    try {
      const rows = await rowsForTournament(t);
      const run = await rpc('ingest_cron_run', { p_tournament_id: t.id, p_rows: rows });
      if (run.error) throw new Error(run.error.message);
      results.push({ id: t.id, name: t.name, ok: true, result: run.data });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'run failed';
      const logged = await rpc('ingest_cron_run', { p_tournament_id: t.id, p_rows: [], p_error: message });
      results.push({ id: t.id, name: t.name, ok: false, error: logged.error ? `${message} (and logging it failed: ${logged.error.message})` : message });
    }
  }
  return NextResponse.json({ athensHour: hour, tournaments: results });
}
