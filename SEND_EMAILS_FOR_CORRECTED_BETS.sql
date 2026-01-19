-- Send emails for corrected bets that don't have emails yet
-- Run this query to create email notifications for the 7 corrected bets

-- Step 1: Create email notifications for corrected bets
SELECT create_bet_notification(
    b.user_id,
    b.id,
    b.status,
    COALESCE(b.winnings_paid, 0),
    COALESCE(p.preferred_language, 'en')
)
FROM bets b
  INNER JOIN profiles p ON b.user_id = p.id
WHERE b.status = 'won'
  AND b.updated_at > NOW() - INTERVAL
'2 hours'  -- Recently corrected (within last 2 hours)
  AND NOT EXISTS
(
      SELECT 1
FROM email_logs
WHERE type = 'user'
  AND template IN ('prediction_result_won', 'prediction_result_lost')
  AND variables->>'bet_id' = b.id::TEXT
  )
ORDER BY b.updated_at DESC;

-- Step 2: Verify emails were created
SELECT
  b.id as bet_id,
  b.status,
  el.id as email_log_id,
  el.template,
  el.status as email_status,
  el.to_email,
  el.sent_at
FROM bets b
  LEFT JOIN email_logs el ON (
    el.type = 'user'
    AND el.template = 'prediction_result_won'
    AND el.variables->>'bet_id' = b.id::TEXT
)
WHERE b.status = 'won'
  AND b.updated_at > NOW() - INTERVAL
'2 hours'
ORDER BY b.updated_at DESC;

-- Step 3: After running the above, process the emails using:
-- curl -X POST "https://mgojbigzulgkjomgirrm.supabase.co/functions/v1/process-user-emails" \
--   -H "Authorization: Bearer [YOUR_TOKEN]" \
--   -H "Content-Type: application/json" \
--   -d '{}'
