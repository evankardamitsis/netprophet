-- Clean up redundant parlay columns from bets table
-- This migration removes parlay-specific columns that are now stored in the parlays table

-- First, drop any dependent views
DROP VIEW IF EXISTS public.parlay_stats;
DROP VIEW IF EXISTS public.parlay_statistics;

-- Remove parlay-specific columns from bets table
ALTER TABLE public.bets 
DROP COLUMN IF EXISTS parlay_total_picks,
DROP COLUMN IF EXISTS parlay_base_odds,
DROP COLUMN IF EXISTS parlay_final_odds,
DROP COLUMN IF EXISTS parlay_bonus_multiplier,
DROP COLUMN IF EXISTS parlay_streak_booster,
DROP COLUMN IF EXISTS is_safe_bet,
DROP COLUMN IF EXISTS safe_bet_cost;

-- Drop the old parlay trigger and function
DROP TRIGGER IF EXISTS trigger_update_parlay_status ON public.bets;
DROP FUNCTION IF EXISTS update_parlay_status();

-- Drop the old parlay stats view
DROP VIEW IF EXISTS public.parlay_stats;

-- Update the bets table comment
COMMENT ON TABLE public.bets IS 'Bets table for individual bets and parlay bet components. Parlay metadata is stored in the parlays table.';

-- Add foreign key constraint for parlay_id to reference parlays table
ALTER TABLE public.bets 
ADD CONSTRAINT fk_bets_parlay_id 
FOREIGN KEY (parlay_id) REFERENCES public.parlays(id) ON DELETE CASCADE;

-- Create a new view for comprehensive bet analytics
CREATE OR REPLACE VIEW public.bet_analytics AS
SELECT 
    b.id as bet_id,
    b.user_id,
    b.match_id,
    b.bet_amount,
    b.multiplier,
    b.potential_winnings,
    b.prediction,
    b.status,
    b.outcome,
    b.winnings_paid,
    b.created_at,
    b.resolved_at,
    b.is_parlay,
    b.parlay_id,
    b.parlay_position,
    p.total_stake as parlay_total_stake,
    p.base_odds as parlay_base_odds,
    p.final_odds as parlay_final_odds,
    p.bonus_multiplier as parlay_bonus_multiplier,
    p.streak_booster as parlay_streak_booster,
    p.is_safe_bet as parlay_is_safe_bet,
    p.safe_bet_cost as parlay_safe_bet_cost,
    p.status as parlay_status,
    p.outcome as parlay_outcome,
    p.total_winnings as parlay_total_winnings
FROM public.bets b
LEFT JOIN public.parlays p ON b.parlay_id = p.id;

-- Create a view for parlay performance metrics
CREATE OR REPLACE VIEW public.parlay_performance AS
SELECT 
    p.id as parlay_id,
    p.user_id,
    p.total_stake,
    p.base_odds,
    p.final_odds,
    p.bonus_multiplier,
    p.streak_booster,
    p.is_safe_bet,
    p.status,
    p.outcome,
    p.total_winnings,
    p.created_at,
    p.resolved_at,
    COUNT(b.id) as bet_count,
    COUNT(CASE WHEN b.status = 'won' THEN 1 END) as won_bets,
    COUNT(CASE WHEN b.status = 'lost' THEN 1 END) as lost_bets,
    COUNT(CASE WHEN b.status = 'active' THEN 1 END) as active_bets,
    CASE 
        WHEN COUNT(b.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN b.status = 'won' THEN 1 END)::DECIMAL / COUNT(b.id)) * 100, 2)
        ELSE 0 
    END as bet_win_rate,
    CASE 
        WHEN p.status = 'won' THEN p.total_winnings - p.total_stake
        WHEN p.status = 'lost' THEN -p.total_stake
        ELSE 0
    END as net_profit
FROM public.parlays p
LEFT JOIN public.bets b ON b.parlay_id = p.id AND b.is_parlay = true
GROUP BY p.id, p.user_id, p.total_stake, p.base_odds, p.final_odds, 
         p.bonus_multiplier, p.streak_booster, p.is_safe_bet, p.status, 
         p.outcome, p.total_winnings, p.created_at, p.resolved_at;

-- Add comments for documentation
COMMENT ON VIEW public.bet_analytics IS 'Comprehensive view combining individual bets with parlay information';
COMMENT ON VIEW public.parlay_performance IS 'Performance metrics for parlays including bet statistics and profitability';
COMMENT ON COLUMN public.bets.is_parlay IS 'Whether this bet is part of a parlay (accumulator)';
COMMENT ON COLUMN public.bets.parlay_id IS 'Reference to the parlay this bet belongs to (if is_parlay = true)';
COMMENT ON COLUMN public.bets.parlay_position IS 'Position of this bet within the parlay (1, 2, 3, etc.)';
