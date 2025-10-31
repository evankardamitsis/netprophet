-- Add Average Consecutive Logins per User metric function
-- This calculates the average of each user's maximum consecutive login streak
-- Only counts users who have claimed at least one daily reward within the selected time period

CREATE OR REPLACE FUNCTION get_average_consecutive_logins
(time_period TEXT DEFAULT 'month')
RETURNS TABLE
(
    average_consecutive_logins NUMERIC,
    previous_period_average NUMERIC,
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
        WHEN 'all' THEN
            current_period_start := '1970-01-01'::TIMESTAMP;
            current_period_end := NOW
();
            previous_period_start := '1970-01-01'::TIMESTAMP;
            previous_period_end := NOW
();
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
    current_period_user_streaks
    AS
    (
        SELECT
            user_id,
            MAX(streak_count) as max_streak
        FROM daily_rewards
        WHERE created_at >= current_period_start
            AND created_at <= current_period_end
        GROUP BY user_id
    ),
    current_period_avg
    AS
    (
        SELECT
            COALESCE(AVG(max_streak), 0) as avg_streak
        FROM current_period_user_streaks
    ),
    previous_period_user_streaks
    AS
    (
        SELECT
            user_id,
            MAX(streak_count) as max_streak
        FROM daily_rewards
        WHERE created_at >= previous_period_start
            AND created_at < previous_period_end
        GROUP BY user_id
    ),
    previous_period_avg
    AS
    (
        SELECT
            COALESCE(AVG(max_streak), 0) as avg_streak
        FROM previous_period_user_streaks
    )
SELECT
    cp.avg_streak,
    pp.avg_streak,
    CASE 
            WHEN time_period = 'all' THEN 0
            WHEN pp.avg_streak = 0 THEN 
                CASE WHEN cp.avg_streak > 0 THEN 100.0 ELSE 0.0 END
            ELSE 
                ((cp.avg_streak - pp.avg_streak) / pp.avg_streak) * 100
        END
FROM current_period_avg cp, previous_period_avg pp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

