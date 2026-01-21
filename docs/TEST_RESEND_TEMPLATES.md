# Testing Resend Templates

Comprehensive guide to test all email templates after migration to Resend hosted templates.

## Prerequisites

- ✅ Templates created and published in Resend
- ✅ `RESEND_TEMPLATE_IDS` secret set in Supabase
- ✅ Edge Functions deployed (`process-user-emails`, `process-admin-notifications`)

## Test Methods

### Method 1: Manual SQL Insert (Quick Testing)

Insert test emails directly into `email_logs` with `status = 'pending'`. The Edge Functions will process them automatically.

### Method 2: Natural Triggers (Real-World Testing)

Trigger emails through actual app actions (signup, bet resolution, etc.)

---

## Test Cases

### 1. Welcome Email (User)

**Template:** `welcome_email_en`, `welcome_email_el`

#### SQL Test:
```sql
-- Get a test user ID (or use your own)
SELECT id, email FROM profiles LIMIT 1;

-- Insert test welcome email (English)
INSERT INTO email_logs (
    user_id,
    to_email,
    template,
    type,
    language,
    variables,
    status
)
VALUES (
    '<USER_ID_HERE>',  -- Replace with actual user ID
    '<YOUR_EMAIL>',    -- Replace with your email
    'welcome_email',
    'user',
    'en',
    jsonb_build_object(
        'user_name', 'Test User',
        'user_email', '<YOUR_EMAIL>',
        'user_id', '<USER_ID_HERE>',
        'welcome_bonus_coins', 100,
        'welcome_bonus_pass', 'Tournament Pass',
        'app_url', 'https://netprophetapp.com'
    ),
    'pending'
);

-- Insert test welcome email (Greek) - Ελληνική έκδοση
INSERT INTO email_logs (
    user_id,
    to_email,
    template,
    type,
    language,
    variables,
    status
)
VALUES (
    '<USER_ID_HERE>',
    '<YOUR_EMAIL>',
    'welcome_email',
    'user',
    'el',
    jsonb_build_object(
        'user_name', 'Δοκιμαστικός Χρήστης',
        'user_email', '<YOUR_EMAIL>',
        'user_id', '<USER_ID_HERE>',
        'welcome_bonus_coins', 100,
        'welcome_bonus_pass', 'Tournament Pass',
        'app_url', 'https://netprophetapp.com'
    ),
    'pending'
);
```

**Quick test - Greek version only:**
```sql
-- Replace <USER_ID> and <YOUR_EMAIL> with real values
INSERT INTO email_logs (user_id, to_email, template, type, language, variables, status)
VALUES (
    '<USER_ID>',
    '<YOUR_EMAIL>',
    'welcome_email',
    'user',
    'el',
    jsonb_build_object(
        'user_name', 'Δοκιμαστικός Χρήστης',
        'user_email', '<YOUR_EMAIL>',
        'user_id', '<USER_ID>',
        'welcome_bonus_coins', 100,
        'welcome_bonus_pass', 'Tournament Pass',
        'app_url', 'https://netprophetapp.com'
    ),
    'pending'
);
```

#### Natural Trigger:
- Create a new user account (signup flow)
- The `handle_new_user()` function will automatically trigger the welcome email

---

### 2. Prediction Result - Won (User)

**Template:** `prediction_result_won_en`, `prediction_result_won_el`

#### SQL Test:
```sql
INSERT INTO email_logs (
    user_id,
    to_email,
    template,
    type,
    language,
    variables,
    status
)
VALUES (
    '<USER_ID_HERE>',
    '<YOUR_EMAIL>',
    'prediction_result_won',
    'user',
    'en',
    jsonb_build_object(
        'user_name', 'Test User',
        'match_name', 'Djokovic vs Nadal - Australian Open Final',
        'predicted_winner', 'Djokovic',
        'predicted_result', '3-1',
        'actual_winner', 'Djokovic',
        'actual_result', '3-1',
        'match_result_details', 'Djokovic won 6-4, 4-6, 6-3, 6-4',
        'winnings', 50.00,
        'winnings_formatted', '$50.00',
        'bet_amount', 10.00
    ),
    'pending'
);
```

#### Natural Trigger:
- Resolve a bet with status `'won'`
- The `send_prediction_result_email()` function will trigger automatically

---

### 3. Prediction Result - Lost (User)

**Template:** `prediction_result_lost_en`, `prediction_result_lost_el`

