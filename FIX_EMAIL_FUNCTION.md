# Fix Email Function Issue

## Problem
The `send_prediction_result_email` function executes without errors but doesn't create emails. This suggests the function is silently failing somewhere.

## Potential Issues

### Issue 1: Missing NOT FOUND check for match_details

The function queries for match_details but doesn't check if it was found. This could cause a NULL reference error when accessing `match_details.match_type`.

**Fix**: Added NOT FOUND check (already added to migration)

### Issue 2: Function is wrapped in exception handler

The function is called inside `create_bet_notification` with an exception handler that catches all errors silently. We need to check PostgreSQL logs to see if there are errors.

## Check PostgreSQL Logs

1. Go to **Supabase Dashboard** → **Logs** → **Postgres Logs**
2. Filter for:
   - `send_prediction_result_email`
   - `create_bet_notification`
   - `Prediction result email logged`
   - `Error sending prediction result email`

Look for error messages that explain why emails aren't being created.

## Test the Function with Explicit Error Handling

Run this to see if there are any errors:

```sql
-- Test function with explicit error messages
DO $$
DECLARE
    test_bet_id UUID := '64dcbc1c-1863-4a7e-bdca-6bc7f2f57260';
    test_user_id UUID := '0fd82e0f-6144-4504-b580-b4a65a079d91';
    test_match_id UUID;
BEGIN
    -- Get match_id from bet
    SELECT match_id INTO test_match_id
    FROM bets
    WHERE id = test_bet_id;
    
    RAISE NOTICE 'Bet ID: %', test_bet_id;
    RAISE NOTICE 'User ID: %', test_user_id;
    RAISE NOTICE 'Match ID: %', test_match_id;
    
    BEGIN
        PERFORM send_prediction_result_email(
            test_user_id,
            test_bet_id,
            'lost',
            0
        );
        RAISE NOTICE 'Function executed successfully';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'ERROR in send_prediction_result_email: %', SQLERRM;
        RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
        RAISE NOTICE 'Error detail: %', SQLERRM;
    END;
    
    -- Check if email was created
    IF EXISTS (
        SELECT 1 
        FROM email_logs 
        WHERE type = 'user' 
          AND template IN ('prediction_result_won', 'prediction_result_lost')
          AND variables->>'bet_id' = test_bet_id::TEXT
    ) THEN
        RAISE NOTICE 'SUCCESS: Email was created!';
    ELSE
        RAISE NOTICE 'WARNING: Function executed but no email was created';
    END IF;
END $$;
```

## Check for Constraint Violations

The INSERT might be failing due to a constraint. Check:

```sql
-- Check email_logs table constraints
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'email_logs'::regclass;
```

## Next Steps

1. Run the test query above to see explicit errors
2. Check PostgreSQL logs for error messages
3. Redeploy the migration with the fix (NOT FOUND check added)
4. Test again with one bet
