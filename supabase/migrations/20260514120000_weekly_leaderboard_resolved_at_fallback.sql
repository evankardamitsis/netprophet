-- Weekly leaderboard: exclude only rows with NULL resolved_at AND NULL updated_at.
-- Legacy won/lost bets often have resolved_at NULL; use updated_at as fallback so
-- they still fall into the correct ISO week when the row was last touched at settlement.

CREATE OR REPLACE FUNCTION get_weekly_leaderboard_stats(week_start_date DATE DEFAULT NULL)
RETURNS TABLE
(
    user_id UUID,
    username TEXT,
    avatar_url TEXT,
    leaderboard_points INTEGER,
    current_winning_streak INTEGER,
    best_winning_streak INTEGER,
    total_correct_picks INTEGER,
    total_picks INTEGER,
    accuracy_percentage DECIMAL(5,2)
) AS $$
DECLARE
    week_start DATE;
    week_end DATE;
BEGIN
    IF week_start_date IS NULL THEN
        week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    ELSE
        week_start := week_start_date;
    END IF;
    week_end := week_start + INTERVAL '6 days';

    RETURN QUERY
    WITH
        weekly_stats AS (
            SELECT
                b.user_id,
                COUNT(*) AS total_picks,
                COUNT(CASE WHEN b.status = 'won' THEN 1 END) AS correct_picks,
                COALESCE(SUM(
                    CASE WHEN b.status = 'won' THEN 10 ELSE 0 END +
                    CASE WHEN b.status = 'won' AND b.multiplier >= 2.0 THEN FLOOR(b.multiplier * 5) ELSE 0 END +
                    CASE
                        WHEN b.status = 'won' AND b.is_parlay = true AND b.parlay_id IS NOT NULL THEN
                            COALESCE((SELECT FLOOR(final_odds * 10) FROM parlays WHERE id = b.parlay_id AND final_odds > 1.0), 0)
                        ELSE 0
                    END
                ), 0) AS weekly_points
            FROM bets b
            WHERE b.status IN ('won', 'lost')
              AND COALESCE(b.resolved_at, b.updated_at) IS NOT NULL
              AND COALESCE(b.resolved_at, b.updated_at) >= week_start
              AND COALESCE(b.resolved_at, b.updated_at) < week_end + INTERVAL '1 day'
            GROUP BY b.user_id
        )
    SELECT
        p.id AS user_id,
        COALESCE(NULLIF(TRIM(p.username), ''), SPLIT_PART(p.email, '@', 1), 'Player')::TEXT AS username,
        p.avatar_url,
        COALESCE(ws.weekly_points::INTEGER, 0) AS leaderboard_points,
        COALESCE(p.current_winning_streak, 0)::INTEGER AS current_winning_streak,
        COALESCE(p.best_winning_streak, 0)::INTEGER AS best_winning_streak,
        COALESCE(ws.correct_picks::INTEGER, 0) AS total_correct_picks,
        COALESCE(ws.total_picks::INTEGER, 0) AS total_picks,
        CASE
            WHEN ws.total_picks > 0 THEN ROUND((ws.correct_picks::DECIMAL / ws.total_picks::DECIMAL) * 100, 2)
            ELSE 0.00
        END AS accuracy_percentage
    FROM weekly_stats ws
    INNER JOIN profiles p ON p.id = ws.user_id
    ORDER BY COALESCE(ws.weekly_points, 0) DESC,
             COALESCE(p.current_winning_streak, 0) DESC,
             CASE
                 WHEN ws.total_picks > 0 THEN ROUND((ws.correct_picks::DECIMAL / ws.total_picks::DECIMAL) * 100, 2)
                 ELSE 0.00
             END DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_weekly_leaderboard_stats(DATE) IS
'Weekly leaderboard from won/lost bets in the ISO week. Uses COALESCE(resolved_at, updated_at) when resolved_at is null.';
