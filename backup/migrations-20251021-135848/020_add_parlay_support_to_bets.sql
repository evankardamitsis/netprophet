-- Add parlay support to bets table
-- This migration adds columns to support parlay (accumulator) bets

-- Add parlay-specific columns to bets table
ALTER TABLE public.bets 
ADD COLUMN IF NOT EXISTS is_parlay BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS parlay_id UUID, -- Groups related parlay bets together
ADD COLUMN IF NOT EXISTS parlay_position INTEGER, -- Position in the parlay (1, 2, 3, etc.)
ADD COLUMN IF NOT EXISTS parlay_total_picks INTEGER, -- Total number of picks in the parlay
ADD COLUMN IF NOT EXISTS parlay_base_odds DECIMAL(8,4), -- Base odds before bonuses
-- parlay_final_odds column removed - now stored in parlays table
ADD COLUMN IF NOT EXISTS parlay_bonus_multiplier DECIMAL(5,4) DEFAULT 1.0000, -- Bonus multiplier applied
ADD COLUMN IF NOT EXISTS parlay_streak_booster DECIMAL(5,4) DEFAULT 1.0000, -- Streak booster applied
ADD COLUMN IF NOT EXISTS is_safe_bet BOOLEAN DEFAULT FALSE, -- Whether safe bet token was used
ADD COLUMN IF NOT EXISTS safe_bet_cost INTEGER DEFAULT 0; -- Cost of safe bet token

-- Add constraints for parlay data
DO $$ 
BEGIN
    -- Add parlay position constraint
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'check_parlay_position') THEN
        ALTER TABLE public.bets ADD CONSTRAINT check_parlay_position 
            CHECK (parlay_position IS NULL OR (parlay_position > 0 AND parlay_position <= parlay_total_picks));
    END IF;
    
    -- Add parlay total picks constraint
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'check_parlay_total_picks') THEN
        ALTER TABLE public.bets ADD CONSTRAINT check_parlay_total_picks 
            CHECK (parlay_total_picks IS NULL OR parlay_total_picks >= 2);
    END IF;
    
    -- Add parlay odds constraint
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'check_parlay_odds') THEN
        ALTER TABLE public.bets ADD CONSTRAINT check_parlay_odds 
            CHECK (parlay_base_odds IS NULL OR parlay_base_odds > 0);
    END IF;
    
    -- parlay_final_odds constraint removed - now stored in parlays table
    
    -- Add parlay bonus multiplier constraint
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'check_parlay_bonus_multiplier') THEN
        ALTER TABLE public.bets ADD CONSTRAINT check_parlay_bonus_multiplier 
            CHECK (parlay_bonus_multiplier >= 1.0000);
    END IF;
    
    -- Add parlay streak booster constraint
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'check_parlay_streak_booster') THEN
        ALTER TABLE public.bets ADD CONSTRAINT check_parlay_streak_booster 
            CHECK (parlay_streak_booster >= 1.0000);
    END IF;
END $$;

-- Create index for parlay queries
CREATE INDEX IF NOT EXISTS idx_bets_parlay_id ON public.bets(parlay_id);
CREATE INDEX IF NOT EXISTS idx_bets_is_parlay ON public.bets(is_parlay);

-- Create a view for parlay bet statistics
CREATE OR REPLACE VIEW public.parlay_stats AS
SELECT 
    user_id,
    COUNT(DISTINCT parlay_id) as total_parlays,
    COUNT(DISTINCT CASE WHEN status = 'won' THEN parlay_id END) as won_parlays,
    COUNT(DISTINCT CASE WHEN status = 'lost' THEN parlay_id END) as lost_parlays,
    COUNT(DISTINCT CASE WHEN status = 'active' THEN parlay_id END) as active_parlays,
    AVG(parlay_total_picks) as avg_parlay_picks,
    MAX(parlay_total_picks) as max_parlay_picks,
    SUM(CASE WHEN status = 'won' THEN winnings_paid ELSE 0 END) as total_parlay_winnings,
    SUM(CASE WHEN status = 'lost' THEN bet_amount ELSE 0 END) as total_parlay_losses,
    CASE 
        WHEN COUNT(DISTINCT parlay_id) > 0 THEN 
            ROUND((COUNT(DISTINCT CASE WHEN status = 'won' THEN parlay_id END)::DECIMAL / COUNT(DISTINCT parlay_id)) * 100, 2)
        ELSE 0 
    END as parlay_win_rate
FROM public.bets
WHERE is_parlay = true
GROUP BY user_id;

-- Create a function to calculate parlay outcomes
CREATE OR REPLACE FUNCTION calculate_parlay_outcome(parlay_uuid UUID)
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
        SELECT status 
        FROM public.bets 
        WHERE parlay_id = parlay_uuid 
        AND is_parlay = true
    LOOP
        total_bets := total_bets + 1;
        
        IF parlay_bets.status = 'lost' THEN
            any_lost := true;
            lost_bets := lost_bets + 1;
        ELSIF parlay_bets.status = 'won' THEN
            won_bets := won_bets + 1;
        END IF;
    END LOOP;
    
    -- Determine parlay outcome
    IF total_bets = 0 THEN
        RETURN 'pending';
    ELSIF any_lost THEN
        RETURN 'lost';
    ELSIF won_bets = total_bets THEN
        RETURN 'won';
    ELSE
        RETURN 'pending';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a function to update parlay status when individual bets are resolved
-- NOTE: This function is deprecated and will be replaced by update_parlay_status_from_bets()
-- which uses the new parlays table structure
CREATE OR REPLACE FUNCTION update_parlay_status()
RETURNS TRIGGER AS $$
BEGIN
    -- This function is deprecated and does nothing
    -- The correct function is update_parlay_status_from_bets() which uses the parlays table
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update parlay status
DROP TRIGGER IF EXISTS trigger_update_parlay_status ON public.bets;
CREATE TRIGGER trigger_update_parlay_status
    AFTER UPDATE OF status ON public.bets
    FOR EACH ROW
    EXECUTE FUNCTION update_parlay_status();

-- Add comment to document the new parlay system
COMMENT ON TABLE public.bets IS 'Bets table supporting both individual and parlay (accumulator) bets. Parlay bets are linked by parlay_id and include bonus multipliers and streak boosters.';
COMMENT ON COLUMN public.bets.is_parlay IS 'Whether this bet is part of a parlay (accumulator)';
COMMENT ON COLUMN public.bets.parlay_id IS 'UUID to group related parlay bets together';
COMMENT ON COLUMN public.bets.parlay_position IS 'Position of this bet within the parlay (1, 2, 3, etc.)';
COMMENT ON COLUMN public.bets.parlay_total_picks IS 'Total number of picks in the parlay';
COMMENT ON COLUMN public.bets.parlay_base_odds IS 'Base odds calculated as product of individual odds';
-- parlay_final_odds comment removed - now stored in parlays table
COMMENT ON COLUMN public.bets.parlay_bonus_multiplier IS 'Bonus multiplier applied for 3+ picks (e.g., 1.05 for +5%)';
COMMENT ON COLUMN public.bets.parlay_streak_booster IS 'Streak booster multiplier based on user winning streak';
COMMENT ON COLUMN public.bets.is_safe_bet IS 'Whether safe bet token was used to protect against one loss';
COMMENT ON COLUMN public.bets.safe_bet_cost IS 'Cost of safe bet token in tokens'; 