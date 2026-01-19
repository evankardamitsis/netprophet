-- IMMEDIATE FIX: Run this to fix the send_prediction_result_email function
-- This fixes the format() error that's preventing emails from being created

-- Step 1: Get the current function and fix the problematic line
DO $$
DECLARE
    func_source TEXT;
    fixed_source TEXT;
BEGIN
    -- Get the full function definition
    SELECT pg_get_functiondef(p.oid)
    INTO func_source
    FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'send_prediction_result_email'
        AND n.nspname = 'public'
    LIMIT 1;

IF func_source IS NULL THEN
        RAISE EXCEPTION 'Function send_prediction_result_email not found';
END
IF;
    
    -- Fix the problematic format() call
    -- Replace: format('€%.2f', winnings_amount / 100.0)
    -- With: format('%s coins', winnings_amount::TEXT)
    fixed_source := REPLACE
(
        func_source,
        'format(''€%.2f'', winnings_amount / 100.0)',
        'format(''%s coins'', winnings_amount::TEXT)'
    );
    
    -- Fix the ELSE clause
    fixed_source := REPLACE
(
        fixed_source,
        '''€0.00''',
        '''0 coins'''
    );
    
    -- Fix the comment
    fixed_source := REPLACE
(
        fixed_source,
        '-- Format winnings as currency (assuming cents, convert to euros)',
        '-- Format winnings as coins (winnings are in coins, not euros/cents)'
    );

-- Execute the fixed function
EXECUTE fixed_source;

RAISE NOTICE 'Function send_prediction_result_email has been fixed!';
END $$;

-- Step 2: Test the fix
SELECT send_prediction_result_email(
    '45fe0829-21dc-4159-aa34-bcd5939bee17'
::UUID,
    '57d0b788-7d76-4b4f-8cc4-618a750f014c'::UUID,
    'won',
    19
);

-- Step 3: Check if email was created
SELECT
    id,
    type,
    template,
    status,
    to_email,
    sent_at,
    error_message
FROM email_logs
WHERE type = 'user'
    AND template = 'prediction_result_won'
    AND variables->>'bet_id' = '57d0b788-7d76-4b4f-8cc4-618a750f014c'
ORDER BY sent_at DESC
LIMIT 1;
