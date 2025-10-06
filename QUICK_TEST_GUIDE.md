# Quick Test Guide - Rate Limiting

## Test Your Rate Limiting Implementation

### Start the Dev Server

```bash
cd /Users/VKardamitsis/Projects/netprophet
pnpm dev
```

### Test 1: Payment Endpoint Rate Limit (10/hour)

Open a new terminal and run:

```bash
# Test creating 12 payment sessions (limit is 10/hour)
for i in {1..12}; do
  echo "Request $i:"
  curl -X POST http://localhost:3000/api/stripe/create-checkout-session \
    -H "Content-Type: application/json" \
    -d '{"packId":"starter","userId":"test-user-123"}'
  echo -e "\n---"
  sleep 3
done
```

**Expected Result:**

- Requests 1-10: Either success or validation errors (like "Invalid pack ID")
- Requests 11-12: `{"error":"Too many requests","message":"You have exceeded the rate limit. Please try again later.","retryAfter":...}`

### Test 2: Webhook Rate Limit (60/minute)

```bash
# Test webhook with 65 rapid requests (limit is 60/minute)
for i in {1..65}; do
  echo "Request $i:"
  curl -X POST http://localhost:3000/api/stripe/webhook \
    -H "Content-Type: application/json" \
    -d '{"test": true}'
  echo ""
  sleep 0.5
done
```

**Expected Result:**

- Requests 1-60: Error "Invalid signature" (expected - we're not sending real Stripe signatures)
- Requests 61-65: `{"error":"Too many requests",...}` with 429 status

### Test 3: Check Rate Limit Headers

```bash
# Single request to see headers
curl -i -X POST http://localhost:3000/api/stripe/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{"packId":"starter","userId":"test"}'
```

**Expected Headers:**

```
HTTP/1.1 400 Bad Request (or other status)
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9 (or less)
X-RateLimit-Reset: [unix timestamp]
```

### Test 4: Verify Rate Limit Reset

After hitting the limit:

```bash
# Wait for reset (check the reset timestamp from previous response)
# For payment endpoint: 1 hour
# For webhook: 1 minute

# Then try again
curl -X POST http://localhost:3000/api/stripe/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{"packId":"starter","userId":"test"}'
```

**Expected:** Should work again (new limit period started)

---

## Production Testing (After Deploy)

### Test on Vercel Preview

```bash
# Replace YOUR_PREVIEW_URL with your actual preview URL
export PREVIEW_URL="https://your-app-git-branch.vercel.app"

# Test payment endpoint
for i in {1..12}; do
  echo "Request $i:"
  curl -X POST $PREVIEW_URL/api/stripe/create-checkout-session \
    -H "Content-Type: application/json" \
    -d '{"packId":"starter","userId":"test"}'
  echo -e "\n---"
  sleep 3
done
```

---

## Troubleshooting

### Issue: All requests succeed (no rate limiting)

**Check:**

1. Rate limit files exist: `ls apps/web/src/lib/rate*.ts`
2. Imports are correct in the API routes
3. No TypeScript errors: `cd apps/web && pnpm tsc --noEmit`

### Issue: All requests fail immediately

**Check:**

1. The `applyRateLimit` is being called BEFORE other logic
2. Check server console for errors
3. Verify RATE_LIMITS is properly exported

### Issue: Rate limiting works but limits seem wrong

**Check:**

- `apps/web/src/lib/rateLimit.ts` - verify the RATE_LIMITS configuration
- Payment should be: `{ interval: 60 * 60 * 1000, maxRequests: 10 }`
- Webhook should use: `RATE_LIMITS.api` = `{ interval: 60 * 1000, maxRequests: 60 }`

---

## What Success Looks Like

✅ **Payment Endpoint:**

- First 10 requests in an hour: Process normally
- 11th+ requests: Return 429 with retry information
- After 1 hour: Limit resets

✅ **Webhook Endpoint:**

- First 60 requests in a minute: Process normally
- 61st+ requests: Return 429
- After 1 minute: Limit resets

✅ **Headers Present:**

- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
- `Retry-After` (when rate limited)

---

## Next Steps After Testing

1. ✅ Verify rate limiting works locally
2. ✅ Deploy to preview environment
3. ✅ Test on preview
4. ✅ Deploy to production
5. ✅ Monitor for the first 24 hours

**You're ready to launch!** 🚀