#### SQL Test:
```sql
INSERT INTO email_logs (
    user_id,
    to_email,
    template,
    type,
    language,
    variables,
    status
)
VALUES (
    '<USER_ID_HERE>',
    '<YOUR_EMAIL>',
    'prediction_result_lost',
    'user',
    'en',
    jsonb_build_object(
        'user_name', 'Test User',
        'match_name', 'Djokovic vs Nadal - Australian Open Final',
        'predicted_winner', 'Djokovic',
        'predicted_result', '3-0',
        'actual_winner', 'Nadal',
        'actual_result', '3-2',
        'match_result_details', 'Nadal won 4-6, 6-3, 6-7, 7-5, 6-4',
        'loss_reason', 'Incorrect winner prediction'
    ),
    'pending'
);
```

---

### 4. Admin Alert (Admin)

**Template:** `admin_alert_en`

#### SQL Test:
```sql
-- Get an admin user ID
SELECT id, email FROM profiles WHERE is_admin = true LIMIT 1;

INSERT INTO email_logs (
    user_id,
    to_email,
    template,
    type,
    language,
    variables,
    status
)
VALUES (
    '<ADMIN_USER_ID_HERE>',
    '<ADMIN_EMAIL>',
    'admin_alert',
    'admin',
    'en',
    jsonb_build_object(
        'alert_type', 'New User Registration',
        'message', 'A new user has registered on NetProphet',
        'details', jsonb_build_object(
            'user_email', 'newuser@example.com',
            'user_id', '<USER_ID_HERE>',
            'registration_time', NOW()::text
        ),
        'timestamp', NOW()::text,
        'user_email', 'newuser@example.com',
        'user_name', 'New User',
        'notification_title', 'New User Registration',
        'notification_message', 'A new user has registered on NetProphet'
    ),
    'pending'
);
```

#### Natural Trigger:
- A new user signs up
- The `handle_new_user()` function triggers `send_admin_alert_email()`

---

### 5. Profile Creation Request (Admin)

**Template:** `profile_creation_request_en`

#### SQL Test:
```sql
INSERT INTO email_logs (
    user_id,
    to_email,
    template,
    type,
    language,
    variables,
    status
)
VALUES (
    '<ADMIN_USER_ID_HERE>',
    '<ADMIN_EMAIL>',
    'profile_creation_request',
    'admin',
    'en',
    jsonb_build_object(
        'user_email', 'user@example.com',
        'user_id', '<USER_ID_HERE>',
        'requested_first_name', 'John',
        'requested_last_name', 'Doe',
        'date_of_birth', '1990-01-15',
        'playing_hand', 'Right',
        'age', '34',
        'timestamp', NOW()::text
    ),
    'pending'
);
```

#### Natural Trigger:
- User submits a profile creation request
- The `send_profile_creation_request_admin_email()` function triggers

---

### 6. Profile Claim Confirmation (User)

**Template:** `profile_claim_confirmation_en`, `profile_claim_confirmation_el`

#### SQL Test:
```sql
INSERT INTO email_logs (
    user_id,
    to_email,
    template,
    type,
    language,
    variables,
    status
)
VALUES (
    '<USER_ID_HERE>',
    '<YOUR_EMAIL>',
    'profile_claim_confirmation',
    'user',
    'en',
    jsonb_build_object(
        'user_name', 'Test User',
        'user_email', '<YOUR_EMAIL>',
        'player_first_name', 'John',
        'player_last_name', 'Doe',
        'player_full_name', 'John Doe',
        'app_url', 'https://netprophetapp.com'
    ),
    'pending'
);
```

---

### 7. Profile Creation Confirmation (User)

**Template:** `profile_creation_confirmation_en`, `profile_creation_confirmation_el`

#### SQL Test:
```sql
INSERT INTO email_logs (
    user_id,
    to_email,
    template,
    type,
    language,
    variables,
    status
)
VALUES (
    '<USER_ID_HERE>',
    '<YOUR_EMAIL>',
    'profile_creation_confirmation',
    'user',
    'en',
    jsonb_build_object(
        'user_name', 'Test User',
        'user_email', '<YOUR_EMAIL>',
        'requested_first_name', 'John',
        'requested_last_name', 'Doe',
        'requested_full_name', 'John Doe',
        'app_url', 'https://netprophetapp.com'
    ),
    'pending'
);
```

---

### 8. Profile Activated (User)

**Template:** `profile_activated_en`, `profile_activated_el`

#### SQL Test:
```sql
INSERT INTO email_logs (
    user_id,
    to_email,
    template,
    type,
    language,
    variables,
    status
)
VALUES (
    '<USER_ID_HERE>',
    '<YOUR_EMAIL>',
    'profile_activated',
    'user',
    'en',
    jsonb_build_object(
        'user_name', 'Test User',
        'player_first_name', 'John',
        'player_last_name', 'Doe',
        'player_id', '<PLAYER_ID_HERE>',
        'language', 'en'
    ),
    'pending'
);
```

---

**Note:** Winnings notifications are included in `prediction_result_won` templates - there is no separate `winnings` template.

---

### 10. Promotional Email (User)

