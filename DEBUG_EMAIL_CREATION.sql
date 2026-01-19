-- Debug: Check why emails aren't being created
-- Run these queries to diagnose the issue

-- 1. Check if create_bet_notification function exists and works
SELECT
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name = 'create_bet_notification';

-- 2. Test creating an email for one bet manually
SELECT create_bet_notification(
    b.user_id,
    b.id,
    b.status,
    COALESCE(b.winnings_paid, 0),
    COALESCE(p.preferred_language, 'en')
) as result
FROM bets b
    INNER JOIN profiles p ON b.user_id = p.id
WHERE b.id = '57d0b788-7d76-4b4f-8cc4-618a750f014c'
::UUID;

-- 3. Check if email was created after step 2
SELECT
    id,
    type,
    template,
    status,
    to_email,
    sent_at,
    variables->>'bet_id' as bet_id
FROM email_logs
WHERE type = 'user'
    AND template = 'prediction_result_won'
    AND variables->>'bet_id' = '57d0b788-7d76-4b4f-8cc4-618a750f014c'
ORDER BY sent_at DESC
LIMIT 1;

-- 4. Check bet details to ensure they're valid
SELECT 
    b.id,
    b.user_id,
    b
.status,
    b.winnings_paid,
    b.prediction,
    p.email,
    p.preferred_language
FROM bets b
INNER JOIN profiles p ON b.user_id = p.id
WHERE b.id IN
(
    'd2d4a1a0-53f5-441a-84e2-b166106a297c',
    '93564588-90ef-43cb-8287-44aaf80f7a44',
    '06065200-e051-47bd-803e-751f31a99de3',
    '4927424a-fdff-4091-9150-cb54467ec84f',
    '57d0b788-7d76-4b4f-8cc4-618a750f014c',
    'ea27d445-0b68-497f-8dee-98d9bc08515b',
    '6779d180-4b89-4d8b-9e8e-1ddc266c8dd4'
)
ORDER BY b.id;

-- 5. Check if send_prediction_result_email function exists
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name = 'send_prediction_result_email';
