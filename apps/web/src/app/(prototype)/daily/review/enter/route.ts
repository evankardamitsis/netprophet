import { NextResponse, type NextRequest } from 'next/server';
import { REVIEW_COOKIE, tokenMatches } from '@/lib/daily/content/reviewAuth';

// Exchanges a token in the URL for an httpOnly cookie, once, then redirects to
// a clean URL. After this the token is not in the address bar, not in history,
// and not in anything the page sends to the client.
//
// The token is still in this one request's access log, which is why it is
// rotatable — change DAILY_REVIEW_TOKEN and every existing cookie stops working.

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest): NextResponse {
    const token = request.nextUrl.searchParams.get('token') ?? undefined;

    // A bad token is a 404, not a 401: an unlinked tool should not confirm it
    // exists to someone guessing.
    if (!tokenMatches(token)) {
        return new NextResponse(null, { status: 404 });
    }

    const response = NextResponse.redirect(new URL('/daily/review', request.url));
    response.cookies.set(REVIEW_COOKIE, token!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        // Strict, so a link from anywhere else cannot carry the session into a
        // server action. Next checks Origin on actions too; this is the belt.
        sameSite: 'strict',
        path: '/daily/review',
        maxAge: 60 * 60 * 12,
    });
    return response;
}