**Template:** `promotional_en`, `promotional_el`

#### SQL Test:
```sql
INSERT INTO email_logs (
    user_id,
    to_email,
    template,
    type,
    language,
    variables,
    status
)
VALUES (
    '<USER_ID_HERE>',
    '<YOUR_EMAIL>',
    'promotional',
    'user',
    'en',
    jsonb_build_object(
        'user_email', '<YOUR_EMAIL>'
    ),
    'pending'
);
```

---

## Check Results

### 1. Check Email Logs Status

```sql
-- Check recent email logs
SELECT 
    id,
    to_email,
    template,
    language,
    status,
    error_message,
    sent_at
FROM email_logs
ORDER BY sent_at DESC NULLS LAST, id DESC
LIMIT 20;
```

**Note:** The `email_logs` table uses `sent_at` (not `created_at`) for timestamps. Use `sent_at` or `id` for ordering.

**Expected:**
- `status` should be `'sent'` (not `'pending'` or `'failed'`)
- `error_message` should be `NULL` (if sent successfully)
- `sent_at` should have a timestamp (when email was processed)

### 2. Check Edge Function Logs

1. Go to **Supabase Dashboard** → **Edge Functions** → **Logs**
2. Select `process-user-emails` or `process-admin-notifications`
3. Look for:
   - ✅ `Email sent to <email> (template: <template_key>)`
   - ❌ `Resend template not configured: <template_key>`
   - ❌ `Failed to send email via Resend`

### 3. Check Resend Dashboard

1. Go to [Resend Dashboard → Emails](https://resend.com/emails)
2. You should see sent emails with:
   - ✅ Status: "Delivered"
   - ✅ Template ID matches your `RESEND_TEMPLATE_IDS`

### 4. Check Your Email Inbox

- Verify you received the email
- Check that variables are correctly replaced (e.g., `{{{USER_NAME}}}` shows actual name)
- Verify formatting looks correct

---

## Troubleshooting

### Error: "Resend template not configured: X_Y"

**Cause:** Template ID missing from `RESEND_TEMPLATE_IDS` or template not published

**Fix:**
1. Check Resend dashboard - is the template published?
2. Verify `RESEND_TEMPLATE_IDS` includes `"X_Y": "template-id"`
3. Redeploy Edge Function (secrets are cached)

### Error: "Template not found" or "Template ID invalid"

**Cause:** Template was deleted or ID changed

**Fix:**
1. Run sync script again: `npx tsx scripts/sync-email-templates-to-resend.ts`
2. Update `RESEND_TEMPLATE_IDS` with new IDs
3. Redeploy Edge Functions

### Status Stays "pending"

**Cause:** Edge Functions not processing emails

**Fix:**
1. Check Edge Function logs for errors
2. Verify webhook/cron is configured to trigger the functions
3. Manually trigger the function if needed

### Variables Not Replaced (showing `{{{VAR}}}`)

**Cause:** Variable name mismatch or not defined in template

**Fix:**
1. Check Resend template - are variables defined?
2. Verify variable names match (uppercase in template: `{{{USER_NAME}}}`)
3. Check that variables in `email_logs.variables` match template variable names

---

## Quick Test Script

Run this to test all templates at once (replace placeholders):

```sql
-- Set your test values
\set user_id '<USER_ID_HERE>'
\set admin_id '<ADMIN_USER_ID_HERE>'
\set test_email '<YOUR_EMAIL>'

-- Test welcome email
INSERT INTO email_logs (user_id, to_email, template, type, language, variables, status)
VALUES (
    :user_id, :test_email, 'welcome_email', 'user', 'en',
    jsonb_build_object('user_name','Test','welcome_bonus_coins',100,'welcome_bonus_pass','Pass','app_url','https://netprophetapp.com'),
    'pending'
);

-- Test prediction won
INSERT INTO email_logs (user_id, to_email, template, type, language, variables, status)
VALUES (
    :user_id, :test_email, 'prediction_result_won', 'user', 'en',
    jsonb_build_object('user_name','Test','match_name','Test Match','winnings_formatted','$10'),
    'pending'
);

-- Test admin alert
INSERT INTO email_logs (user_id, to_email, template, type, language, variables, status)
VALUES (
    :admin_id, :test_email, 'admin_alert', 'admin', 'en',
    jsonb_build_object('alert_type','Test','message','Test message','timestamp',NOW()::text),
    'pending'
);
```

---

## Success Criteria

✅ All emails show `status = 'sent'` in `email_logs`  
✅ No errors in Edge Function logs  
✅ Emails appear in Resend dashboard as "Delivered"  
✅ Variables are correctly replaced in received emails  
✅ All templates tested (welcome, prediction results, admin alerts, profile confirmations)

---

**Next:** Once all tests pass, you can deprecate the `email_templates` table (optional).
