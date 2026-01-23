# MailerLite Newsletter Setup - Complete Guide

This guide walks you through setting up MailerLite for newsletters and syncing all users.

## 🎯 Overview

MailerLite is used for **marketing/newsletter emails only**. Transactional emails (welcome, prediction results, admin alerts) continue to use Resend.

## 📋 Prerequisites

1. **MailerLite Account**
   - Sign up at [mailerlite.com](https://www.mailerlite.com)
   - Free tier supports up to 1,000 subscribers

2. **MailerLite API Key**
   - Go to **Integrations** → **Developers** → **API**
   - Click **Generate new token**
   - Name it "NetProphet Production"
   - Copy the API token (starts with `ML_`)

3. **Create Default Group in MailerLite**
   - Go to **Subscribers** → **Groups**
   - Create a group called "Users" (or use existing)
   - Note the Group ID (found in URL or group settings)

## 🚀 Setup Steps

### Step 1: Apply Database Migration

```bash
# Apply the migration to create mailerlite_logs table
supabase db push
```

Or manually run the migration:
```sql
-- The migration file: supabase/migrations/20251224000000_create_mailerlite_integration.sql
```

### Step 2: Set Environment Variables in Supabase

1. Go to **Supabase Dashboard** → **Project Settings** → **Edge Functions**
2. Scroll to **Environment Variables**
3. Add:
   - `MAILERLITE_API_KEY` = `ML_your_api_token_here`
   - `MAILERLITE_GROUP_ID` = `your_group_id_here` (optional, but recommended)

### Step 3: Deploy Edge Functions

```bash
# Deploy MailerLite functions
supabase functions deploy mailerlite-subscribe
supabase functions deploy mailerlite-process-queue
```

### Step 4: Sync Existing Users

Run the sync script to queue all existing users:

```bash
# Make sure you have .env.local with:
# NEXT_PUBLIC_SUPABASE_URL=your_url
# SUPABASE_SERVICE_ROLE_KEY=your_service_key

tsx scripts/sync-users-to-mailerlite.ts
```

This will:
- Fetch all users from the `profiles` table
- Queue them in `mailerlite_logs` with status `pending`
- Skip users already queued or synced

### Step 5: Process the Queue

The `mailerlite-process-queue` Edge Function will automatically process pending subscriptions. You can:

**Option A: Trigger manually (recommended for initial sync)**
```bash
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/mailerlite-process-queue \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

**Option B: Set up a cron job** (for ongoing processing)
- Go to **Supabase Dashboard** → **Database** → **Cron Jobs**
- Create a cron that calls `mailerlite-process-queue` every 5 minutes

**Option C: Use Supabase Database Webhook** (for real-time processing)
- Go to **Database** → **Webhooks**
- Create webhook:
  - Table: `mailerlite_logs`
  - Event: `INSERT`
  - Condition: `status = 'pending'`
  - Type: Supabase Edge Function
  - Function: `mailerlite-process-queue`

### Step 6: Verify Setup

1. **Check MailerLite Dashboard**
   - Go to **Subscribers**
   - You should see all synced users

2. **Check Database**
   ```sql
   SELECT status, COUNT(*) 
   FROM mailerlite_logs 
   GROUP BY status;
   ```
   - Should show `success` for synced users
   - `pending` means still queued
   - `failed` means errors (check `error_message`)

3. **Test New User Registration**
   - Register a new test user
   - Check `mailerlite_logs` table - should have new entry
   - Check MailerLite dashboard - new subscriber should appear

## 🔄 How It Works

### For New Users

1. User registers → `handle_new_user()` trigger fires
2. Trigger calls `add_user_to_mailerlite()` function
3. Function inserts into `mailerlite_logs` with status `pending`
4. `mailerlite-process-queue` Edge Function processes the queue
5. Subscriber is added to MailerLite
6. MailerLite workflows (welcome emails, etc.) trigger automatically

### For Existing Users

1. Run `sync-users-to-mailerlite.ts` script
2. Script queues all users in `mailerlite_logs`
3. `mailerlite-process-queue` processes them in batches
4. All users are synced to MailerLite

## 📊 Monitoring

### Check Sync Status

```sql
-- Overall status
SELECT 
    status,
    COUNT(*) as count,
    COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM mailerlite_logs
GROUP BY status;

-- Recent failures
SELECT email, error_message, created_at
FROM mailerlite_logs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;

-- Pending queue
SELECT COUNT(*) as pending_count
FROM mailerlite_logs
WHERE status = 'pending';
```

### Check Edge Function Logs

```bash
supabase functions logs mailerlite-process-queue
supabase functions logs mailerlite-subscribe
```

## 🎨 Setting Up Workflows in MailerLite

After users are synced, set up automated workflows:

### Welcome Email Sequence

1. Go to **Automations** → **Create Automation**
2. Trigger: **"When subscriber joins group"**
3. Select your "Users" group
4. Create welcome email with:
   - Welcome message
   - Getting started guide
   - Welcome bonus information

### Newsletter Campaigns

1. Go to **Campaigns** → **Create Campaign**
2. Select your "Users" group
3. Design newsletter with:
   - Featured matches
   - Tournament updates
   - Special offers

## 🔧 Troubleshooting

### Issue: Users not being added

**Check:**
1. `MAILERLITE_API_KEY` is set correctly
2. API key has proper permissions
3. Edge Function logs for errors
4. `mailerlite_logs` table for failed entries

**Solution:**
```sql
-- Retry failed entries
UPDATE mailerlite_logs
SET status = 'pending', error_message = NULL, updated_at = NOW()
WHERE status = 'failed'
LIMIT 50;
```

### Issue: Rate limiting

MailerLite allows 120 requests/minute. The queue processor limits to 50 per run.

**Solution:**
- Process queue more frequently (every 1-2 minutes)
- Or increase batch size in `mailerlite-process-queue` (currently 50)

### Issue: Duplicate subscribers

MailerLite API automatically handles duplicates (upserts). No action needed.

## ✅ Verification Checklist

- [ ] Migration applied (`mailerlite_logs` table exists)
- [ ] Environment variables set in Supabase
- [ ] Edge Functions deployed
- [ ] Sync script run for existing users
- [ ] Queue processor running (cron or webhook)
- [ ] Users appearing in MailerLite dashboard
- [ ] New user registration tested
- [ ] Workflows set up in MailerLite

## 📝 Next Steps

1. **Set up welcome email workflow** in MailerLite
2. **Create newsletter templates** for campaigns
3. **Set up segmentation** (active users, tournament participants)
4. **Monitor engagement** metrics in MailerLite dashboard
5. **Schedule regular newsletters** (weekly/monthly)

Your MailerLite integration is now complete! 🎉
