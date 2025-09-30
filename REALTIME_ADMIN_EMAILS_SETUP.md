# Real-Time Admin Email Notifications Setup

This guide explains how to set up real-time admin email notifications using Supabase Database Webhooks.

## Overview

The system sends instant email notifications to admins when:

1. A new user registers
2. A user claims a player profile

## Architecture

```
New User/Claim → Database Trigger → send_admin_alert_email() →
  → Inserts to email_logs → Database Webhook →
    → Calls /api/admin/process-emails → Sends Email via send-email function
```

**Fallback**: Cron job runs every 1 minute to catch any missed emails.

## Setup Steps

### 1. Set Environment Variables

Add to your Vercel Admin App environment variables:

```env
# Email Webhook Secret (generate a random string)
EMAIL_WEBHOOK_SECRET=your_secure_random_string_here

# Cron Secret (should already exist)
CRON_SECRET=your_cron_secret_here

# Supabase (should already exist)
NEXT_PUBLIC_SUPABASE_URL=https://mgojbigzulgkjomgirrm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Configure Database Webhook in Supabase Dashboard

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Database** → **Webhooks**
3. Click **Create a new hook** (or **Enable Webhooks** if first time)
4. Configure the webhook:

   **Basic Settings:**
   - **Name**: `process-admin-emails-webhook`
   - **Table**: `email_logs`
   - **Events**: ✅ INSERT (check only INSERT)

   **HTTP Request:**
   - **Type**: HTTP Request
   - **Method**: POST
   - **URL**: `https://admin.netprophetapp.com/api/admin/process-emails`

   **HTTP Headers:**

   ```
   x-webhook-secret: your_secure_random_string_here
   Content-Type: application/json
   ```

   Use the same `WEBHOOK_SECRET` value you set in environment variables

   **Conditions (Filters):**
   Enable conditions and add these filters:

   ```sql
   record.template = 'admin_alert'
   AND record.type = 'admin'
   AND record.status = 'pending'
   ```

5. Click **Create webhook**

### 3. Deploy Migrations

The migrations have already been applied:

- ✅ `20250930000001_fix_admin_email_notifications.sql`
- ✅ `20250930000002_ensure_handle_new_user_sends_admin_email.sql`
- ✅ `20250930000003_fix_send_admin_alert_email_sent_at.sql`

### 4. Test the System

#### Test User Registration:

1. Register a new user on your app
2. Check Supabase **Database** → **email_logs** table
3. You should see a new row with:
   - `template: 'admin_alert'`
   - `type: 'admin'`
   - `status: 'pending'` (initially)
   - `status: 'sent'` (after webhook triggers)
4. Admin should receive email within **2-5 seconds**!

#### Test Profile Claim:

1. Have a user claim a player profile
2. Check `email_logs` table
3. Admin should receive email within **2-5 seconds**!

### 5. Monitor and Debug

#### Check Webhook Logs:

- Supabase Dashboard → Database → Webhooks → Click on your webhook
- View recent requests and responses
- Check for any errors

#### Check Email Logs:

```sql
SELECT * FROM email_logs
WHERE template = 'admin_alert'
ORDER BY sent_at DESC
LIMIT 10;
```

#### Check Function Logs:

- Vercel Dashboard → Your Admin Project → Logs
- Filter for `/api/admin/process-emails`

## How It Works

### User Registration Flow:

1. User signs up → `on_auth_user_created` trigger fires
2. `handle_new_user()` function runs
3. Calls `send_admin_alert_email()`
4. Inserts into `email_logs` with `status: 'pending'`
5. **Webhook fires immediately** (< 1 second)
6. Calls `/api/admin/process-emails`
7. Endpoint sends email via `send-email` function
8. Updates `status: 'sent'`

### Profile Claim Flow:

1. User claims player → `admin_profile_claim_email_trigger` fires
2. `trigger_admin_profile_claim_email()` function runs
3. Calls `send_admin_alert_email()`
4. Same webhook flow as above

### Backup System:

- Cron job runs every 1 minute
- Processes any emails that webhook might have missed
- Ensures reliability

## Troubleshooting

### Emails not arriving?

1. **Check webhook is enabled**: Supabase Dashboard → Webhooks
2. **Check webhook logs**: Look for errors in webhook execution
3. **Check email_logs**: `SELECT * FROM email_logs WHERE status = 'failed'`
4. **Check admin users exist**: `SELECT * FROM profiles WHERE is_admin = true`
5. **Verify environment variables**: Check Vercel settings
6. **Check Vercel logs**: Look for endpoint errors

### Webhook not triggering?

1. Verify filters are correct
2. Check webhook is enabled
3. Try manual trigger from Supabase Dashboard
4. Check endpoint is accessible (not blocked by firewall)

## Performance

- **Webhook latency**: 1-3 seconds
- **Cron fallback**: 60 seconds maximum
- **Email delivery**: 2-5 seconds (via Resend)
- **Total time**: **< 10 seconds** for admin to receive email! 🚀

## Security

- Endpoint protected by `WEBHOOK_SECRET`
- Only accessible via webhook or cron
- Service role key required for database operations
- All traffic over HTTPS
