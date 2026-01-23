# MailerLite Webhook Setup - Real-time Processing

This guide shows you how to set up a database webhook to automatically process MailerLite subscriptions in real-time.

## 🎯 Overview

When a new user registers or is synced, they're added to `mailerlite_logs` with status `pending`. The webhook will automatically trigger the `mailerlite-process-queue` Edge Function to process them immediately.

## 📋 Prerequisites

- ✅ Database migration applied
- ✅ Edge Functions deployed
- ✅ Environment variables set (`MAILERLITE_API_KEY`, `MAILERLITE_GROUP_ID`)
- ✅ `CRON_SECRET` set in Edge Function secrets (for webhook authentication)

## 🚀 Step-by-Step Setup

### Step 1: Set CRON_SECRET (Only if using HTTP Request webhook type)

**If you're using "Supabase Edge Function" webhook type (recommended):** Skip this step - authentication is handled automatically.

**If you're using "HTTP Request" webhook type:** You need to set `CRON_SECRET`:

1. Go to **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**
2. Add a new secret:
   - **Name:** `CRON_SECRET`
   - **Value:** Generate a secure random string (e.g., use `openssl rand -hex 32` or any secure random generator)
3. Click **Save**

**Note:** This secret is used to authenticate webhook requests to your Edge Function when using HTTP Request type.

### Step 2: Create Database Webhook

1. Go to **Supabase Dashboard**
2. Navigate to **Database** → **Webhooks** (or **Database** → **Webhooks** in the left sidebar)
3. Click **"Create a new webhook"** or **"New webhook"**

### Step 3: Configure Webhook Settings

Fill in the webhook configuration:

#### Basic Settings:
- **Name:** `mailerlite-process-queue-webhook` (or any descriptive name)
- **Table:** `mailerlite_logs`
- **Events:** Select **`INSERT`** (check the box)

#### Webhook Type:
Choose one of two options:

**Option A: Supabase Edge Function (Recommended - Simpler)**
- **Type:** Select **"Supabase Edge Function"** from the dropdown
- **Edge Function:** Select `mailerlite-process-queue` from the function list
- **Method:** `POST`
- **No authentication needed** - Supabase handles it automatically

**Option B: HTTP Request (If Edge Function option not available)**
- **Type:** Select **"HTTP Request"**
- **HTTP Request Method:** `POST`
- **HTTP Request URL:** 
  ```
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/mailerlite-process-queue
  ```
  Replace `YOUR_PROJECT_REF` with your actual Supabase project reference (found in your project URL).

- **HTTP Headers:** Add a header:
  - **Key:** `Authorization`
  - **Value:** `Bearer YOUR_CRON_SECRET`
  (Replace `YOUR_CRON_SECRET` with the value you set in Step 1)

#### Filter (Optional but Recommended):
- **Filter/Condition:** Add a condition to only trigger when `status = 'pending'`:
  ```sql
  status = 'pending'
  ```
  This ensures the webhook only fires for new pending subscriptions, not updates.

### Step 4: Save and Test

1. Click **"Save"** or **"Create webhook"**
2. The webhook is now active!

### Step 5: Test the Webhook

#### Option A: Test with a New User Registration
1. Register a new test user in your app
2. Check the `mailerlite_logs` table - should have a new entry with status `pending`
3. Within a few seconds, check again - status should change to `success` or `failed`
4. Check MailerLite dashboard - new subscriber should appear

#### Option B: Test Manually
Insert a test record:

```sql
INSERT INTO mailerlite_logs (email, status, name)
VALUES ('test@example.com', 'pending', 'Test User');
```

Then check:
1. Edge Function logs: **Supabase Dashboard** → **Edge Functions** → **mailerlite-process-queue** → **Logs**
2. `mailerlite_logs` table - status should update
3. MailerLite dashboard - subscriber should appear

## 🔍 Troubleshooting

### Webhook Not Triggering

1. **Check webhook is active:**
   - Go to **Database** → **Webhooks**
   - Verify the webhook shows as "Active" or "Enabled"

2. **Check Edge Function logs:**
   - Go to **Edge Functions** → **mailerlite-process-queue** → **Logs**
   - Look for incoming requests and any errors

3. **Verify CRON_SECRET:**
   - Make sure `CRON_SECRET` is set in Edge Function secrets
   - Make sure the webhook header matches exactly: `Bearer YOUR_CRON_SECRET`

4. **Check webhook URL:**
   - Verify the URL is correct: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/mailerlite-process-queue`
   - Make sure `YOUR_PROJECT_REF` matches your actual project reference

### Edge Function Returns 401 Unauthorized

- The `Authorization` header in the webhook must match: `Bearer YOUR_CRON_SECRET`
- Check that `CRON_SECRET` is set correctly in Edge Function secrets
- Make sure there are no extra spaces in the header value

### Subscriptions Not Processing

1. **Check `mailerlite_logs` table:**
   ```sql
   SELECT * FROM mailerlite_logs 
   WHERE status = 'pending' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

2. **Check for errors:**
   ```sql
   SELECT email, status, error_message, created_at
   FROM mailerlite_logs 
   WHERE status = 'failed'
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

3. **Check MailerLite API key:**
   - Verify `MAILERLITE_API_KEY` is set in Edge Function secrets
   - Check Edge Function logs for API errors

### Webhook Triggering Too Often

If the webhook is triggering on updates (not just inserts):
- Add a filter condition: `status = 'pending'`
- Or modify the webhook to only trigger on `INSERT` events (not `UPDATE`)

## 📊 Monitoring

### Check Webhook Activity

1. Go to **Database** → **Webhooks**
2. Click on your webhook
3. View webhook logs/activity (if available in your Supabase plan)

### Monitor Edge Function

```bash
# View logs via CLI
supabase functions logs mailerlite-process-queue

# Or in Dashboard:
# Edge Functions → mailerlite-process-queue → Logs
```

### Check Processing Status

```sql
-- Overall status
SELECT 
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM mailerlite_logs
GROUP BY status;

-- Recent activity
SELECT 
    email,
    status,
    error_message,
    created_at,
    processed_at,
    EXTRACT(EPOCH FROM (processed_at - created_at)) as processing_time_seconds
FROM mailerlite_logs
ORDER BY created_at DESC
LIMIT 20;
```

## ✅ Verification Checklist

- [ ] `CRON_SECRET` set in Edge Function secrets
- [ ] Webhook created in Supabase Dashboard
- [ ] Webhook configured for `mailerlite_logs` table
- [ ] Webhook triggers on `INSERT` events
- [ ] Filter condition set: `status = 'pending'` (optional but recommended)
- [ ] Webhook URL points to `mailerlite-process-queue` function
- [ ] Authorization header set correctly: `Bearer YOUR_CRON_SECRET`
- [ ] Tested with new user registration
- [ ] Verified subscribers appear in MailerLite dashboard

## 🎉 Success!

Once set up, your MailerLite integration will work automatically:

1. **New user registers** → Added to `mailerlite_logs` with status `pending`
2. **Webhook triggers** → Calls `mailerlite-process-queue` Edge Function
3. **Edge Function processes** → Adds subscriber to MailerLite
4. **MailerLite workflows trigger** → Welcome emails, onboarding sequences, etc.

No manual intervention needed! 🚀
