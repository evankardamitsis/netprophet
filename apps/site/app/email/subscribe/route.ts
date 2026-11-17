import { NextRequest, NextResponse } from 'next/server';
import { subscribeList } from '../../../src/unsubscribe';

/**
 * The home page's sign-up box posts here. The database queues the confirm email (double opt-in) and answers the
 * same whatever the address's state, so this page says the same too. A filled bot trap is dropped quietly.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const lang = form?.get('lang') === 'en' ? 'en' : 'el';
  const email = String(form?.get('email') ?? '');
  const trap = String(form?.get('website') ?? '');
  const result = trap ? 'ok' : await subscribeList(email, lang);
  const sent = { ok: '1', bad: '0', error: 'err' }[result];
  const l = lang === 'en' ? '&l=en' : '';
  return NextResponse.redirect(new URL(`/email/confirm?sent=${sent}${l}`, request.url), 303);
}

export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/#list', request.url), 303);
}
