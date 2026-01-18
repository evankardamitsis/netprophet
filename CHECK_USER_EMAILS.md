# Check Pending User Emails

## Step 1: Check Pending User Emails

Run this SQL query in **Supabase Dashboard** → **SQL Editor**:

```sql
-- Check pending user emails
SELECT 
    id,
    user_id,
    to_email,
    template,
    language,
    status,
    sent_at,
    error_message,
    variables->>'match_name' as match_name,
    variables->>'tournament_name' as tournament_name,
    variables->>'loss_reason' as loss_reason
FROM email_logs
WHERE type = 'user' 
  AND status = 'pending'
ORDER BY sent_at DESC;
```

This will show:
- Which user emails are pending
- What template they're using
- Match details
- Loss reasons (if applicable)

## Step 2: Check All User Email Status

```sql
-- Check all user email status breakdown
SELECT 
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM email_logs
WHERE type = 'user'
GROUP BY status
ORDER BY count DESC;
```

## Step 3: Verify Prediction Result Emails Were Created

After running the query to send emails for existing resolved bets, check if they were created:

```sql
-- Check if prediction result emails were created for existing resolved bets
SELECT 
    id,
    to_email,
    template,
    status,
    sent_at,
    error_message,
    variables->>'match_name' as match_name,
    variables->>'loss_reason' as loss_reason
FROM email_logs
WHERE type = 'user' 
  AND template IN ('prediction_result_won', 'prediction_result_lost')
ORDER BY sent_at DESC
LIMIT 20;
```

This should show newly created prediction result emails.

## Step 4: Check Failed User Emails

```sql
-- Check failed user emails and their errors
SELECT 
    id,
    to_email,
    template,
    language,
    status,
    error_message,
    sent_at
FROM email_logs
WHERE type = 'user' 
  AND status = 'failed'
ORDER BY sent_at DESC
LIMIT 20;
```

## Step 5: Check If Prediction Result Emails Are Being Created

```sql
-- Check if prediction result emails are being logged
SELECT 
    COUNT(*) as total_prediction_emails,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
FROM email_logs
WHERE type = 'user' 
  AND template IN ('prediction_result_won', 'prediction_result_lost');
```

## Step 5: Verify Webhook Configuration

Check if webhook is configured for user emails:

1. Go to **Supabase Dashboard** → **Database** → **Webhooks**
2. Look for a webhook on `email_logs` table with:
   - **Type**: Supabase Edge Function
   - **Edge Function**: `process-user-emails`
   - **Condition**: `status = 'pending' AND type = 'user'`
   - **Enabled**: ON

## Step 7: Manually Process Pending Emails

If there are pending emails, you can manually trigger the edge function:

```bash
curl -X POST "https://mgojbigzulgkjomgirrm.supabase.co/functions/v1/process-user-emails" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nb2piaWd6dWxna2pvbWdpcnJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjU3NzA0MSwiZXhwIjoyMDY4MTUzMDQxfQ.bJ4wKs-W_oaO59ejlnteUnEnbWOKmcTLMMXPoNKThBE" \
  -H "Content-Type: application/json" \
  -d '{}'
```

This will process all 7 pending emails.

## Step 7: Check If Prediction Result Emails Are Being Created When Bets Are Resolved

To verify if `send_prediction_result_email` is being called when bets are resolved:

```sql
-- Check recent bets that were resolved
SELECT 
    b.id as bet_id,
    b.user_id,
    b.status as bet_status,
    b.resolved_at,
    b.prediction,
    -- Check if email was created for this bet
    (SELECT COUNT(*) 
     FROM email_logs 
     WHERE type = 'user' 
       AND variables->>'bet_id' = b.id::TEXT) as email_count
FROM bets b
WHERE b.status IN ('won', 'lost')
  AND b.resolved_at IS NOT NULL
ORDER BY b.resolved_at DESC
LIMIT 10;
```

## Step 8: Test Creating a Prediction Result Email

To test if the function works, you can manually create a test email:

```sql
-- First, find a resolved bet to test with
SELECT 
    b.id,
    b.user_id,
    b.status,
    b.match_id,
    p.email as user_email,
    p.preferred_language
FROM bets b
JOIN profiles p ON b.user_id = p.id
WHERE b.status IN ('won', 'lost')
  AND b.resolved_at IS NOT NULL
LIMIT 1;

-- Then test the function (replace with actual values from above)
SELECT send_prediction_result_email(
    '[USER_ID]',  -- Replace with actual user_id
    '[BET_ID]',   -- Replace with actual bet_id
    'won',        -- or 'lost'
    100           -- winnings amount
);
```

## Common Issues

### Issue: No emails are being created
**Check**: 
- Is `send_prediction_result_email` being called when bets are resolved?
- Is `create_bet_notification` being called? (It should now also send emails)

### Issue: Emails are pending but not processing
**Check**:
- Webhook is configured correctly
- Webhook is enabled
- Edge function `process-user-emails` is deployed

### Issue: Emails are failing
**Check**:
- Email templates exist in `email_templates` table
- Templates have correct type: `prediction_result_won` or `prediction_result_lost`
- Templates are active (`is_active = true`)

## Next Steps

After running these queries:

1. **If there are pending emails**: Check webhook configuration and manually process them
2. **If no emails are being created**: Check if `create_bet_notification` is being called when bets are resolved
3. **If emails are failing**: Check error messages and verify email templates exist
