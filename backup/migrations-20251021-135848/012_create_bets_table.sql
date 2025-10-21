-- Create bets table
CREATE TABLE IF NOT EXISTS public.bets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
    bet_amount INTEGER NOT NULL CHECK (bet_amount > 0),
    multiplier DECIMAL(5,2) NOT NULL CHECK (multiplier > 0),
    potential_winnings DECIMAL(10,2) NOT NULL CHECK (potential_winnings > 0),
    prediction JSONB NOT NULL, -- Store the structured prediction data
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'cancelled')),
    outcome TEXT, -- 'won', 'lost', or null if not yet determined
    winnings_paid INTEGER DEFAULT 0, -- Amount actually paid out
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE, -- When the bet was resolved
    description TEXT -- Human readable description of the bet
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON public.bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_match_id ON public.bets(match_id);
CREATE INDEX IF NOT EXISTS idx_bets_status ON public.bets(status);
CREATE INDEX IF NOT EXISTS idx_bets_created_at ON public.bets(created_at);

-- Enable RLS
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bets
-- Users can only see their own bets
CREATE POLICY "Users can view their own bets" ON public.bets
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own bets
CREATE POLICY "Users can insert their own bets" ON public.bets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own bets (limited fields)
CREATE POLICY "Users can update their own bets" ON public.bets
    FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all bets
CREATE POLICY "Admins can view all bets" ON public.bets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND is_admin = true
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_bets_updated_at 
    BEFORE UPDATE ON public.bets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create a view for bet statistics
CREATE OR REPLACE VIEW public.bet_stats AS
SELECT 
    user_id,
    COUNT(*) as total_bets,
    COUNT(CASE WHEN status = 'won' THEN 1 END) as won_bets,
    COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost_bets,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_bets,
    SUM(bet_amount) as total_bet_amount,
    SUM(CASE WHEN status = 'won' THEN winnings_paid ELSE 0 END) as total_winnings,
    SUM(CASE WHEN status = 'lost' THEN bet_amount ELSE 0 END) as total_losses,
    CASE 
        WHEN COUNT(*) > 0 THEN 
            ROUND((COUNT(CASE WHEN status = 'won' THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2)
        ELSE 0 
    END as win_rate
FROM public.bets
GROUP BY user_id; 