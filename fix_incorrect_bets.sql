-- Fix incorrectly resolved bets
-- This script will update bets that should have been won but were marked as lost

-- 1. First, let's see all the bets that need to be fixed
SELECT
    b.id as bet_id,
    b.match_id,
    b.user_id,
    b.prediction->>'winner' as predicted_winner,
    CONCAT(p.first_name, ' ', p.last_name) as actual_winner_name,
    b.outcome,
    b.status,
    b.bet_amount,
    b.winnings_paid
FROM bets b
    LEFT JOIN match_results mr ON b.match_id = mr.match_id
    LEFT JOIN players p ON mr.winner_id = p.id
WHERE b.status = 'lost'
    AND mr.winner_id IS NOT NULL
    AND b.prediction->>'winner' IS NOT NULL
    AND b.prediction->>'winner' = CONCAT(p.first_name, ' ', p.last_name);

-- 2. Update the incorrectly resolved bets
-- This will change their status from 'lost' to 'won' and update the outcome
UPDATE bets 
SET 
    status = 'won',
    outcome = 'won',
    winnings_paid = potential_winnings, -- Pay out the potential winnings
    updated_at = NOW()
WHERE id IN (
    SELECT b.id
FROM bets b
    LEFT JOIN match_results mr ON b.match_id = mr.match_id
    LEFT JOIN players p ON mr.winner_id = p.id
WHERE b.status = 'lost'
    AND mr.winner_id IS NOT NULL
    AND b.prediction->>'winner' IS NOT NULL
    AND b.prediction->>'winner' = CONCAT(p.first_name, ' ', p.last_name)
);

-- 3. Verify the fix by checking the updated bets
SELECT
    b.id as bet_id,
    b.match_id,
    b.user_id,
    b.prediction->>'winner' as predicted_winner,
    CONCAT(p.first_name, ' ', p.last_name) as actual_winner_name,
    b.outcome,
    b.status,
    b.bet_amount,
    b.winnings_paid,
    b.updated_at
FROM bets b
    LEFT JOIN match_results mr ON b.match_id = mr.match_id
    LEFT JOIN players p ON mr.winner_id = p.id
WHERE b.id IN (
    'eb9cc96d-46b4-4753-844f-5c80a8dac341' -- The specific bet we found
)
ORDER BY b.updated_at DESC;

-- 4. Count how many bets were fixed
SELECT
    COUNT(*) as bets_fixed
FROM bets b
    LEFT JOIN match_results mr ON b.match_id = mr.match_id
    LEFT JOIN players p ON mr.winner_id = p.id
WHERE b.status = 'won'
    AND mr.winner_id IS NOT NULL
    AND b.prediction->>'winner' IS NOT NULL
    AND b.prediction->>'winner' = CONCAT(p.first_name, ' ', p.last_name)
    AND b.updated_at >= NOW() - INTERVAL
'1 hour'; -- Bets updated in the last hour
