-- Update daily rewards functions to return message keys for frontend translation
-- This replaces the hardcoded messages with keys that the frontend will translate

-- Update claim_daily_reward function to return message keys
CREATE OR REPLACE FUNCTION claim_daily_reward
(user_uuid UUID)
RETURNS TABLE
(
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
    SELECT *
    INTO can_claim
    , current_streak, next_reward_amount
    FROM can_claim_daily_reward
    (user_uuid);

IF NOT can_claim THEN
RETURN QUERY
SELECT false, 0, current_streak, 'Already claimed today'
::TEXT;
RETURN;
END
IF;
    
    -- Get the last claim date
    SELECT claimed_date
INTO last_claim_date
FROM daily_rewards
WHERE user_id = user_uuid
ORDER BY claimed_date DESC 
    LIMIT 1;
    
    -- Calculate new streak and return message key for frontend translation
    IF last_claim_date
IS NULL THEN
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
END
IF;
    ELSE
        -- Missed a day - reset to 1
        new_streak := 1;
        message_text := 'STREAK_BROKEN';
END
IF;
    
    -- Insert the daily reward record
    INSERT INTO daily_rewards
    (user_id, claimed_date, reward_amount, streak_count)
VALUES
    (user_uuid, CURRENT_DATE, next_reward_amount, new_streak);

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
END
IF;
    
    RETURN QUERY
SELECT true, next_reward_amount, new_streak, message_text::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

