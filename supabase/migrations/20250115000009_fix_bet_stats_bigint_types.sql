-- Fix data type mismatch in bet stats function
-- Change INTEGER to BIGINT to match PostgreSQL COUNT() and SUM() return types
-- Drop the existing function first since we can't change return types

DROP FUNCTION IF EXISTS get_user_bet_stats
(UUID);

CREATE OR REPLACE FUNCTION get_user_bet_stats
(user_uuid UUID)
RETURNS TABLE
(
    user_id UUID,
    total_bets BIGINT,
    won_bets BIGINT,
    lost_bets BIGINT,
    active_bets BIGINT,
    total_bet_amount BIGINT,
    total_winnings BIGINT,
    total_losses BIGINT,
    win_rate DECIMAL
(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        user_uuid as user_id,
        COALESCE(COUNT(*), 0) as total_bets,
        COALESCE(COUNT(CASE WHEN status = 'won' THEN 1 END), 0) as won_bets,
        COALESCE(COUNT(CASE WHEN status = 'lost' THEN 1 END), 0) as lost_bets,
        COALESCE(COUNT(CASE WHEN status = 'active' THEN 1 END), 0) as active_bets,
        COALESCE(SUM(bet_amount), 0) as total_bet_amount,
        COALESCE(SUM(CASE WHEN status = 'won' THEN winnings_paid ELSE 0 END), 0) as total_winnings,
        COALESCE(SUM(CASE WHEN status = 'lost' THEN bet_amount ELSE 0 END), 0) as total_losses,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(CASE WHEN status = 'won' THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2
    )
            ELSE 0.00
END
as win_rate
    FROM public.bets
    WHERE bets.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_bet_stats
(UUID) TO authenticated;
