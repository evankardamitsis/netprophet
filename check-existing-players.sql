-- Check which players already exist in the database
SELECT 
    id,
    first_name,
    last_name,
    ntrp_rating,
    wins,
    losses,
    is_hidden,
    is_active,
    is_demo_player,
    claimed_by_user_id IS NOT NULL as is_claimed
FROM players
ORDER BY first_name, last_name;
