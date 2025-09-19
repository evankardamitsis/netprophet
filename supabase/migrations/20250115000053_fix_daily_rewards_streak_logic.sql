-- Fix daily rewards streak logic to prevent multiple claims per day
-- The issue is that the streak logic is being checked even when user has already claimed today

-- Drop and recreate the can_claim_daily_reward function with proper logic
DROP FUNCTION IF EXISTS can_claim_daily_reward(UUID);

CREATE OR REPLACE FUNCTION can_claim_daily_reward(user_uuid UUID)
RETURNS TABLE(
    can_claim BOOLEAN,
    current_streak INTEGER,
    next_reward_amount INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH user_streak AS (
        SELECT 
            COALESCE(MAX(streak_count), 0) as current_streak
        FROM daily_rewards 
        WHERE user_id = user_uuid
    ),
    last_claim AS (
        SELECT claimed_date
        FROM daily_rewards 
        WHERE user_id = user_uuid 
        ORDER BY claimed_date DESC 
        LIMIT 1
    ),
    can_claim_today AS (
        SELECT 
            CASE 
                WHEN lc.claimed_date IS NULL THEN true -- First time claiming
                WHEN lc.claimed_date < CURRENT_DATE THEN true -- Last claim was before today
                ELSE false -- Already claimed today
            END as can_claim
        FROM last_claim lc
    ),
    has_consecutive_streak AS (
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
            -- Only give reward if user can claim today AND has consecutive streak
            WHEN cct.can_claim AND hcs.has_streak THEN 30
            ELSE 0
        END as next_reward_amount
    FROM user_streak us
    LEFT JOIN last_claim lc ON true
    CROSS JOIN can_claim_today cct
    CROSS JOIN has_consecutive_streak hcs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix the claim_daily_reward function to be more robust
DROP FUNCTION IF EXISTS claim_daily_reward(UUID);

CREATE OR REPLACE FUNCTION claim_daily_reward(user_uuid UUID)
RETURNS TABLE(
    success BOOLEAN,
    reward_amount INTEGER,
    new_streak INTEGER,
    message TEXT
) AS $$
DECLARE
    can_claim BOOLEAN;
    current_streak INTEGER;
    next_reward_amount INTEGER;
    new_streak INTEGER;
    has_consecutive_streak BOOLEAN;
    last_claim_date DATE;
BEGIN
    -- First check if user can claim today
    SELECT * INTO can_claim, current_streak, next_reward_amount
    FROM can_claim_daily_reward(user_uuid);
    
    -- If already claimed today, return early
    IF NOT can_claim THEN
        RETURN QUERY SELECT false, 0, current_streak, 'Already claimed today'::TEXT;
        RETURN;
    END IF;
    
    -- Get the last claim date to check streak
    SELECT claimed_date INTO last_claim_date
    FROM daily_rewards 
    WHERE user_id = user_uuid 
    ORDER BY claimed_date DESC 
    LIMIT 1;
    
    -- Check if user has consecutive streak
    has_consecutive_streak := (
        last_claim_date IS NULL OR -- First time claiming
        last_claim_date = CURRENT_DATE - INTERVAL '1 day' -- Claimed yesterday
    );
    
    -- Calculate new streak
    IF has_consecutive_streak THEN
        new_streak := current_streak + 1;
    ELSE
        new_streak := 1; -- Reset streak if missed a day
    END IF;
    
    -- Insert the daily reward record
    INSERT INTO daily_rewards (user_id, claimed_date, reward_amount, streak_count)
    VALUES (user_uuid, CURRENT_DATE, next_reward_amount, new_streak);
    
    -- Return appropriate message
    IF next_reward_amount > 0 THEN
        RETURN QUERY SELECT true, next_reward_amount, new_streak, 'Daily reward claimed successfully'::TEXT;
    ELSE
        RETURN QUERY SELECT true, 0, new_streak, 'Streak broken - no reward today. Come back tomorrow to start a new streak!'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
