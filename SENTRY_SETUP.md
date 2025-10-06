# Sentry Error Monitoring Setup

## Overview

Sentry is integrated into both the web app and admin panel for production error monitoring, including:

- ✅ React Error Boundary integration
- ✅ Automatic error capturing
- ✅ Session replay on errors
- ✅ Performance monitoring
- ✅ Source map upload for better stack traces

---

## Quick Setup (5 minutes)

### 1. Create Sentry Account

1. Go to [sentry.io](https://sentry.io/) and sign up (free tier available)
2. Create a new project for **Next.js**
3. Copy your **DSN** (looks like: `https://abc123@o456.ingest.sentry.io/789`)

### 2. Add Environment Variable

**For Vercel:**

```bash
# Add to Vercel environment variables
NEXT_PUBLIC_SENTRY_DSN=https://your-actual-dsn@sentry.io/project-id
```

**For Local Development (optional):**

```bash
# Add to .env.local
NEXT_PUBLIC_SENTRY_DSN=https://your-actual-dsn@sentry.io/project-id
NEXT_PUBLIC_SENTRY_ENABLED=true  # Only if you want Sentry in dev
```

### 3. Deploy

That's it! Sentry is already integrated and will:

- ✅ Automatically capture errors in production
- ✅ Send React component errors from Error Boundaries
- ✅ Track performance issues
- ✅ Record session replays when errors occur

---

## Configuration Files

The following files are already set up:

**Web App:**

- `apps/web/sentry.client.config.ts` - Browser-side config
- `apps/web/sentry.server.config.ts` - Server-side config
- `apps/web/src/components/ErrorBoundary.tsx` - Error boundary with Sentry

**Admin App:**

- `apps/admin/sentry.client.config.ts` - Browser-side config
- `apps/admin/sentry.server.config.ts` - Server-side config
- `apps/admin/src/components/ErrorBoundary.tsx` - Error boundary with Sentry

---

## What Gets Tracked

### Automatically Captured:

- ✅ Unhandled exceptions
- ✅ Promise rejections
- ✅ React component errors (via Error Boundaries)
- ✅ API route errors (if using Sentry wrappers)
- ✅ Console errors (configurable)

### Performance Monitoring:

- 10% of production transactions sampled
- Page load times
- API call durations
- Custom performance marks

### Session Replay:

- 10% of normal sessions
- 100% of sessions with errors
- User privacy protected (all text/media masked)

---

## Sentry Dashboard Features

Once deployed, you'll see in Sentry:

1. **Issues**: All errors grouped intelligently
2. **Performance**: Page load times, API latencies
3. **Releases**: Track errors by deployment
4. **Session Replay**: Watch what users did before errors
5. **Alerts**: Get notified of new/frequent errors

---

## Advanced Configuration (Optional)

### Add Source Maps Upload

For better stack traces in production:

**1. Get Sentry Auth Token:**

- Go to Sentry → Settings → Account → Auth Tokens
- Create token with `project:releases` scope

**2. Add to Vercel:**

```bash
SENTRY_AUTH_TOKEN=your_auth_token
SENTRY_ORG=your_org_name
SENTRY_PROJECT=your_project_name
```

**3. Update next.config.ts:**

```typescript
// apps/web/next.config.ts
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig = {
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
});
```

### Custom Error Tracking

You can manually capture errors anywhere:

```typescript
import * as Sentry from "@sentry/nextjs";

try {
  // Your code
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      section: "payment",
      critical: true,
    },
    extra: {
      userId: user.id,
      paymentAmount: amount,
    },
  });
}
```

### Add User Context

```typescript
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.username,
});
```

---

## Testing Sentry

### Test in Development:

```bash
# Enable Sentry in dev
export NEXT_PUBLIC_SENTRY_ENABLED=true
pnpm dev
```

Then trigger an error and check Sentry dashboard.

### Test in Production:

1. Deploy with `NEXT_PUBLIC_SENTRY_DSN` set
2. Visit your site
3. Trigger an error (or wait for a real one)
4. Check Sentry dashboard within 1-2 minutes

---

## Best Practices

### ✅ Do:

- Set up email/Slack alerts for critical errors
- Create releases in Sentry for each deployment
- Use breadcrumbs for debugging context
- Review and resolve issues regularly

### ❌ Don't:

- Leave Sentry enabled in development (unless testing)
- Send PII (personally identifiable information) - it's auto-masked
- Ignore high-frequency errors
- Capture expected errors (like validation failures)

---

## Costs

**Free Tier (Sufficient for soft launch):**

- 5,000 errors/month
- 10,000 performance units/month
- 50 replays/month
- 30-day data retention

**Paid Plans:**
Start at $26/month for more volume and features.

---

## Troubleshooting

### No errors showing in Sentry?

**Check:**

1. `NEXT_PUBLIC_SENTRY_DSN` is set in Vercel
2. DSN is correct (starts with `https://`)
3. App is running in production mode
4. Errors are actually occurring
5. Check Sentry project settings

### Source maps not working?

**Check:**

1. `SENTRY_AUTH_TOKEN` is set
2. `withSentryConfig` is wrapping next.config
3. Sentry CLI is installed (`@sentry/nextjs` includes it)

### Too many errors?

**Adjust sampling:**

```typescript
// In sentry.*.config.ts
tracesSampleRate: 0.05, // 5% instead of 10%
replaysSessionSampleRate: 0.01, // 1% instead of 10%
```

---

## Summary

✅ **Already Integrated** - No code changes needed  
✅ **Production Ready** - Only active when DSN is set  
✅ **Privacy First** - All user data masked by default  
✅ **Free Tier** - Good for thousands of errors/month

**Just add your DSN to Vercel and you're done!** 🎉

---

## Support

- **Sentry Docs**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Sentry Support**: support@sentry.io
- **Our Setup**: Error Boundaries in both apps, automatic capture enabled
