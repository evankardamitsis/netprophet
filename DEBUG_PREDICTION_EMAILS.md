# Debug Prediction Result Emails

## Problem: No Emails Created

The `create_bet_notification` function was called 9 times, but no prediction result emails were created. This means `send_prediction_result_email` is likely failing silently.

## Step 1: Check for Errors in Function Execution

The function might be failing silently. Let's test it directly with one of the resolved bets:

```sql
-- First, get details of one resolved bet
SELECT 
    b.id as bet_id,
    b.user_id,
    b.status,
    b.match_id,
    p.email,
    p.preferred_language
FROM bets b
JOIN profiles p ON b.user_id = p.id
WHERE b.status = 'lost'
  AND b.resolved_at IS NOT NULL
LIMIT 1;

-- Then test the function directly (replace with actual values)
DO $$
DECLARE
    test_bet_id UUID := '64dcbc1c-1863-4a7e-bdca-6bc7f2f57260'; -- Use actual bet_id from above
    test_user_id UUID := '0fd82e0f-6144-4504-b580-b4a65a079d91'; -- Use actual user_id from above
    test_status TEXT := 'lost';
BEGIN
    BEGIN
        PERFORM send_prediction_result_email(
            test_user_id,
            test_bet_id,
            test_status,
            0
        );
        RAISE NOTICE 'Function executed successfully';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error: %', SQLERRM;
        RAISE NOTICE 'Error details: %', SQLSTATE;
    END;
END $$;
```

This will show any errors from the function.

## Step 2: Check If Email Templates Exist

The most likely issue is that email templates don't exist. Check:

```sql
-- Check if prediction result templates exist
SELECT 
    type,
    language,
    name,
    is_active,
    subject
FROM email_templates
WHERE type IN ('prediction_result_won', 'prediction_result_lost');
```

If no rows are returned, **you need to create the templates first**.

## Step 3: Check Function Logic

The `send_prediction_result_email` function might be failing because:

1. **No match result found** - The function requires a match_result to exist
2. **Templates don't exist** - Email will fail if templates don't exist
3. **User email not found** - Function returns early if user email is null

Let's check if match results exist for the resolved bets:

```sql
-- Check if match results exist for resolved bets
SELECT 
    b.id as bet_id,
    b.match_id,
    b.status,
    mr.id as match_result_id,
    mr.match_result,
    mr.winner_id
FROM bets b
LEFT JOIN match_results mr ON b.match_id = mr.match_id
WHERE b.status = 'lost'
  AND b.resolved_at IS NOT NULL
ORDER BY b.resolved_at DESC
LIMIT 10;
```

This shows if match results exist for the bets (required for emails).

## Step 4: Check Function Logs

Check PostgreSQL logs to see if there are any errors:

```sql
-- Enable logging and check recent errors
-- In Supabase Dashboard, go to Logs → Postgres Logs
-- Look for errors related to send_prediction_result_email or create_bet_notification
```

## Step 5: Simplified Test

Test with minimal data to isolate the issue:

```sql
-- Test 1: Check if match result exists
SELECT COUNT(*) 
FROM match_results mr
JOIN bets b ON mr.match_id = b.match_id
WHERE b.id = '64dcbc1c-1863-4a7e-bdca-6bc7f2f57260';

-- Test 2: Check if user email exists
SELECT email, preferred_language
FROM profiles
WHERE id = '0fd82e0f-6144-4504-b580-b4a65a079d91';

-- Test 3: Try creating email manually (if templates exist)
INSERT INTO email_logs (
    user_id,
    to_email,
    template,
    type,
    language,
    variables,
    status
) VALUES (
    '0fd82e0f-6144-4504-b580-b4a65a079d91',
    'kardamitsis.e@gmail.com',
    'prediction_result_lost',
    'user',
    'el',
    jsonb_build_object(
        'match_name', 'Test Match',
        'tournament_name', 'Test Tournament',
        'match_result', '2-0',
        'loss_reason', 'Test reason'
    ),
    'pending'
);
```

## Most Likely Issues

1. **Email templates don't exist** (95% likely)
   - Solution: Create `prediction_result_won` and `prediction_result_lost` templates

2. **Function returns early due to missing match result**
   - Check if match_results exist for the matches

3. **Function returns early due to missing user email**
   - Check if user emails exist in profiles

## Next Steps

1. Run the template check query - if templates don't exist, create them
2. Run the function test query to see the actual error
3. Check if match results exist for the bets
4. Once templates exist, the function should work
