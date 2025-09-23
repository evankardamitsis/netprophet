-- Fix SECURITY DEFINER views by recreating them with SECURITY INVOKER
-- This addresses the Supabase security warnings for the new parlay views

-- Drop existing views
DROP VIEW IF EXISTS public.parlay_analytics;
DROP VIEW IF EXISTS public.parlay_performance;
DROP VIEW IF EXISTS public.bet_analytics;

-- Recreate parlay_analytics view with SECURITY INVOKER
CREATE OR REPLACE VIEW public.parlay_analytics
WITH
(security_invoker = true) AS
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
    ARRAY_AGG(b.match_id ORDER BY b.parlay_position) as match_ids,
    ARRAY_AGG(b.description ORDER BY b.parlay_position) as bet_descriptions
FROM public.parlays p
LEFT JOIN public.bets b ON b.parlay_id = p.id AND b.is_parlay = true
GROUP BY p.id, p.user_id, p.total_stake, p.base_odds, p.final_odds, 
         p.bonus_multiplier, p.streak_booster, p.is_safe_bet, p.status, 
         p.outcome, p.total_winnings, p.created_at, p.resolved_at;

-- Recreate parlay_performance view with SECURITY INVOKER
CREATE OR REPLACE VIEW public.parlay_performance
WITH
(security_invoker = true) AS
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

-- Recreate bet_analytics view with SECURITY INVOKER
CREATE OR REPLACE VIEW public.bet_analytics
WITH
(security_invoker = true) AS
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

-- Add comments for documentation
COMMENT ON VIEW public.parlay_analytics IS 'Basic parlay analytics with bet statistics (SECURITY INVOKER)';
COMMENT ON VIEW public.parlay_performance IS 'Advanced parlay performance metrics with profitability (SECURITY INVOKER)';
COMMENT ON VIEW public.bet_analytics IS 'Comprehensive bet analytics combining individual bets with parlay information (SECURITY INVOKER)';
