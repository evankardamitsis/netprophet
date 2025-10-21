-- Fix paying users definition to only count actual money purchases

DROP FUNCTION IF EXISTS get_paying_users_count
(TEXT);

-- Function to get paying users count (only users who made actual purchases)
CREATE OR REPLACE FUNCTION get_paying_users_count
(time_period TEXT DEFAULT 'month')
RETURNS TABLE
(
    paying_users_count BIGINT,
    previous_period_count BIGINT,
    percentage_change NUMERIC
) AS $$
DECLARE
    current_period_start TIMESTAMP;
    current_period_end TIMESTAMP;
    previous_period_start TIMESTAMP;
    previous_period_end TIMESTAMP;
BEGIN
    -- Set time periods based on parameter
    CASE time_period
        WHEN 'day' THEN
            current_period_start := DATE_TRUNC
    ('day', NOW
    ());
current_period_end := NOW
();
            previous_period_start := DATE_TRUNC
('day', NOW
() - INTERVAL '1 day');
            previous_period_end := current_period_start;
        WHEN 'week' THEN
            current_period_start := DATE_TRUNC
('week', NOW
());
            current_period_end := NOW
();
            previous_period_start := DATE_TRUNC
('week', NOW
() - INTERVAL '1 week');
            previous_period_end := current_period_start;
        WHEN 'month' THEN
            current_period_start := DATE_TRUNC
('month', NOW
());
            current_period_end := NOW
();
            previous_period_start := DATE_TRUNC
('month', NOW
() - INTERVAL '1 month');
            previous_period_end := current_period_start;
        WHEN 'quarter' THEN
            current_period_start := DATE_TRUNC
('quarter', NOW
());
            current_period_end := NOW
();
            previous_period_start := DATE_TRUNC
('quarter', NOW
() - INTERVAL '3 months');
            previous_period_end := current_period_start;
        ELSE
            current_period_start := DATE_TRUNC
('month', NOW
());
            current_period_end := NOW
();
            previous_period_start := DATE_TRUNC
('month', NOW
() - INTERVAL '1 month');
            previous_period_end := current_period_start;
END CASE;

RETURN QUERY
WITH
    current_period
    AS
    (
        SELECT COUNT(DISTINCT user_id) as count
        FROM transactions
        WHERE type = 'purchase'
            AND created_at >= current_period_start
            AND created_at <= current_period_end
    ),
    previous_period
    AS
    (
        SELECT COUNT(DISTINCT user_id) as count
        FROM transactions
        WHERE type = 'purchase'
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
