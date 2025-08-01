-- Create daily_rewards table for secure tracking
CREATE TABLE IF NOT EXISTS daily_rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    claimed_date DATE NOT NULL,
    reward_amount INTEGER NOT NULL,
    streak_count INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, claimed_date)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_daily_rewards_user_date ON daily_rewards(user_id, claimed_date);

-- Enable RLS
ALTER TABLE daily_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_rewards' AND policyname = 'Users can view their own daily rewards') THEN
        CREATE POLICY "Users can view their own daily rewards" ON daily_rewards
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_rewards' AND policyname = 'Users can insert their own daily rewards') THEN
        CREATE POLICY "Users can insert their own daily rewards" ON daily_rewards
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

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
    )
    SELECT 
        CASE 
            WHEN lc.claimed_date IS NULL THEN true
            WHEN lc.claimed_date < CURRENT_DATE THEN true
            ELSE false
        END as can_claim,
        us.current_streak,
        CASE 
            WHEN lc.claimed_date IS NULL OR lc.claimed_date < CURRENT_DATE THEN
                25 + (us.current_streak * 5) -- Base + streak bonus
            ELSE 0
        END as next_reward_amount
    FROM user_streak us
    LEFT JOIN last_claim lc ON true;
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
BEGIN
    -- Check if user can claim
    SELECT * INTO can_claim, current_streak, next_reward_amount
    FROM can_claim_daily_reward(user_uuid);
    
    IF NOT can_claim THEN
        RETURN QUERY SELECT false, 0, current_streak, 'Already claimed today'::TEXT;
        RETURN;
    END IF;
    
    -- Calculate new streak
    IF current_streak = 0 OR EXISTS (
        SELECT 1 FROM daily_rewards 
        WHERE user_id = user_uuid 
        AND claimed_date = CURRENT_DATE - INTERVAL '1 day'
    ) THEN
        new_streak := current_streak + 1;
    ELSE
        new_streak := 1; -- Reset streak if missed a day
    END IF;
    
    -- Insert the daily reward record
    INSERT INTO daily_rewards (user_id, claimed_date, reward_amount, streak_count)
    VALUES (user_uuid, CURRENT_DATE, next_reward_amount, new_streak);
    
    RETURN QUERY SELECT true, next_reward_amount, new_streak, 'Daily reward claimed successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
