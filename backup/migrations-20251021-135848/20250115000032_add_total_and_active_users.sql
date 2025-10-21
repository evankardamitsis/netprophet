-- Add total users and active users functions

-- Function to get total users count
CREATE OR REPLACE FUNCTION get_total_users_count()
RETURNS TABLE(
    total_users_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT COUNT(*)::BIGINT as total_users_count
    FROM profiles;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active users count (users who placed predictions in last 14 days)
CREATE OR REPLACE FUNCTION get_active_users_count()
RETURNS TABLE(
    active_users_count BIGINT,
    previous_period_count BIGINT,
    percentage_change NUMERIC
) AS $$
DECLARE
    current_period_start TIMESTAMP;
    current_period_end TIMESTAMP;
    previous_period_start TIMESTAMP;
    previous_period_end TIMESTAMP;
BEGIN
    -- Current period: last 14 days
    current_period_start := NOW() - INTERVAL '14 days';
    current_period_end := NOW();
    
    -- Previous period: 14 days before that
    previous_period_start := NOW() - INTERVAL '28 days';
    previous_period_end := NOW() - INTERVAL '14 days';

    RETURN QUERY
    WITH current_period AS (
        SELECT COUNT(DISTINCT user_id) as count
        FROM transactions
        WHERE type = 'bet' 
        AND created_at >= current_period_start 
        AND created_at <= current_period_end
    ),
    previous_period AS (
        SELECT COUNT(DISTINCT user_id) as count
        FROM transactions
        WHERE type = 'bet' 
        AND created_at >= previous_period_start 
        AND created_at < previous_period_end
    )
    SELECT 
        cp.count::BIGINT,
        pp.count::BIGINT,
        CASE 
            WHEN pp.count = 0 THEN 
                CASE WHEN cp.count > 0 THEN 100.0 ELSE 0.0 END
            ELSE 
                ((cp.count - pp.count) / pp.count::NUMERIC) * 100
        END
    FROM current_period cp, previous_period pp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
