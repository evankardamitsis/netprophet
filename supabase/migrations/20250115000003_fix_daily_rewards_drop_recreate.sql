-- Fix daily rewards amount to 30 coins by dropping and recreating the function
-- This ensures we have the correct function signature

-- Drop the existing function first
DROP FUNCTION IF EXISTS can_claim_daily_reward
(UUID);

-- Recreate the function with the correct signature and 30 coin reward
CREATE OR REPLACE FUNCTION can_claim_daily_reward
(user_uuid UUID)
RETURNS TABLE
(
    can_claim BOOLEAN,
    current_streak INTEGER,
    next_reward_amount INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH
        user_streak
        AS
        (
            SELECT
                COALESCE(MAX(streak_count), 0) as current_streak
            FROM daily_rewards
            WHERE user_id = user_uuid
        ),
        last_claim
        AS
        (
            SELECT claimed_date
            FROM daily_rewards
            WHERE user_id = user_uuid
            ORDER BY claimed_date DESC 
        LIMIT 1
    ),
    can_claim_today
        
         AS
    (
        SELECT
        CASE 
                WHEN lc.claimed_date IS NULL THEN true
                WHEN lc.claimed_date < CURRENT_DATE THEN true
                ELSE false
            END as can_claim
    FROM last_claim lc
    )
    ,
    has_consecutive_streak AS
    (
        SELECT
        CASE 
                WHEN lc.claimed_date IS NULL THEN true -- First time claiming
                WHEN lc.claimed_date = CURRENT_DATE - INTERVAL '1 day' THEN true -- Claimed yesterday
                ELSE false -- Missed yesterday, streak broken
            END as has_streak
    FROM last_claim lc
    )
    SELECT
        cct.can_claim,
        us.current_streak,
        CASE 
            WHEN cct.can_claim AND hcs.has_streak THEN
                30 -- Daily login bonus (only if streak is maintained) - FIXED to 30 coins
            ELSE 0
        END as next_reward_amount
    FROM user_streak us
        LEFT JOIN last_claim lc ON true
    CROSS JOIN can_claim_today cct
    CROSS JOIN has_consecutive_streak hcs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
