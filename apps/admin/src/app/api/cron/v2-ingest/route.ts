import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { V2_URL } from '@/lib/v2/env';
import { writeRecordsSheet } from '@/lib/v2/recordsSheet';
import { drawsForTournament, rowsForTournament } from '@/lib/v2/sheets';

export const dynamic = 'force-dynamic';

type Rpc = (fn: string, args: object) => Promise<{ data: unknown; error: { message: string } | null }>;

interface Due {
  id: string;
  name: string;
  source_kind: string | null;
  source_url: string | null;
  draw_url: string | null;
  season_start_year: number | null;
  last_run_at: string | null;
}

const athensHour = () =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));

/**
 * Scheduled read of the organisers' sheets: the schedule and, when there is one, the draw sheet. Three times a day
 * (founder: schedules change during the day): Vercel fires at 05, 06, 12, 13, 19 and 20 UTC and only the ones that
 * land on 08:00, 15:00 and 22:00 in Athens do the work (summer and winter), unless ?force=1.
 */
const HOURS = [8, 15, 22];
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not set' }, { status: 500 });
  if (request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hour = athensHour();
  if (request.nextUrl.searchParams.get('force') !== '1' && !HOURS.includes(hour)) {
    return NextResponse.json({ skipped: true, athensHour: hour });
  }

  const key = process.env.V2_SUPABASE_SECRET_KEY;
  if (!V2_URL || !key) return NextResponse.json({ error: 'v2 service client is not configured' }, { status: 500 });
  const client = createClient(V2_URL, key, { db: { schema: 'api' }, auth: { persistSession: false, autoRefreshToken: false } });
  const rpc = client.rpc.bind(client) as unknown as Rpc;

  const due = await rpc('ingest_due', {});
  if (due.error) return NextResponse.json({ error: due.error.message }, { status: 500 });

  const results: { id: string; name: string; kind: 'schedule' | 'draws'; ok: boolean; result?: unknown; error?: string }[] = [];
  for (const t of (due.data ?? []) as Due[]) {
    if (t.source_url) {
      try {
        const rows = await rowsForTournament(t);
        const run = await rpc('ingest_cron_run', { p_tournament_id: t.id, p_rows: rows });
        if (run.error) throw new Error(run.error.message);
        results.push({ id: t.id, name: t.name, kind: 'schedule', ok: true, result: run.data });
      } catch (e) {
        const message = e instanceof Error ? e.message : 'run failed';
        const logged = await rpc('ingest_cron_run', { p_tournament_id: t.id, p_rows: [], p_error: message });
        results.push({ id: t.id, name: t.name, kind: 'schedule', ok: false, error: logged.error ? `${message} (and logging it failed: ${logged.error.message})` : message });
      }
    }
    if (t.draw_url) {
      try {
        const draws = await drawsForTournament(t);
        const run = await rpc('ingest_cron_draws', { p_tournament_id: t.id, p_draws: draws });
        if (run.error) throw new Error(run.error.message);
        results.push({ id: t.id, name: t.name, kind: 'draws', ok: true, result: run.data });
      } catch (e) {
        const message = e instanceof Error ? e.message : 'draw read failed';
        const logged = await rpc('ingest_cron_draws', { p_tournament_id: t.id, p_draws: [], p_error: message });
        results.push({ id: t.id, name: t.name, kind: 'draws', ok: false, error: logged.error ? `${message} (and logging it failed: ${logged.error.message})` : message });
      }
    }
  }
  // rain (founder, 14 Oct): from the second run of the day, yesterday's sheet matches that still have no result are
  // called off; never at 08:00, results of late matches may only come in with the morning run
  let rainedOff: unknown = null;
  if (hour >= 15) {
    const rain = await rpc('cron_auto_rain', {});
    rainedOff = rain.error ? { error: rain.error.message } : rain.data;
  }
  // the records sheet mirrors what the runs left in the database; it never fails the run (writeRecordsSheet does not
  // throw), its problem is reported here and the next run tries again
  const records = await writeRecordsSheet(rpc);
  if (!records.ok) console.warn(`records sheet: ${records.message}`);
  return NextResponse.json({ athensHour: hour, tournaments: results, rainedOff, records });
}
