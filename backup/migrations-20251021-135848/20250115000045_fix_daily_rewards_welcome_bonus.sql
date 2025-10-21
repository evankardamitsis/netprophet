-- Fix daily rewards to not give welcome bonus through daily rewards system
-- Welcome bonus should only be claimed through the wallet operations function

-- Update the can_claim_daily_reward function to not include welcome bonus
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
        false as welcome_bonus_available -- Always false - welcome bonus is handled separately
    FROM user_streak us
    LEFT JOIN last_claim lc ON true
    CROSS JOIN can_claim_today cct
    CROSS JOIN welcome_bonus_status wbs
    CROSS JOIN potential_new_streak pns
    CROSS JOIN streak_bonus sb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the claim_daily_reward function to not give welcome bonus
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
    
    -- Calculate rewards (only daily login and streak bonus, no welcome bonus)
    total_reward := daily_reward; -- Always get daily login reward
    
    -- Add streak bonus if it's a 7-day milestone
    IF new_streak % 7 = 0 THEN
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
