-- Fix daily login streak system issues
-- This migration addresses the critical problems with the daily rewards system

-- 1. Fix the can_claim_daily_reward function to always give daily reward (30 coins)
-- Users should get daily reward even if they miss a day (streak resets but reward continues)
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
            WHEN cct.can_claim THEN
                30 -- Always give 30 coins daily reward (streak bonus is separate)
            ELSE 0
        END as next_reward_amount
    FROM user_streak us
    LEFT JOIN last_claim lc ON true
    CROSS JOIN can_claim_today cct
    CROSS JOIN has_consecutive_streak hcs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix the claim_daily_reward function to properly handle streak bonuses
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
    daily_reward INTEGER := 30;
    streak_bonus INTEGER := 0;
    total_reward INTEGER := 0;
    message_text TEXT;
BEGIN
    -- Check if user can claim
    SELECT * INTO can_claim, current_streak, next_reward_amount
    FROM can_claim_daily_reward(user_uuid);
    
    IF NOT can_claim THEN
        RETURN QUERY SELECT false, 0, current_streak, 'Already claimed today'::TEXT;
        RETURN;
    END IF;
    
    -- Calculate new streak (check if streak should continue or reset)
    SELECT 
        CASE 
            WHEN lc.claimed_date IS NULL THEN 1 -- First time claiming
            WHEN lc.claimed_date = CURRENT_DATE - INTERVAL '1 day' THEN current_streak + 1 -- Continue streak
            ELSE 1 -- Reset streak (missed a day or more)
        END INTO new_streak
    FROM (
        SELECT claimed_date
        FROM daily_rewards 
        WHERE user_id = user_uuid 
        ORDER BY claimed_date DESC 
        LIMIT 1
    ) lc;
    
    -- Calculate rewards
    total_reward := daily_reward; -- Always get daily login reward (30 coins)
    
    -- Add streak bonus if it's a 7-day milestone
    IF new_streak % 7 = 0 AND new_streak > 0 THEN
        streak_bonus := 100;
        total_reward := total_reward + streak_bonus;
    END IF;
    
    -- Insert the daily reward record
    INSERT INTO daily_rewards (user_id, claimed_date, reward_amount, streak_count)
    VALUES (user_uuid, CURRENT_DATE, total_reward, new_streak);
    
    -- Build message
    message_text := 'Daily login reward claimed!';
    
    IF streak_bonus > 0 THEN
        message_text := message_text || ' 7-day streak bonus!';
    END IF;
    
    message_text := message_text || ' (+' || total_reward || ' coins)';
    
    RETURN QUERY SELECT true, total_reward, new_streak, message_text::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
