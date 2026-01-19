-- Debug why emails aren't being created
-- Run these queries step by step

-- 1. Check if the bet exists and has correct data
SELECT 
    b.id,
    b.user_id,
    b.status,
    b.winnings_paid,
    b.prediction,
    b.match_id,
    p.email,
    p.preferred_language,
    mr.id as match_result_id,
    mr.match_result,
    mr.winner_id,
    mr.match_winner_team
FROM bets b
INNER JOIN profiles p ON b.user_id = p.id
LEFT JOIN match_results mr ON b.match_id = mr.match_id
WHERE b.id = '57d0b788-7d76-4b4f-8cc4-618a750f014c'::UUID;

-- 2. Test send_prediction_result_email directly
SELECT send_prediction_result_email(
    '45fe0829-21dc-4159-aa34-bcd5939bee17'::UUID,  -- george_desipris user_id
    '57d0b788-7d76-4b4f-8cc4-618a750f014c'::UUID,  -- bet_id
    'won',
    19  -- winnings_paid
);

-- 3. Check if email was created after step 2
SELECT 
    id,
    type,
    template,
    status,
    to_email,
    sent_at,
    error_message,
    variables
FROM email_logs
WHERE type = 'user'
  AND template = 'prediction_result_won'
  AND variables->>'bet_id' = '57d0b788-7d76-4b4f-8cc4-618a750f014c'
ORDER BY sent_at DESC
LIMIT 1;

-- 4. Check if email templates exist
SELECT 
    type,
    language,
    version,
    is_active,
    subject
FROM email_templates
WHERE type IN ('prediction_result_won', 'prediction_result_lost')
  AND language IN ('en', 'el')
ORDER BY type, language;

-- 5. Check PostgreSQL logs for errors (if accessible)
-- This might not work depending on permissions, but worth trying
-- SELECT * FROM pg_stat_statements WHERE query LIKE '%send_prediction_result_email%' LIMIT 10;

-- 6. Try creating email with explicit error handling
DO $$
DECLARE
    result TEXT;
    bet_record RECORD;
    user_record RECORD;
BEGIN
    -- Get bet and user info
    SELECT b.*, p.email, p.preferred_language
    INTO bet_record
    FROM bets b
    INNER JOIN profiles p ON b.user_id = p.id
    WHERE b.id = '57d0b788-7d76-4b4f-8cc4-618a750f014c'::UUID;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'Bet not found';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Bet found: %, User: %, Status: %, Winnings: %', 
        bet_record.id, bet_record.email, bet_record.status, bet_record.winnings_paid;
    
    -- Try to create notification
    BEGIN
        result := create_bet_notification(
            bet_record.user_id,
            bet_record.id,
            bet_record.status,
            COALESCE(bet_record.winnings_paid, 0),
            COALESCE(bet_record.preferred_language, 'en')
        );
        RAISE NOTICE 'create_bet_notification returned: %', result;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error in create_bet_notification: %', SQLERRM;
    END;
    
    -- Check if email was created
    IF EXISTS (
        SELECT 1 FROM email_logs 
        WHERE type = 'user' 
          AND template = 'prediction_result_won'
          AND variables->>'bet_id' = bet_record.id::TEXT
    ) THEN
        RAISE NOTICE 'Email was created successfully';
    ELSE
        RAISE NOTICE 'Email was NOT created';
    END IF;
END $$;
