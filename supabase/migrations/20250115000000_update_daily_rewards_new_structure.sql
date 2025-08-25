-- Update daily rewards system to new structure:
-- 1. Daily login reward: 30 coins (every day) - DAILY_REWARDS_CONSTANTS.DAILY_LOGIN_REWARD
-- 2. Welcome bonus: 100 coins (first time only) - DAILY_REWARDS_CONSTANTS.WELCOME_BONUS
-- 3. Login streak every 7 days: 100 coins (every 7th day) - DAILY_REWARDS_CONSTANTS.SEVEN_DAY_STREAK_BONUS

-- Add welcome_bonus_claimed column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS welcome_bonus_claimed BOOLEAN DEFAULT FALSE;

-- Drop existing functions to recreate them with new signatures
DROP FUNCTION IF EXISTS can_claim_daily_reward(UUID);
DROP FUNCTION IF EXISTS claim_daily_reward(UUID);

-- Function to check if user can claim daily reward
CREATE OR REPLACE FUNCTION can_claim_daily_reward(user_uuid UUID)
RETURNS TABLE(
    can_claim BOOLEAN,
    current_streak INTEGER,
    next_reward_amount INTEGER,
    welcome_bonus_available BOOLEAN
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
    welcome_bonus_status AS (
        SELECT 
            COALESCE(welcome_bonus_claimed, false) as claimed
        FROM profiles 
        WHERE id = user_uuid
    ),
    potential_new_streak AS (
        SELECT 
            CASE 
                WHEN lc.claimed_date IS NULL THEN 1 -- First time claiming
                WHEN lc.claimed_date = CURRENT_DATE - INTERVAL '1 day' THEN us.current_streak + 1 -- Continue streak
                ELSE 1 -- Reset streak (missed a day or more)
            END as new_streak
        FROM user_streak us
        LEFT JOIN last_claim lc ON true
    ),
    streak_bonus AS (
        SELECT 
            CASE 
                WHEN pns.new_streak % 7 = 0 THEN 100
                ELSE 0
            END as streak_bonus_amount
        FROM potential_new_streak pns
    )
    SELECT 
        cct.can_claim,
        us.current_streak,
        CASE 
            WHEN cct.can_claim THEN
                30 + -- Daily login reward
                CASE WHEN NOT wbs.claimed THEN 100 ELSE 0 END + -- Welcome bonus
                sb.streak_bonus_amount -- 7-day streak bonus
            ELSE 0
        END as next_reward_amount,
        NOT wbs.claimed as welcome_bonus_available
    FROM user_streak us
    LEFT JOIN last_claim lc ON true
    CROSS JOIN can_claim_today cct
    CROSS JOIN welcome_bonus_status wbs
    CROSS JOIN potential_new_streak pns
    CROSS JOIN streak_bonus sb;
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
    welcome_bonus_available BOOLEAN;
    new_streak INTEGER;
    daily_reward INTEGER := 30;
    welcome_bonus INTEGER := 0;
    streak_bonus INTEGER := 0;
    total_reward INTEGER := 0;
    message_text TEXT;
BEGIN
    -- Check if user can claim
    SELECT * INTO can_claim, current_streak, next_reward_amount, welcome_bonus_available
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
    total_reward := daily_reward; -- Always get daily login reward
    
    -- Add welcome bonus if available
    IF welcome_bonus_available THEN
        welcome_bonus := 100;
        total_reward := total_reward + welcome_bonus;
    END IF;
    
    -- Add streak bonus if it's a 7-day milestone
    IF new_streak % 7 = 0 THEN
        streak_bonus := 100;
        total_reward := total_reward + streak_bonus;
    END IF;
    
    -- Insert the daily reward record
    INSERT INTO daily_rewards (user_id, claimed_date, reward_amount, streak_count)
    VALUES (user_uuid, CURRENT_DATE, total_reward, new_streak);
    
    -- Mark welcome bonus as claimed if it was given
    IF welcome_bonus_available THEN
        UPDATE profiles 
        SET welcome_bonus_claimed = true 
        WHERE id = user_uuid;
    END IF;
    
    -- Build message
    message_text := 'Daily login reward claimed!';
    
    IF welcome_bonus > 0 THEN
        message_text := message_text || ' Welcome bonus included!';
    END IF;
    
    IF streak_bonus > 0 THEN
        message_text := message_text || ' 7-day streak bonus!';
    END IF;
    
    message_text := message_text || ' (+' || total_reward || ' coins)';
    
    RETURN QUERY SELECT true, total_reward, new_streak, message_text::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
