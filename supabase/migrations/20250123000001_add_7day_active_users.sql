-- Add 7-Day Active Users (7DAU) metric function
-- This counts unique users who logged in at least once in the past 7 days
-- Uses auth.users.last_sign_in_at to track login activity

CREATE OR REPLACE FUNCTION get_7day_active_users_count
()
RETURNS TABLE
(
    seven_day_active_users_count BIGINT,
    previous_period_count BIGINT,
    percentage_change NUMERIC
) AS $$
DECLARE
    current_period_start TIMESTAMP;
    current_period_end TIMESTAMP;
    previous_period_start TIMESTAMP;
    previous_period_end TIMESTAMP;
BEGIN
    -- Current period: last 7 days
    current_period_start := NOW
() - INTERVAL '7 days';
    current_period_end := NOW
();
    
    -- Previous period: 7 days before that (days 8-14)
    previous_period_start := NOW
() - INTERVAL '14 days';
    previous_period_end := NOW
() - INTERVAL '7 days';

RETURN QUERY
WITH
    current_period
    AS
    (
        SELECT COUNT(DISTINCT id)
    
    
    ::BIGINT as count
        FROM auth.users
        WHERE last_sign_in_at IS NOT NULL
        AND last_sign_in_at >= current_period_start 
        AND last_sign_in_at <= current_period_end
    ),
    previous_period AS
(
        SELECT COUNT(DISTINCT id)
::BIGINT as count
        FROM auth.users
        WHERE last_sign_in_at IS NOT NULL
        AND last_sign_in_at >= previous_period_start 
        AND last_sign_in_at < previous_period_end
    )
SELECT
    cp.count,
    pp.count,
    CASE 
            WHEN pp.count = 0 THEN 
                CASE WHEN cp.count > 0 THEN 100.0 ELSE 0.0 END
            ELSE 
                ((cp.count - pp.count) / pp.count::NUMERIC) * 100
        END
FROM current_period cp, previous_period pp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

