import { NextRequest, NextResponse } from 'next/server';
import { unsubscribe } from '../../../src/unsubscribe';

/**
 * The List-Unsubscribe link of every game and Pro email. Gmail and Apple Mail POST here (one click, RFC 8058) and
 * the email's own «Διαγραφή» page posts its button here too; a plain GET (a link scanner, a preview) only shows the
 * page with the button, so nothing is turned off by accident.
 */
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('t') ?? '';
  const ok = await unsubscribe(token);
  if (request.nextUrl.searchParams.get('from') === 'page') {
    return NextResponse.redirect(new URL(`/email/off?done=${ok ? 1 : 0}`, request.url), 303);
  }
  return new NextResponse(ok ? 'ok' : 'unknown', { status: ok ? 200 : 404 });
}

export function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('t') ?? '';
  return NextResponse.redirect(new URL(`/email/off?t=${encodeURIComponent(token)}`, request.url), 303);
}
