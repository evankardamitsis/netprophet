import { NextRequest, NextResponse } from 'next/server';
import { tokenKind, unsubscribe } from '../../../src/unsubscribe';

/**
 * The List-Unsubscribe link of every game, Pro and list email. Gmail and Apple Mail POST here (one click, RFC 8058)
 * and the email's own «Διαγραφή» page posts its button here too; a plain GET (a link scanner, a preview) only shows
 * the page with the button, so nothing is turned off by accident. k=list marks a website list token (no account);
 * without it the token is a player's. l=en keeps the page in English.
 */
const extra = (q: URLSearchParams) => `${tokenKind(q.get('k')) === 'list' ? '&k=list' : ''}${q.get('l') === 'en' ? '&l=en' : ''}`;

export async function POST(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const ok = await unsubscribe(q.get('t') ?? '', tokenKind(q.get('k')));
  if (q.get('from') === 'page') {
    return NextResponse.redirect(new URL(`/email/off?done=${ok ? 1 : 0}${extra(q)}`, request.url), 303);
  }
  return new NextResponse(ok ? 'ok' : 'unknown', { status: ok ? 200 : 404 });
}

export function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  return NextResponse.redirect(new URL(`/email/off?t=${encodeURIComponent(q.get('t') ?? '')}${extra(q)}`, request.url), 303);
}
