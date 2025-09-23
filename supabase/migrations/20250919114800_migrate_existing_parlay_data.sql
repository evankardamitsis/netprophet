-- Migrate existing parlay data from bets table to parlays table
-- This migration moves parlay-specific data to the new dedicated table

-- Insert parlay records from existing parlay bets
INSERT INTO public.parlays (
    id,
    user_id,
    total_stake,
    base_odds,
    final_odds,
    bonus_multiplier,
    streak_booster,
    is_safe_bet,
    safe_bet_cost,
    status,
    outcome,
    total_winnings,
    created_at,
    updated_at,
    resolved_at
)
SELECT DISTINCT
    parlay_id as id,
    user_id,
    bet_amount as total_stake,
    parlay_base_odds as base_odds,
    parlay_final_odds as final_odds,
    parlay_bonus_multiplier as bonus_multiplier,
    parlay_streak_booster as streak_booster,
    is_safe_bet,
    safe_bet_cost,
    status,
    outcome,
    CASE 
        WHEN status = 'won' THEN 
            CASE 
                WHEN is_safe_bet = true AND status = 'lost' THEN 
                    bet_amount -- Return stake for safe bet
                ELSE 
                    ROUND(bet_amount * parlay_final_odds)
            END
        ELSE 0
    END as total_winnings,
    created_at,
    updated_at,
    resolved_at
FROM public.bets
WHERE is_parlay = true 
AND parlay_id IS NOT NULL
AND parlay_position = 1 -- Only take the first bet of each parlay to avoid duplicates
ON CONFLICT (id) DO NOTHING;

-- Update the parlay_id in bets table to reference the new parlays table
-- (This is already correct, but we ensure consistency)
UPDATE public.bets 
SET parlay_id = parlay_id 
WHERE is_parlay = true 
AND parlay_id IS NOT NULL;

-- Create a function to get parlay details with bet information
CREATE OR REPLACE FUNCTION get_parlay_with_bets(parlay_uuid UUID)
RETURNS TABLE (
    parlay_id UUID,
    user_id UUID,
    total_stake INTEGER,
    base_odds DECIMAL(8,4),
    final_odds DECIMAL(8,4),
    bonus_multiplier DECIMAL(5,4),
    streak_booster DECIMAL(5,4),
    is_safe_bet BOOLEAN,
    safe_bet_cost INTEGER,
    status TEXT,
    outcome TEXT,
    total_winnings INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    bet_count INTEGER,
    bet_details JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.total_stake,
        p.base_odds,
        p.final_odds,
        p.bonus_multiplier,
        p.streak_booster,
        p.is_safe_bet,
        p.safe_bet_cost,
        p.status,
        p.outcome,
        p.total_winnings,
        p.created_at,
        p.updated_at,
        p.resolved_at,
        COUNT(b.id)::INTEGER as bet_count,
        COALESCE(
            JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'bet_id', b.id,
                    'match_id', b.match_id,
                    'position', b.parlay_position,
                    'prediction', b.prediction,
                    'description', b.description,
                    'status', b.status,
                    'outcome', b.outcome
                )
            ) FILTER (WHERE b.id IS NOT NULL),
            '[]'::JSONB
        ) as bet_details
    FROM public.parlays p
    LEFT JOIN public.bets b ON b.parlay_id = p.id AND b.is_parlay = true
    WHERE p.id = parlay_uuid
    GROUP BY p.id, p.user_id, p.total_stake, p.base_odds, p.final_odds, 
             p.bonus_multiplier, p.streak_booster, p.is_safe_bet, p.safe_bet_cost,
             p.status, p.outcome, p.total_winnings, p.created_at, p.updated_at, p.resolved_at;
END;
$$ LANGUAGE plpgsql;

-- Create a view for parlay analytics
CREATE OR REPLACE VIEW public.parlay_analytics AS
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

-- Add comment for documentation
COMMENT ON FUNCTION get_parlay_with_bets(UUID) IS 'Get parlay details with all associated bet information';
COMMENT ON VIEW public.parlay_analytics IS 'Analytics view for parlay data with bet statistics';
