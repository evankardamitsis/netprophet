-- Fix timestamp type in get_top_users_by_spend function

DROP FUNCTION IF EXISTS get_top_users_by_spend(INTEGER);

-- Function to get top users by coin spend
CREATE OR REPLACE FUNCTION get_top_users_by_spend(limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
    user_id UUID,
    username TEXT,
    email TEXT,
    total_spent BIGINT,
    last_top_up TIMESTAMPTZ,
    bets_placed BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.email,
        COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 0)::BIGINT as total_spent,
        MAX(CASE WHEN t.amount > 0 THEN t.created_at END) as last_top_up,
        COUNT(CASE WHEN t.type = 'bet' THEN 1 END)::BIGINT as bets_placed
    FROM profiles p
    LEFT JOIN transactions t ON p.id = t.user_id
    WHERE p.username IS NOT NULL
    GROUP BY p.id, p.username, p.email
    HAVING COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 0) > 0
    ORDER BY total_spent DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
