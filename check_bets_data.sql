-- Check current state of bets table
SELECT
    COUNT(*) as total_bets,
    COUNT(match_id) as bets_with_match_id,
    COUNT(*) - COUNT(match_id) as bets_without_match_id
FROM public.bets;

-- Show sample of bets without match_id
SELECT id, user_id, match_id, created_at, status
FROM public.bets
WHERE match_id IS NULL
LIMIT 5;
