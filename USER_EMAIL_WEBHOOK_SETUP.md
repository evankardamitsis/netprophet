# User Email Webhook Setup Guide

This guide explains how to set up the automatic welcome email system using Supabase Database Webhooks.

## 🎯 Overview

When a new user registers:

1. `handle_new_user` trigger creates profile and logs welcome email to `email_logs` table (status = 'pending')
2. Database webhook fires immediately
3. `process-user-emails` edge function is called
4. Email is sent via Resend
5. Status updated to 'sent' in `email_logs`

## 📋 Prerequisites

- ✅ Resend API key configured (`RESEND_API_KEY`)
- ✅ `email_logs` table exists
- ✅ `email_templates` table has welcome email templates (EN & EL)
- ✅ `process-user-emails` edge function deployed

## 🚀 Setup Steps

### 1. Deploy the Edge Function

```bash
cd /Users/VKardamitsis/Projects/netprophet
supabase functions deploy process-user-emails
```

### 2. Apply Database Migrations

```bash
supabase db push
```

This will:

- Add Greek welcome email template
- Update `send_welcome_email_to_user` function to detect user language

### 3. Create Database Webhook in Supabase Dashboard

1. Go to **Database** → **Webhooks** in your Supabase Dashboard
2. Click **Create a new hook**
3. Configure as follows:

**Webhook Configuration:**

```
Name: process-user-emails
Table: email_logs
Events: INSERT
Type: Supabase Edge Function (NOT HTTP Request)

Edge Function: process-user-emails
Method: POST

Conditions (SQL):
  status = 'pending' AND type = 'user'
```

**Important:**

- Select **"Supabase Edge Function"** from the dropdown (NOT "HTTP Request")
- Choose `process-user-emails` from the function dropdown
- No need to add Authorization headers (handled automatically)
- More efficient than HTTP Request method

4. Click **Create hook**

### 4. Test the Webhook

Create a test user registration:

```sql
-- This will trigger the webhook
SELECT send_welcome_email_to_user(
    'test@example.com',
    'a0b1c2d3-e4f5-6789-0123-456789abcdef'::uuid,
    'Test User'
);
```

Check the logs:

```sql
-- View email logs
SELECT * FROM email_logs
WHERE to_email = 'test@example.com'
ORDER BY created_at DESC
LIMIT 1;
```

## 📧 Email Templates

### English Template

- **Type**: `welcome_email`
- **Language**: `en`
- **Subject**: 🎾 Welcome to NetProphet - Your Tennis Prediction Journey Begins!

### Greek Template

- **Type**: `welcome_email`
- **Language**: `el`
- **Subject**: 🎾 Καλώς ήρθες στο NetProphet - Το Ταξίδι των Προβλέψεων σου Ξεκινά!

Both templates include:

- 🎁 100 Coins welcome bonus
- 🏆 1 Tournament Pass
- 🎾 Feature highlights
- Call-to-action button

## 🔧 How It Works

### 1. User Registration Flow

```
User Signs Up
    ↓
handle_new_user() trigger
    ↓
send_welcome_email_to_user() function
    ↓
INSERT into email_logs (status='pending')
    ↓
Database Webhook fires
    ↓
process-user-emails edge function
    ↓
Email sent via Resend
    ↓
Status updated to 'sent'
```

### 2. Edge Function Features

The `process-user-emails` function:

- ✅ **Webhook mode**: Processes single email from webhook payload
- ✅ **Manual mode**: Can process all pending emails if called without payload
- ✅ **Template rendering**: Replaces variables with user data
- ✅ **Error handling**: Marks failed emails with error message
- ✅ **Resend integration**: Sends via Resend API

### 3. Language Detection

The system automatically detects user language:

1. Checks `profiles.preferred_language`
2. Falls back to `'en'` if not set
3. Sends email in user's preferred language

## 🛠️ Manual Trigger (Debugging)

If you need to manually process pending emails:

```bash
curl -X POST "https://[YOUR-PROJECT-ID].supabase.co/functions/v1/process-user-emails" \
  -H "Authorization: Bearer [YOUR-SERVICE-ROLE-KEY]" \
  -H "Content-Type: application/json" \
  -d '{}'
```

This will process all pending user emails.

## 📊 Monitoring

### Check Email Status

```sql
-- View all user emails
SELECT
    to_email,
    template,
    language,
    status,
    created_at,
    sent_at,
    error_message
FROM email_logs
WHERE type = 'user'
ORDER BY created_at DESC
LIMIT 20;
```

### Success Rate

```sql
-- Email success rate
SELECT
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM email_logs
WHERE type = 'user'
GROUP BY status;
```

### Recent Failures

```sql
-- View failed emails
SELECT
    to_email,
    template,
    error_message,
    created_at
FROM email_logs
WHERE type = 'user' AND status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

## 🔒 Security

- ✅ Service role key used for webhook authentication
- ✅ Edge function validates email type and status
- ✅ Templates stored in database (not in code)
- ✅ Email logs track all attempts
- ✅ Failed emails don't block user registration

## 🐛 Troubleshooting

### Emails Not Sending

1. **Check webhook is active**:
   - Go to Database → Webhooks
   - Ensure webhook is enabled

2. **Check edge function logs**:

   ```bash
   supabase functions logs process-user-emails
   ```

3. **Check email_logs table**:

   ```sql
   SELECT * FROM email_logs WHERE status = 'failed';
   ```

4. **Verify Resend API key**:
   ```bash
   supabase secrets list
   ```

### Template Not Found

1. **Verify templates exist**:

   ```sql
   SELECT type, language, name FROM email_templates
   WHERE type = 'welcome_email' AND is_active = true;
   ```

2. **Check language match**:
   - Email log language must match template language
   - Default language is 'en'

### Webhook Not Triggering

1. **Check webhook condition**:
   - Condition: `status = 'pending' AND type = 'user'`
2. **Test manually**:

   ```sql
   SELECT send_welcome_email_to_user(
       'test@example.com',
       gen_random_uuid(),
       'Test User'
   );
   ```

3. **Check webhook payload**:
   - Webhook sends `{ "record": {...}, "type": "INSERT" }`
   - Edge function expects `payload.record`

## 📈 Next Steps

After welcome emails are working:

1. **Add more email types**:
   - Win notification emails
   - Daily reward reminder emails
   - Tournament invitation emails
   - Leaderboard achievement emails

2. **A/B Testing**:
   - Create multiple template versions
   - Track open rates and conversions

3. **Analytics**:
   - Track email open rates (Resend provides this)
   - Monitor conversion from email to first bet

## ✅ Checklist

Before going live:

- [ ] Edge function deployed
- [ ] Migrations applied
- [ ] Webhook created in dashboard
- [ ] Test email sent successfully
- [ ] Both EN and EL templates verified
- [ ] Error handling tested
- [ ] Monitoring queries saved

Your welcome email system is now ready! 🎉
