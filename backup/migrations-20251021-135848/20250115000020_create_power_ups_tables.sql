-- Create power_ups table for power-up definitions
CREATE TABLE IF NOT EXISTS power_ups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    power_up_id TEXT UNIQUE NOT NULL, -- e.g., 'safeParlay', 'streakBoost'
    name TEXT NOT NULL,
    cost INTEGER NOT NULL CHECK (cost >= 0),
    effect TEXT NOT NULL,
    usage_type TEXT NOT NULL,
    icon TEXT NOT NULL,
    description TEXT NOT NULL,
    gradient TEXT NOT NULL,
    glow_color TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_power_ups table for user inventory
CREATE TABLE IF NOT EXISTS user_power_ups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    power_up_id TEXT NOT NULL REFERENCES power_ups(power_up_id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    expires_at TIMESTAMP WITH TIME ZONE, -- For time-based power-ups
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, power_up_id)
);

-- Create power_up_usage_log table for tracking usage
CREATE TABLE IF NOT EXISTS power_up_usage_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    power_up_id TEXT NOT NULL REFERENCES power_ups(power_up_id) ON DELETE CASCADE,
    bet_id UUID REFERENCES public.bets(id) ON DELETE CASCADE, -- For bet-related power-ups
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE, -- For match-related power-ups
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    effect_applied JSONB, -- Store the specific effect that was applied
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_power_ups_active ON power_ups(is_active);
CREATE INDEX IF NOT EXISTS idx_power_ups_power_up_id ON power_ups(power_up_id);
CREATE INDEX IF NOT EXISTS idx_user_power_ups_user_id ON user_power_ups(user_id);
CREATE INDEX IF NOT EXISTS idx_user_power_ups_power_up_id ON user_power_ups(power_up_id);
CREATE INDEX IF NOT EXISTS idx_user_power_ups_expires_at ON user_power_ups(expires_at);
CREATE INDEX IF NOT EXISTS idx_power_up_usage_log_user_id ON power_up_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_power_up_usage_log_bet_id ON power_up_usage_log(bet_id);
CREATE INDEX IF NOT EXISTS idx_power_up_usage_log_match_id ON power_up_usage_log(match_id);

-- Enable RLS
ALTER TABLE power_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_power_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE power_up_usage_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for power_ups
CREATE POLICY "Everyone can view active power ups" ON power_ups
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage power ups" ON power_ups
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- RLS Policies for user_power_ups
CREATE POLICY "Users can view their own power ups" ON user_power_ups
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own power ups" ON user_power_ups
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own power ups" ON user_power_ups
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage user power ups" ON user_power_ups
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- RLS Policies for power_up_usage_log
CREATE POLICY "Users can view their own power up usage" ON power_up_usage_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own power up usage" ON power_up_usage_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all power up usage" ON power_up_usage_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- Functions to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_power_ups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_user_power_ups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
CREATE TRIGGER update_power_ups_updated_at
    BEFORE UPDATE ON power_ups
    FOR EACH ROW
    EXECUTE FUNCTION update_power_ups_updated_at();

CREATE TRIGGER update_user_power_ups_updated_at
    BEFORE UPDATE ON user_power_ups
    FOR EACH ROW
    EXECUTE FUNCTION update_user_power_ups_updated_at();

-- Insert default power-ups
INSERT INTO power_ups (power_up_id, name, cost, effect, usage_type, icon, description, gradient, glow_color, is_active) VALUES
    ('safeParlay', 'Safe Parlay Slip', 900, 'Survive 1 wrong pick in a parlay slip', 'Once per slip', '🛡', 'Protect your parlay prediction from one incorrect pick', 'from-blue-500 to-purple-600', 'shadow-blue-500/25', true),
    ('safeSingle', 'Safe Slip', 900, 'Survive 1 wrong pick in a regular slip', 'Once per slip', '🛡', 'Protect your single prediction from one incorrect pick', 'from-green-500 to-emerald-600', 'shadow-green-500/25', true),
    ('streakBoost', 'Streak Multiplier', 1400, 'Streak points ×1.5 for 3 days', 'Time-based', '🔥', 'Boost your streak points by 50% for 3 days', 'from-orange-500 to-red-600', 'shadow-orange-500/25', true),
    ('doubleXP', 'Double XP Match', 550, 'Double points for 1 chosen match', 'Once per match', '🎯', 'Double your points earned from a specific match', 'from-purple-500 to-pink-600', 'shadow-purple-500/25', true)
ON CONFLICT (power_up_id) DO NOTHING;
