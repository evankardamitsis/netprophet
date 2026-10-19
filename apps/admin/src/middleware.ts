import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { V2_PUBLISHABLE_KEY, V2_URL, v2Configured } from './lib/v2/env';

/**
 * The v2 admin is staff only. Outside /v2 the old v1 pages and APIs are closed: pages go to /v2, APIs answer 404,
 * except the v2 crons (they check CRON_SECRET themselves). Inside /v2, signed-out visitors go to /v2/login and a
 * signed-in account without a staff role is signed out there. Pages and every database write check the role again.
 */
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith('/api/cron/v2-')) return NextResponse.next();
  if (path.startsWith('/api/')) return new NextResponse(null, { status: 404 });
  if (path !== '/v2' && !path.startsWith('/v2/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/v2';
    url.search = '';
    return NextResponse.redirect(url);
  }
  if (!v2Configured) return NextResponse.next();
  // the kit page (sample data only) is open in development, to check the look without signing in
  if (process.env.NODE_ENV === 'development' && path.startsWith('/v2/kit')) return NextResponse.next();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(V2_URL, V2_PUBLISHABLE_KEY, {
    db: { schema: 'api' },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  const isLogin = path.startsWith('/v2/login');
  const redirectTo = (pathname: string, search = '') => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = search;
    const out = NextResponse.redirect(url);
    // keep the session cookies the client refreshed or cleared on the way
    response.cookies.getAll().forEach((c) => out.cookies.set(c));
    return out;
  };
  if (!data.user) return isLogin ? response : redirectTo('/v2/login');

  const { data: me } = await supabase.rpc('get_me');
  const role = (me as { profile?: { role?: string } } | null)?.profile?.role;
  if (role !== 'admin' && role !== 'editor') {
    await supabase.auth.signOut();
    return redirectTo('/v2/login', '?denied=1');
  }
  return isLogin ? redirectTo('/v2/results') : response;
}

// everything but built files and public assets (anything with a file extension)
export const config = { matcher: ['/((?!_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)'] };
