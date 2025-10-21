-- Complete fix for new user balance issues
-- This migration safely addresses all problems with user starting balances

-- 1. Fix the default balance for new users
ALTER TABLE profiles ALTER COLUMN balance SET DEFAULT 0;

-- 2. Ensure both welcome bonus columns exist and are synchronized
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS welcome_bonus_claimed BOOLEAN DEFAULT FALSE;

-- 3. Synchronize the data between the two columns (safe operation)
UPDATE profiles 
SET welcome_bonus_claimed = has_received_welcome_bonus 
WHERE welcome_bonus_claimed IS NULL;

UPDATE profiles 
SET has_received_welcome_bonus = welcome_bonus_claimed 
WHERE has_received_welcome_bonus IS NULL;

-- 4. Fix users with incorrect starting balances (only affects users who haven't claimed welcome bonus)
-- This is safe because it only affects users who haven't received their welcome bonus yet
UPDATE profiles 
SET balance = 0 
WHERE balance = 1250
    AND has_received_welcome_bonus = false;

UPDATE profiles 
SET balance = 0 
WHERE balance = 1000
    AND has_received_welcome_bonus = false;

-- 5. Ensure welcome bonus flag is properly set for users who should have received it
-- This only affects users who have >= 100 coins but haven't been marked as receiving welcome bonus
UPDATE profiles 
SET has_received_welcome_bonus = true 
WHERE balance >= 100
    AND has_received_welcome_bonus = false;

-- 6. Drop and recreate the daily rewards functions to avoid return type conflicts
DROP FUNCTION IF EXISTS can_claim_daily_reward(UUID);
DROP FUNCTION IF EXISTS claim_daily_reward(UUID);

-- 7. Create the updated daily rewards functions
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
        SELECT COALESCE(MAX(streak_count), 0) as current_streak
        FROM daily_rewards 
        WHERE user_id = user_uuid
    ),
    last_claim AS (
        SELECT MAX(claimed_date) as last_claimed_date
        FROM daily_rewards 
        WHERE user_id = user_uuid
    ),
    can_claim_today AS (
        SELECT 
            CASE 
                WHEN lc.last_claimed_date IS NULL THEN true -- Never claimed before
                WHEN lc.last_claimed_date < CURRENT_DATE THEN true -- Haven't claimed today
                ELSE false -- Already claimed today
            END as can_claim
        FROM last_claim lc
    ),
    potential_new_streak AS (
        SELECT 
            CASE 
                WHEN lc.last_claimed_date IS NULL THEN 1 -- First time claiming
                WHEN lc.last_claimed_date = CURRENT_DATE - INTERVAL '1 day' THEN us.current_streak + 1 -- Continue streak
                ELSE 1 -- Reset streak (missed a day or more)
            END as new_streak
        FROM user_streak us
        CROSS JOIN last_claim lc
    ),
    streak_bonus AS (
        SELECT 
            CASE 
                WHEN pns.new_streak % 7 = 0 THEN 100 -- 7-day milestone bonus
                ELSE 0
            END as streak_bonus_amount
        FROM potential_new_streak pns
    ),
    welcome_bonus_status AS (
        SELECT 
            COALESCE(p.has_received_welcome_bonus, false) as claimed
        FROM profiles p
        WHERE p.id = user_uuid
    )
    SELECT 
        cct.can_claim,
        us.current_streak,
        CASE 
            WHEN pns.new_streak % 7 = 0 THEN 
                30 + sb.streak_bonus_amount -- 7-day streak bonus
            ELSE 30
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

-- 8. Create the updated claim function
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
    
    -- Mark welcome bonus as claimed if it was given (update both columns for consistency)
    IF welcome_bonus_available THEN
        UPDATE profiles 
        SET 
            has_received_welcome_bonus = true,
            welcome_bonus_claimed = true
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

-- 9. Add documentation
COMMENT ON COLUMN profiles.balance IS 'User balance in coins. New users start with 0 and must claim welcome bonus.';
COMMENT ON COLUMN profiles.has_received_welcome_bonus IS 'Flag indicating if user has received their welcome bonus.';
COMMENT ON COLUMN profiles.welcome_bonus_claimed IS 'Legacy column for welcome bonus status - kept for compatibility.';
