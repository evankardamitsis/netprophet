-- Check if bet 934164b9-bff7-43d5-bb49-4201b1d128f2 should have been included
-- This bet was resolved at 08:06 (not corrected), but might need to be checked

-- Check all bets for Βασιλιάς that were recently won
SELECT 
    b.id,
    b.user_id,
    p.email,
    b.prediction->>'winner' as predicted_winner,
    b.prediction->>'matchResult' as predicted_result,
    b.status,
    b.potential_winnings,
    b.winnings_paid,
    b.resolved_at,
    b.updated_at,
    CASE 
        WHEN b.resolved_at = b.updated_at THEN 'Original resolution'
        WHEN b.updated_at > b.resolved_at THEN 'Was corrected'
        ELSE 'Unknown'
    END as resolution_type
FROM bets b
INNER JOIN profiles p ON b.user_id = p.id
WHERE p.email = '[USER_EMAIL]'  -- Replace with actual email for testing
  AND b.status = 'won'
  AND b.resolved_at >= '2026-01-18'::DATE
ORDER BY b.resolved_at DESC;

-- Check if bet 934164b9 was falsely resolved (only winner predicted, no score)
SELECT 
    b.id,
    b.user_id,
    b.prediction->>'winner' as predicted_winner,
    b.prediction->>'matchResult' as predicted_result,
    b.status,
    b.potential_winnings,
    b.winnings_paid,
    b.resolved_at,
    b.updated_at,
    mr.match_winner_team,
    mr.match_result as actual_result,
    -- Check if this bet should have been corrected
    CASE 
        WHEN (b.prediction->>'matchResult' IS NULL OR b.prediction->>'matchResult' = '' OR b.prediction->>'matchResult' = 'Not specified')
             AND b.prediction->>'winner' IS NOT NULL
             AND b.status = 'won' THEN 'Should be OK (already won)'
        WHEN (b.prediction->>'matchResult' IS NULL OR b.prediction->>'matchResult' = '' OR b.prediction->>'matchResult' = 'Not specified')
             AND b.prediction->>'winner' IS NOT NULL
             AND b.status = 'lost' THEN 'Should be corrected'
        ELSE 'Has score prediction or no winner'
    END as correction_status
FROM bets b
LEFT JOIN match_results mr ON b.match_id = mr.match_id
WHERE b.id = '934164b9-bff7-43d5-bb49-4201b1d128f2'::UUID;

-- Calculate total winnings for a user from all corrected bets
SELECT 
    p.email,
    COUNT(b.id) as total_won_bets,
    SUM(b.winnings_paid) as total_winnings,
    ARRAY_AGG(b.winnings_paid ORDER BY b.resolved_at) as individual_winnings,
    ARRAY_AGG(b.id ORDER BY b.resolved_at) as bet_ids
FROM bets b
INNER JOIN profiles p ON b.user_id = p.id
WHERE p.email = '[USER_EMAIL]'  -- Replace with actual email for testing
  AND b.status = 'won'
  AND b.resolved_at >= '2026-01-18'::DATE
GROUP BY p.email;
