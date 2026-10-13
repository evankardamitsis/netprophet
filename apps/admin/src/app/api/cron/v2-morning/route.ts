import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { V2_URL } from '@/lib/v2/env';
import { athensHour, morningEmail, type Digest } from '@/lib/v2/morningEmail';

export const dynamic = 'force-dynamic';

type Rpc = (fn: string, args: object) => Promise<{ data: unknown; error: { message: string } | null }>;

/** 08:30 Athens (Vercel fires at 05:30 and 06:30 UTC; the one that lands on 8 sends), or ?force=1 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not set' }, { status: 500 });
  if (request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const hour = athensHour();
  if (request.nextUrl.searchParams.get('force') !== '1' && hour !== 8) return NextResponse.json({ skipped: true, athensHour: hour });

  const key = process.env.V2_SUPABASE_SECRET_KEY;
  const resend = process.env.RESEND_API_KEY;
  if (!V2_URL || !key) return NextResponse.json({ error: 'v2 service client is not configured' }, { status: 500 });
  if (!resend) return NextResponse.json({ error: 'RESEND_API_KEY is not set' }, { status: 500 });
  const client = createClient(V2_URL, key, { db: { schema: 'api' }, auth: { persistSession: false, autoRefreshToken: false } });
  const rpc = client.rpc.bind(client) as unknown as Rpc;
  const res = await rpc('admin_morning_digest', {});
  if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });
  const d = res.data as Digest;
  if (!d.recipients.length) return NextResponse.json({ skipped: true, reason: 'no staff' });

  const mail = morningEmail(d);
  const sent = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resend}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'NetProphet <noreply@netprophetapp.com>', to: d.recipients, subject: mail.subject, html: mail.html, text: mail.text }),
  });
  if (!sent.ok) return NextResponse.json({ error: `Resend answered ${sent.status}` }, { status: 502 });
  return NextResponse.json({ sent: d.recipients.length, subject: mail.subject });
}
