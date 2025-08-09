import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define supported locales
const locales = ['en', 'el'];
const defaultLocale = 'en';

// Get the preferred locale from request headers
function getLocale(request: NextRequest): string {
  const acceptLanguage = request.headers.get('accept-language');
  if (!acceptLanguage) return defaultLocale;
  
  // Simple locale detection - you can make this more sophisticated
  if (acceptLanguage.includes('el') || acceptLanguage.includes('gr')) {
    return 'el';
  }
  
  return defaultLocale;
}

export function middleware(request: NextRequest) {
  // Check if there is any supported locale in the pathname
  const { pathname, search } = request.nextUrl;
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // Debug OAuth callbacks
  if (search.includes('code=')) {
    console.log('🔄 Middleware: OAuth callback detected');
    console.log('📍 Original URL:', request.url);
    console.log('🛤️ Pathname:', pathname);
    console.log('🔍 Search:', search);
  }

  if (pathnameHasLocale) return;

  // Redirect if there is no locale
  const locale = getLocale(request);
  
  request.nextUrl.pathname = `/${locale}${pathname}`;
  
  // Search parameters should be automatically preserved in request.nextUrl
  
  if (search.includes('code=')) {
    console.log('🚀 Middleware: Redirecting to:', request.nextUrl.toString());
  }
  
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: [
    // Skip all internal paths (_next)
    '/((?!_next|api|_vercel|.*\\..*).*)',
  ],
}; 