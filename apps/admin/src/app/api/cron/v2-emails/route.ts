import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { V2_URL } from '@/lib/v2/env';
import { bearerMatches } from '@/lib/cronAuth';
import { renderDue, type DueEmail } from '@/lib/v2/mail';

export const dynamic = 'force-dynamic';

type Rpc = (fn: string, args: object) => Promise<{ data: unknown; error: { message: string } | null }>;

/** sender and replies (founder, 17 Nov 2026) */
const FROM = 'NetProphet <hello@netprophetapp.com>';
const REPLY_TO = 'hello@monadlabs.gr';

/**
 * Every 10 minutes: the emails the database says are due (core.emails via api.admin_emails_due, which already
 * applied the switch, the allow-list and each person's choice), rendered here and sent through Resend one by one.
 * Each result goes back to the database (api.admin_emails_done): sent, or tried again later, three times at most.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not set' }, { status: 500 });
  if (!bearerMatches(request.headers.get('authorization'), secret)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const key = process.env.V2_SUPABASE_SECRET_KEY;
  const resend = process.env.RESEND_API_KEY;
  if (!V2_URL || !key) return NextResponse.json({ error: 'v2 service client is not configured' }, { status: 500 });
  if (!resend) return NextResponse.json({ error: 'RESEND_API_KEY is not set' }, { status: 500 });
  const client = createClient(V2_URL, key, { db: { schema: 'api' }, auth: { persistSession: false, autoRefreshToken: false } });
  const rpc = client.rpc.bind(client) as unknown as Rpc;

  const due = await rpc('admin_emails_due', { p_limit: 40 });
  if (due.error) return NextResponse.json({ error: due.error.message }, { status: 500 });
  const rows = (due.data as DueEmail[]) ?? [];

  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const e of rows) {
    const mail = renderDue(e);
    if (!mail) {
      results.push({ id: e.id, ok: false, error: `cannot render ${e.kind} (no template, or the row lacks what it needs)` });
      continue;
    }
    const headers: Record<string, string> = {};
    if (mail.unsubscribeUrl) {
      // one-click unsubscribe (RFC 8058): Gmail and Apple Mail show their own button and POST to it
      headers['List-Unsubscribe'] = `<${mail.unsubscribeUrl}>`;
      headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
    }
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resend}`, 'Content-Type': 'application/json', 'Idempotency-Key': `np-email-${e.id}` },
        body: JSON.stringify({ from: FROM, reply_to: REPLY_TO, to: [e.to], subject: mail.subject, html: mail.html, text: mail.text, headers }),
      });
      results.push(r.ok ? { id: e.id, ok: true } : { id: e.id, ok: false, error: `resend ${r.status}: ${(await r.text()).slice(0, 200)}` });
    } catch (err) {
      results.push({ id: e.id, ok: false, error: err instanceof Error ? err.message : 'fetch failed' });
    }
    // Resend takes a few calls a second
    await new Promise((done) => setTimeout(done, 300));
  }

  const done = await rpc('admin_emails_done', { p_results: results });
  if (done.error) return NextResponse.json({ error: done.error.message, results: results.length }, { status: 500 });
  return NextResponse.json({ sent: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length });
}
