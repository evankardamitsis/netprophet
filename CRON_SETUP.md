# Automatic Match Automation Setup

## Overview

The match automation system now runs automatically every minute to handle:

- **Lock times**: Automatically locks matches 20 minutes before start time
- **Live status**: Changes matches to "live" when start time arrives
- **Greece timezone**: All calculations use Europe/Athens timezone

## Environment Variables Required

Add these to your Vercel environment variables:

```bash
# Already required for Supabase
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# New: Cron job security
CRON_SECRET=bf263fb79d36f65dcc410a20ec0067eb2787a00c40116f9393d11adf183490cf
```

## How It Works

1. **Automatic**: Vercel cron job calls `/api/cron/match-automation` every minute
2. **Manual Backup**: "Run Automation" button in admin interface
3. **Security**: API route validates `CRON_SECRET` header
4. **Database Function**: `process_match_automation()` handles the logic

## Files Created/Modified

- ✅ `apps/admin/src/app/api/cron/match-automation/route.ts` - API endpoint
- ✅ `vercel.json` - Cron job configuration
- ✅ `env.example` - Environment variables documentation
- ✅ `supabase/migrations/040_create_automation_function.sql` - Database function

## Deployment Steps

1. **Add Environment Variables** in Vercel dashboard:
   - `SUPABASE_SERVICE_ROLE_KEY` (if not already set)
   - `CRON_SECRET=bf263fb79d36f65dcc410a20ec0067eb2787a00c40116f9393d11adf183490cf`

2. **Deploy to Vercel**:

   ```bash
   git add .
   git commit -m "Add automatic match automation cron job"
   git push
   ```

3. **Verify Setup**:
   - Check Vercel dashboard for cron job status
   - Test manual button in admin interface
   - Monitor logs for automation execution

## Testing

1. Create a match with:
   - Start time: 5 minutes from now
   - Lock time: 3 minutes from now (20 minutes before start)

2. Wait for automation to run (every minute)

3. Check that:
   - Match shows "Locked" after lock time passes
   - Match shows "Live" after start time passes

## Manual Override

The "Run Automation" button in the admin interface provides manual control for:

- Immediate processing
- Testing purposes
- Emergency situations

## Monitoring

- Check Vercel function logs for cron job execution
- Monitor admin interface for "Should Lock" status
- Database function logs will show processed matches
