-- Update daily rewards functions to implement streak system
-- Users only get daily login bonus if they maintain consecutive daily logins

-- Function to check if user can claim daily reward
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
                WHEN lc.claimed_date IS NULL THEN true
                WHEN lc.claimed_date < CURRENT_DATE THEN true
                ELSE false
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
            WHEN cct.can_claim AND hcs.has_streak THEN
                100 -- Daily login bonus (only if streak is maintained)
            ELSE 0
        END as next_reward_amount
    FROM user_streak us
    LEFT JOIN last_claim lc ON true
    CROSS JOIN can_claim_today cct
    CROSS JOIN has_consecutive_streak hcs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to claim daily reward
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
BEGIN
    -- Check if user can claim
    SELECT * INTO can_claim, current_streak, next_reward_amount
    FROM can_claim_daily_reward(user_uuid);
    
    IF NOT can_claim THEN
        RETURN QUERY SELECT false, 0, current_streak, 'Already claimed today'::TEXT;
        RETURN;
    END IF;
    
    -- Check if user has consecutive streak (claimed yesterday or first time)
    SELECT 
        CASE 
            WHEN NOT EXISTS (SELECT 1 FROM daily_rewards WHERE user_id = user_uuid) THEN true -- First time claiming
            WHEN EXISTS (SELECT 1 FROM daily_rewards WHERE user_id = user_uuid AND claimed_date = CURRENT_DATE - INTERVAL '1 day') THEN true -- Claimed yesterday
            ELSE false -- Missed yesterday, streak broken
        END INTO has_consecutive_streak;
    
    -- Calculate new streak
    IF has_consecutive_streak THEN
        new_streak := current_streak + 1;
    ELSE
        new_streak := 1; -- Reset streak if missed a day
    END IF;
    
    -- Insert the daily reward record (reward_amount will be 0 if streak was broken)
    INSERT INTO daily_rewards (user_id, claimed_date, reward_amount, streak_count)
    VALUES (user_uuid, CURRENT_DATE, next_reward_amount, new_streak);
    
    -- Return appropriate message based on whether they got a reward
    IF next_reward_amount > 0 THEN
        RETURN QUERY SELECT true, next_reward_amount, new_streak, 'Daily reward claimed successfully'::TEXT;
    ELSE
        RETURN QUERY SELECT true, 0, new_streak, 'Streak broken - no reward today. Come back tomorrow to start a new streak!'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
