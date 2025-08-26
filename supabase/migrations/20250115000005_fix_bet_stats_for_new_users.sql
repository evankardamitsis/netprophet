-- Fix bet stats for new users who have no bets yet
-- Create a function that returns default stats for users with no bets

CREATE OR REPLACE FUNCTION get_user_bet_stats
(user_uuid UUID)
RETURNS TABLE
(
    user_id UUID,
    total_bets INTEGER,
    won_bets INTEGER,
    lost_bets INTEGER,
    active_bets INTEGER,
    total_bet_amount INTEGER,
    total_winnings INTEGER,
    total_losses INTEGER,
    win_rate DECIMAL
(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(bs.user_id, user_uuid) as user_id,
        COALESCE(bs.total_bets, 0) as total_bets,
        COALESCE(bs.won_bets, 0) as won_bets,
        COALESCE(bs.lost_bets, 0) as lost_bets,
        COALESCE(bs.active_bets, 0) as active_bets,
        COALESCE(bs.total_bet_amount, 0) as total_bet_amount,
        COALESCE(bs.total_winnings, 0) as total_winnings,
        COALESCE(bs.total_losses, 0) as total_losses,
        COALESCE(bs.win_rate, 0.00) as win_rate
    FROM (
        SELECT *
        FROM bet_stats
        WHERE user_id = user_uuid
    ) bs
        RIGHT JOIN (SELECT user_uuid as user_id) u ON true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_bet_stats
(UUID) TO authenticated;
