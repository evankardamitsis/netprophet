import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { V2_PUBLISHABLE_KEY, V2_URL, v2Configured } from './lib/v2/env';

/**
 * v2 admin only (/v2/*): keep the v2 session fresh and send signed-out visitors to /v2/login.
 * The role check is on the server in each page and, for every write, in the database.
 */
export async function middleware(request: NextRequest) {
  if (!v2Configured) return NextResponse.next();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(V2_URL, V2_PUBLISHABLE_KEY, {
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
  const isLogin = request.nextUrl.pathname.startsWith('/v2/login');
  if (!data.user && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = '/v2/login';
    return NextResponse.redirect(url);
  }
  if (data.user && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = '/v2/results';
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = { matcher: ['/v2/:path*'] };
