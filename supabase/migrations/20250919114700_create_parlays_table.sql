-- Create parlays table to separate parlay functionality from bets table
-- This migration creates a dedicated table for parlay (accumulator) bets

-- Create parlays table
CREATE TABLE IF NOT EXISTS public.parlays (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    total_stake INTEGER NOT NULL CHECK (total_stake > 0),
    base_odds DECIMAL(8,4) NOT NULL CHECK (base_odds > 0),
    final_odds DECIMAL(8,4) NOT NULL CHECK (final_odds > 0),
    bonus_multiplier DECIMAL(5,4) DEFAULT 1.0000 CHECK (bonus_multiplier >= 1.0000),
    streak_booster DECIMAL(5,4) DEFAULT 1.0000 CHECK (streak_booster >= 1.0000),
    is_safe_bet BOOLEAN DEFAULT FALSE,
    safe_bet_cost INTEGER DEFAULT 0 CHECK (safe_bet_cost >= 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'cancelled')),
    outcome TEXT CHECK (outcome IN ('won', 'lost')),
    total_winnings INTEGER DEFAULT 0 CHECK (total_winnings >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_parlays_user_id ON public.parlays(user_id);
CREATE INDEX IF NOT EXISTS idx_parlays_status ON public.parlays(status);
CREATE INDEX IF NOT EXISTS idx_parlays_created_at ON public.parlays(created_at);
CREATE INDEX IF NOT EXISTS idx_parlays_resolved_at ON public.parlays(resolved_at);

-- Enable RLS
ALTER TABLE public.parlays ENABLE ROW LEVEL SECURITY;

-- RLS Policies for parlays
-- Users can only see their own parlays
CREATE POLICY "Users can view their own parlays" ON public.parlays
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own parlays
CREATE POLICY "Users can insert their own parlays" ON public.parlays
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own parlays (limited fields)
CREATE POLICY "Users can update their own parlays" ON public.parlays
    FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all parlays
CREATE POLICY "Admins can view all parlays" ON public.parlays
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Create a view for parlay statistics
CREATE OR REPLACE VIEW public.parlay_statistics AS
SELECT 
    user_id,
    COUNT(*) as total_parlays,
    COUNT(CASE WHEN status = 'won' THEN 1 END) as won_parlays,
    COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost_parlays,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_parlays,
    AVG(final_odds) as avg_odds,
    MAX(final_odds) as max_odds,
    MIN(final_odds) as min_odds,
    SUM(total_stake) as total_staked,
    SUM(total_winnings) as total_winnings,
    SUM(CASE WHEN status = 'lost' THEN total_stake ELSE 0 END) as total_losses,
    CASE 
        WHEN COUNT(*) > 0 THEN 
            ROUND((COUNT(CASE WHEN status = 'won' THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2)
        ELSE 0 
    END as win_rate,
    AVG(bonus_multiplier) as avg_bonus_multiplier,
    AVG(streak_booster) as avg_streak_booster,
    COUNT(CASE WHEN is_safe_bet = true THEN 1 END) as safe_bets_used
FROM public.parlays
GROUP BY user_id;

-- Create function to calculate parlay outcome based on individual bets
CREATE OR REPLACE FUNCTION calculate_parlay_outcome_from_bets(parlay_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    parlay_bets RECORD;
    all_won BOOLEAN := true;
    any_lost BOOLEAN := false;
    total_bets INTEGER := 0;
    won_bets INTEGER := 0;
    lost_bets INTEGER := 0;
BEGIN
    -- Check all bets in the parlay
    FOR parlay_bets IN 
        SELECT status, is_safe_bet 
        FROM public.bets 
        WHERE parlay_id = parlay_uuid 
        AND is_parlay = true
    LOOP
        total_bets := total_bets + 1;
        
        IF parlay_bets.status = 'won' THEN
            won_bets := won_bets + 1;
        ELSIF parlay_bets.status = 'lost' THEN
            lost_bets := lost_bets + 1;
            any_lost := true;
            
            -- If safe bet was used and this is the only loss, don't fail the parlay
            IF parlay_bets.is_safe_bet = true AND lost_bets = 1 THEN
                all_won := true; -- Safe bet protects against one loss
            ELSE
                all_won := false;
            END IF;
        ELSE
            -- Still active, can't determine outcome yet
            RETURN 'active';
        END IF;
    END LOOP;
    
    -- Determine outcome
    IF total_bets = 0 THEN
        RETURN 'active';
    ELSIF all_won AND NOT any_lost THEN
        RETURN 'won';
    ELSIF any_lost AND NOT (lost_bets = 1 AND EXISTS(
        SELECT 1 FROM public.bets 
        WHERE parlay_id = parlay_uuid 
        AND is_parlay = true 
        AND is_safe_bet = true 
        AND status = 'lost'
    )) THEN
        RETURN 'lost';
    ELSE
        RETURN 'active';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to update parlay status based on bet outcomes
CREATE OR REPLACE FUNCTION update_parlay_status_from_bets()
RETURNS TRIGGER AS $$
DECLARE
    parlay_outcome TEXT;
    parlay_record RECORD;
    total_winnings INTEGER;
BEGIN
    -- Only process if this is a parlay bet
    IF NEW.is_parlay = true AND NEW.parlay_id IS NOT NULL THEN
        -- Calculate parlay outcome
        parlay_outcome := calculate_parlay_outcome_from_bets(NEW.parlay_id);
        
        -- Get parlay details
        SELECT * INTO parlay_record
        FROM public.parlays 
        WHERE id = NEW.parlay_id;
        
        -- Update parlay status if outcome changed
        IF parlay_outcome IN ('won', 'lost') AND parlay_record.status = 'active' THEN
            -- Calculate total winnings
            total_winnings := CASE 
                WHEN parlay_outcome = 'won' THEN 
                    CASE 
                        WHEN parlay_record.is_safe_bet = true AND NEW.status = 'lost' THEN 
                            parlay_record.total_stake -- Return stake for safe bet
                        ELSE 
                            ROUND(parlay_record.total_stake * parlay_record.final_odds)
                    END
                ELSE 0
            END;
            
            -- Update parlay record
            UPDATE public.parlays 
            SET 
                status = parlay_outcome,
                outcome = parlay_outcome,
                total_winnings = total_winnings,
                resolved_at = NOW(),
                updated_at = NOW()
            WHERE id = NEW.parlay_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update parlay status
DROP TRIGGER IF EXISTS trigger_update_parlay_status_from_bets ON public.bets;
CREATE TRIGGER trigger_update_parlay_status_from_bets
    AFTER UPDATE OF status ON public.bets
    FOR EACH ROW
    EXECUTE FUNCTION update_parlay_status_from_bets();

-- Add comments for documentation
COMMENT ON TABLE public.parlays IS 'Dedicated table for parlay (accumulator) bets, separate from individual bets';
COMMENT ON COLUMN public.parlays.total_stake IS 'Total amount staked on the parlay';
COMMENT ON COLUMN public.parlays.base_odds IS 'Base odds calculated as product of individual bet odds';
COMMENT ON COLUMN public.parlays.final_odds IS 'Final odds after applying bonus multipliers and streak boosters';
COMMENT ON COLUMN public.parlays.bonus_multiplier IS 'Bonus multiplier applied for 3+ picks (e.g., 1.05 for +5%)';
COMMENT ON COLUMN public.parlays.streak_booster IS 'Streak booster multiplier based on user winning streak';
COMMENT ON COLUMN public.parlays.is_safe_bet IS 'Whether safe bet token was used to protect against one loss';
COMMENT ON COLUMN public.parlays.safe_bet_cost IS 'Cost of safe bet token in tokens';
COMMENT ON COLUMN public.parlays.total_winnings IS 'Total winnings paid out for this parlay';
