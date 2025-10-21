-- Fix SECURITY DEFINER views by recreating them with SECURITY INVOKER
-- This addresses the Supabase security warnings

-- Drop existing views
DROP VIEW IF EXISTS public.bet_stats;
DROP VIEW IF EXISTS public.parlay_stats;
DROP VIEW IF EXISTS public.safe_bet_token_stats;

-- Recreate bet_stats view with SECURITY INVOKER
CREATE OR REPLACE VIEW public.bet_stats
WITH
(security_invoker = true) AS
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
            ROUND((COUNT(CASE WHEN status = 'won' THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2
)
        ELSE 0
END as win_rate
FROM public.bets
GROUP BY user_id;

-- Recreate parlay_stats view with SECURITY INVOKER (updated for new parlay structure)
CREATE OR REPLACE VIEW public.parlay_stats
WITH
(security_invoker = true) AS
SELECT
    p.user_id,
    COUNT(*) as total_parlays,
    COUNT(CASE WHEN p.status = 'won' THEN 1 END) as won_parlays,
    COUNT(CASE WHEN p.status = 'lost' THEN 1 END) as lost_parlays,
    COUNT(CASE WHEN p.status = 'active' THEN 1 END) as active_parlays,
    AVG(bet_count) as avg_parlay_picks,
    MAX(bet_count) as max_parlay_picks,
    SUM(CASE WHEN p.status = 'won' THEN p.total_winnings ELSE 0 END) as total_parlay_winnings,
    SUM(CASE WHEN p.status = 'lost' THEN p.total_stake ELSE 0 END) as total_parlay_losses,
    CASE 
        WHEN COUNT(*) > 0 THEN 
            ROUND((COUNT(CASE WHEN p.status = 'won' THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2
)
        ELSE 0
END as parlay_win_rate
FROM public.parlays p
LEFT JOIN
(
    SELECT parlay_id, COUNT(*) as bet_count
FROM public.bets
WHERE is_parlay = true
GROUP BY parlay_id
)
b ON p.id = b.parlay_id
GROUP BY p.user_id;

-- Recreate safe_bet_token_stats view with SECURITY INVOKER
CREATE OR REPLACE VIEW public.safe_bet_token_stats
WITH
(security_invoker = true) AS
SELECT
    id as user_id,
    safe_bet_tokens,
    CASE 
        WHEN safe_bet_tokens = 0 THEN 'No tokens'
        WHEN safe_bet_tokens <= 2 THEN 'Low tokens'
        WHEN safe_bet_tokens <= 5 THEN 'Medium tokens'
        ELSE 'High tokens'
    END as token_status
FROM public.profiles
WHERE safe_bet_tokens IS NOT NULL;

-- Grant appropriate permissions
GRANT SELECT ON public.bet_stats TO authenticated;
GRANT SELECT ON public.parlay_stats TO authenticated;
GRANT SELECT ON public.safe_bet_token_stats TO authenticated; 