import { NextRequest, NextResponse } from 'next/server';
import { confirmList } from '../../../src/unsubscribe';

/**
 * The «Ναι» button on /email/confirm posts here. Only a POST confirms: a mail scanner that opens the email's link
 * (a GET) lands on the page with the button and changes nothing.
 */
export async function POST(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const ok = await confirmList(q.get('t') ?? '');
  const l = q.get('l') === 'en' ? '&l=en' : '';
  return NextResponse.redirect(new URL(`/email/confirm?done=${ok ? 1 : 0}${l}`, request.url), 303);
}

export function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const l = q.get('l') === 'en' ? '&l=en' : '';
  return NextResponse.redirect(new URL(`/email/confirm?t=${encodeURIComponent(q.get('t') ?? '')}${l}`, request.url), 303);
}
