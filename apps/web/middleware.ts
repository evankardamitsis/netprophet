import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define supported locales
const locales = ["en", "el"];
const defaultLocale = "el";

// Get the preferred locale from request headers
function getLocale(request: NextRequest): string {
  const acceptLanguage = request.headers.get("accept-language");
  if (!acceptLanguage) return defaultLocale;

  // Simple locale detection - prioritize Greek, then English
  if (
    acceptLanguage.includes("en") &&
    !acceptLanguage.includes("el") &&
    !acceptLanguage.includes("gr")
  ) {
    return "en";
  }

  // Default to Greek for all other cases (including Greek, Greek variants, or unknown)
  return defaultLocale;
}

export function middleware(request: NextRequest) {
  // Check if there is any supported locale in the pathname
  const { pathname } = request.nextUrl;
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    return;
  }

  // Redirect if there is no locale
  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;

  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: [
    // Skip all internal paths (_next)
    "/((?!_next|api|_vercel|.*\\..*).*)",
  ],
};
