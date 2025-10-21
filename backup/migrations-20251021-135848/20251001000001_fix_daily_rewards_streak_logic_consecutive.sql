-- Fix daily rewards streak logic to require 2 consecutive days before rewards start
-- Streak must be >= 2 to get rewards
-- If user misses a day, streak resets and they need 2 consecutive days again

-- 1. Update can_claim_daily_reward function
CREATE OR REPLACE FUNCTION can_claim_daily_reward(user_uuid UUID)
RETURNS TABLE(
    can_claim BOOLEAN,
    current_streak INTEGER,
    next_reward_amount INTEGER
) AS $$
DECLARE
    last_claim_date DATE;
    current_streak_value INTEGER;
    potential_new_streak INTEGER;
BEGIN
    -- Get the last claim date and current streak
    SELECT claimed_date, COALESCE(streak_count, 0)
    INTO last_claim_date, current_streak_value
    FROM daily_rewards 
    WHERE user_id = user_uuid 
    ORDER BY claimed_date DESC 
    LIMIT 1;
    
    -- If no previous claims, this would be day 1
    IF last_claim_date IS NULL THEN
        RETURN QUERY SELECT 
            true as can_claim,
            0 as current_streak,
            0 as next_reward_amount; -- No reward on first day
        RETURN;
    END IF;
    
    -- If already claimed today, can't claim again
    IF last_claim_date >= CURRENT_DATE THEN
        RETURN QUERY SELECT 
            false as can_claim,
            current_streak_value as current_streak,
            0 as next_reward_amount;
        RETURN;
    END IF;
    
    -- Calculate what the new streak would be if they claim today
    IF last_claim_date = CURRENT_DATE - INTERVAL '1 day' THEN
        -- Consecutive day - increment streak
        potential_new_streak := current_streak_value + 1;
    ELSE
        -- Missed a day or more - start over at 1
        potential_new_streak := 1;
    END IF;
    
    -- Can claim, return the potential streak and reward
    -- Reward is 30 coins only if new streak >= 2
    RETURN QUERY SELECT 
        true as can_claim,
        current_streak_value as current_streak,
        CASE 
            WHEN potential_new_streak >= 2 THEN 30
            ELSE 0
        END as next_reward_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update claim_daily_reward function
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
    last_claim_date DATE;
    new_streak INTEGER;
    message_text TEXT;
BEGIN
    -- Check if user can claim
    SELECT * INTO can_claim, current_streak, next_reward_amount
    FROM can_claim_daily_reward(user_uuid);
    
    IF NOT can_claim THEN
        RETURN QUERY SELECT false, 0, current_streak, 'Already claimed today'::TEXT;
        RETURN;
    END IF;
    
    -- Get the last claim date
    SELECT claimed_date INTO last_claim_date
    FROM daily_rewards 
    WHERE user_id = user_uuid 
    ORDER BY claimed_date DESC 
    LIMIT 1;
    
    -- Calculate new streak and return message key for frontend translation
    IF last_claim_date IS NULL THEN
        -- First time claiming
        new_streak := 1;
        message_text := 'FIRST_LOGIN';
    ELSIF last_claim_date = CURRENT_DATE - INTERVAL '1 day' THEN
        -- Consecutive day - increment streak
        new_streak := current_streak + 1;
        
        IF new_streak = 2 THEN
            message_text := 'STREAK_ACTIVATED';
        ELSIF new_streak % 7 = 0 THEN
            -- Add bonus for 7-day milestones
            next_reward_amount := next_reward_amount + 100;
            message_text := 'STREAK_BONUS';
        ELSE
            message_text := 'STREAK_CONTINUED:' || new_streak;
        END IF;
    ELSE
        -- Missed a day - reset to 1
        new_streak := 1;
        message_text := 'STREAK_BROKEN';
    END IF;
    
    -- Insert the daily reward record
    INSERT INTO daily_rewards (user_id, claimed_date, reward_amount, streak_count)
    VALUES (user_uuid, CURRENT_DATE, next_reward_amount, new_streak);
    
    -- Update profile balance if there's a reward
    IF next_reward_amount > 0 THEN
        UPDATE profiles 
        SET 
            balance = balance + next_reward_amount,
            daily_login_streak = new_streak
        WHERE id = user_uuid;
    ELSE
        -- Just update the streak
        UPDATE profiles 
        SET daily_login_streak = new_streak
        WHERE id = user_uuid;
    END IF;
    
    RETURN QUERY SELECT true, next_reward_amount, new_streak, message_text::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

