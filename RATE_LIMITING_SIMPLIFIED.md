# Rate Limiting - Simplified Approach for Supabase Apps

## TL;DR

**You only need to rate limit YOUR custom API routes.**  
Supabase automatically rate limits all database, auth, and storage operations.

---

## What's Already Protected ✅

### Supabase Handles These Automatically:

- ✅ Database queries (`supabase.from()...`)
- ✅ Authentication (`supabase.auth.*`)
- ✅ Storage operations
- ✅ Edge Functions
- ✅ Realtime subscriptions

**No action needed** for these - Supabase's infrastructure protects them.

---

## What YOU Need to Rate Limit 🔴

### Priority 1: Stripe Payment Endpoints (CRITICAL)

These handle money and bypass Supabase:

**File: `apps/web/src/app/api/stripe/create-checkout-session/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { applyRateLimit, RATE_LIMITS } from "@/lib/apiRateLimit";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-07-30.basil",
});

export async function POST(request: NextRequest) {
  // 🔒 ADD THIS - Rate limit payment creation (10/hour)
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.payment);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { packId, userId } = await request.json();
    // ... rest of existing code
  } catch (error) {
    // ... existing error handling
  }
}
```

**File: `apps/web/src/app/api/stripe/webhook/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { applyRateLimit, RATE_LIMITS } from "@/lib/apiRateLimit";

// ... stripe initialization

export async function POST(request: NextRequest) {
  // 🔒 ADD THIS - Rate limit webhook (60/minute)
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api);
  if (rateLimitResponse) return rateLimitResponse;

  const body = await request.text();
  // ... rest of existing code
}
```

### Priority 2: Admin Dangerous Operations (HIGH)

**File: `apps/admin/src/app/api/admin/delete-user/route.ts`**

This one is actually fine as-is because:

1. It requires admin authentication (already protected)
2. It's in the admin app (limited access)
3. It already has the `requireAdmin` check

**Optional:** You could add rate limiting, but it's lower priority since admin users are trusted and already authenticated.

---

## Copy-Paste Implementation (5 minutes)

### Step 1: Copy the rate limit utility files

Already done ✅ - You have:

- `apps/web/src/lib/rateLimit.ts`
- `apps/web/src/lib/apiRateLimit.ts`

### Step 2: Update Stripe checkout route

**File:** `apps/web/src/app/api/stripe/create-checkout-session/route.ts`

Add import at top:

```typescript
import { applyRateLimit, RATE_LIMITS } from "@/lib/apiRateLimit";
```

Add at start of `POST` function (after line 15, before line 16):

```typescript
export async function POST(request: NextRequest) {
  // Rate limit payment creation
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.payment);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // ... existing code continues
```

### Step 3: Update Stripe webhook route

**File:** `apps/web/src/app/api/stripe/webhook/route.ts`

Add import at top:

```typescript
import { applyRateLimit, RATE_LIMITS } from "@/lib/apiRateLimit";
```

Add at start of `POST` function (after line 18, before line 19):

```typescript
export async function POST(request: NextRequest) {
  // Rate limit webhooks
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api);
  if (rateLimitResponse) return rateLimitResponse;

  const body = await request.text();
  // ... existing code continues
```

### Done! ✅

That's it - just 2 files to update, ~10 lines of code total.

---

## Why This Simplified Approach Works

1. **Supabase handles 90% of your traffic**
   - All database operations
   - All auth operations
   - You're already protected

2. **You only have a few custom endpoints**
   - Mainly Stripe payment processing
   - These are the critical ones to protect

3. **Admin routes are already protected**
   - Require admin authentication
   - Limited to trusted users
   - Rate limiting here is optional

---

## Testing Rate Limits

### Test Payment Endpoint:

```bash
# Try to create 15 checkout sessions rapidly
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/stripe/create-checkout-session \
    -H "Content-Type: application/json" \
    -d '{"packId":"starter","userId":"test-user"}'
  sleep 2
done
```

**Expected:**

- First 10 requests: Success (or validation errors)
- Requests 11-15: `429 Too Many Requests`

After 1 hour, limit resets.

### Test Webhook:

```bash
# Simulate 100 webhook calls
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/stripe/webhook \
    -H "Content-Type: application/json" \
    -d '{"test": true}'
  sleep 0.5
done
```

**Expected:**

- First 60 requests (within 1 minute): Success (or signature errors)
- Remaining requests: `429 Too Many Requests`

---

## Supabase Rate Limits (FYI)

Your Supabase plan automatically provides:

### Free Tier:

- ~500 API requests/second
- 50 concurrent Realtime connections
- 2GB database storage

### Pro Tier ($25/month):

- ~2,500 API requests/second
- 500 concurrent Realtime connections
- 8GB database storage

### You're Already Protected By Supabase For:

- Database queries (PostgREST)
- Authentication requests
- Storage uploads/downloads
- Edge Functions
- Realtime subscriptions

---

## FAQ

**Q: Do I need to rate limit database queries?**  
A: No, Supabase does this automatically.

**Q: What about auth endpoints?**  
A: Supabase handles it. Their auth system has built-in rate limiting.

**Q: Should I rate limit admin endpoints?**  
A: Optional. They're already behind authentication. Focus on payment endpoints first.

**Q: What if I exceed Supabase's rate limits?**  
A: Upgrade your plan or implement caching. Very unlikely in a soft launch.

**Q: Can I remove all the rate limiting code?**  
A: Keep it for Stripe endpoints. Remove it from other routes if you want to simplify.

---

## Final Recommendation for Soft Launch

### Minimum Required (15 minutes):

✅ Rate limit Stripe checkout creation endpoint  
✅ Rate limit Stripe webhook endpoint  
✅ Test both endpoints

### Optional (Later):

⏭️ Rate limit admin dangerous operations  
⏭️ Add more comprehensive rate limiting as you scale  
⏭️ Move to Redis-based rate limiting for multi-server deployments

---

## Summary

**You're mostly covered by Supabase!** 🎉

Just add rate limiting to your 2 Stripe endpoints and you're good to go for soft launch.

Total implementation time: **15 minutes**  
Lines of code to add: **~10 lines**  
Files to modify: **2 files**

Much simpler than the original plan, and perfectly adequate for your use case.
