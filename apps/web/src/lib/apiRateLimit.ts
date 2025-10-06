/**
 * API Rate Limiting Middleware
 * Usage in API routes to prevent abuse
 */

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, RateLimitConfig, RATE_LIMITS } from "./rateLimit";

// Re-export RATE_LIMITS for convenience
export { RATE_LIMITS } from "./rateLimit";

/**
 * Get client identifier from request
 * Uses IP address or fallback to a default
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get IP from various headers (in order of preference)
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown";

  return ip;
}

/**
 * Rate limit an API route
 * Returns a response if rate limit exceeded, null otherwise
 *
 * @example
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const rateLimitResponse = await applyRateLimit(request, RATE_LIMITS.auth);
 *   if (rateLimitResponse) return rateLimitResponse;
 *
 *   // ... rest of your API logic
 * }
 * ```
 */
export function applyRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): NextResponse | null {
  const identifier = getClientIdentifier(request);
  const result = checkRateLimit(identifier, config);

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Too many requests",
        message: "You have exceeded the rate limit. Please try again later.",
        retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((result.reset - Date.now()) / 1000)),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": String(result.remaining),
          "X-RateLimit-Reset": String(result.reset),
        },
      }
    );
  }

  return null;
}

/**
 * Add rate limit headers to a successful response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  limit: number,
  remaining: number,
  reset: number
): NextResponse {
  response.headers.set("X-RateLimit-Limit", String(limit));
  response.headers.set("X-RateLimit-Remaining", String(remaining));
  response.headers.set("X-RateLimit-Reset", String(reset));
  return response;
}

/**
 * Example usage in an API route:
 *
 * import { applyRateLimit, RATE_LIMITS } from '@/lib/apiRateLimit';
 *
 * export async function POST(request: NextRequest) {
 *   // Apply rate limiting
 *   const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.auth);
 *   if (rateLimitResponse) return rateLimitResponse;
 *
 *   // Your API logic here
 *   const data = await processRequest(request);
 *
 *   return NextResponse.json({ success: true, data });
 * }
 */
