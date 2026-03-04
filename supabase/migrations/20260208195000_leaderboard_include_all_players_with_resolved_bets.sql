-- Include all players with resolved bets on the leaderboard, not just those with a username set
-- Use email local part or 'Player' as fallback when username is null

CREATE OR REPLACE FUNCTION get_all_time_leaderboard_stats()
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
BEGIN
    RETURN QUERY
    WITH
        all_time_stats
        AS (
            SELECT
                b.user_id,
                COUNT(*) as total_picks,
                COUNT(CASE WHEN b.status = 'won' THEN 1 END) as correct_picks,
                COALESCE(SUM(
                    CASE WHEN b.status = 'won' THEN 10 ELSE 0 END +
                    CASE WHEN b.status = 'won' AND b.multiplier >= 2.0 THEN FLOOR(b.multiplier * 5) ELSE 0 END +
                    CASE
                        WHEN b.status = 'won' AND b.is_parlay = true AND b.parlay_id IS NOT NULL THEN
                            COALESCE((SELECT FLOOR(final_odds * 10) FROM parlays WHERE id = b.parlay_id AND final_odds > 1.0), 0)
                        ELSE 0
                    END
                ), 0) as all_time_points
            FROM bets b
            WHERE b.status IN ('won', 'lost')
            GROUP BY b.user_id
        ),
        user_streaks
        AS (
            SELECT
                ats.user_id,
                (s.current_streak)::INTEGER as current_winning_streak,
                (s.best_streak)::INTEGER as best_winning_streak
            FROM all_time_stats ats
            CROSS JOIN LATERAL compute_user_streaks_from_bets(ats.user_id) s
        )
    SELECT
        p.id as user_id,
        COALESCE(NULLIF(TRIM(p.username), ''), SPLIT_PART(p.email, '@', 1), 'Player')::TEXT as username,
        p.avatar_url,
        COALESCE(ats.all_time_points::INTEGER, 0) as leaderboard_points,
        COALESCE(us.current_winning_streak, 0) as current_winning_streak,
        COALESCE(us.best_winning_streak, 0) as best_winning_streak,
        COALESCE(ats.correct_picks::INTEGER, 0) as total_correct_picks,
        COALESCE(ats.total_picks::INTEGER, 0) as total_picks,
        CASE
            WHEN ats.total_picks > 0 THEN ROUND((ats.correct_picks::DECIMAL / ats.total_picks::DECIMAL) * 100, 2)
            ELSE 0.00
        END as accuracy_percentage
    FROM all_time_stats ats
    INNER JOIN profiles p ON p.id = ats.user_id
    LEFT JOIN user_streaks us ON us.user_id = ats.user_id
    ORDER BY COALESCE(ats.all_time_points, 0) DESC,
             COALESCE(us.current_winning_streak, 0) DESC,
             CASE
                 WHEN ats.total_picks > 0 THEN ROUND((ats.correct_picks::DECIMAL / ats.total_picks::DECIMAL) * 100, 2)
                 ELSE 0.00
             END DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_all_time_leaderboard_stats() IS 'Get all-time leaderboard for all players with at least one resolved bet (won or lost)';

-- Also fix weekly leaderboard to include all players with resolved bets this week (not just those with username)
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
        weekly_stats
        AS (
            SELECT
                b.user_id,
                COUNT(*) as total_picks,
                COUNT(CASE WHEN b.status = 'won' THEN 1 END) as correct_picks,
                COALESCE(SUM(
                    CASE WHEN b.status = 'won' THEN 10 ELSE 0 END +
                    CASE WHEN b.status = 'won' AND b.multiplier >= 2.0 THEN FLOOR(b.multiplier * 5) ELSE 0 END +
                    CASE
                        WHEN b.status = 'won' AND b.is_parlay = true AND b.parlay_id IS NOT NULL THEN
                            COALESCE((SELECT FLOOR(final_odds * 10) FROM parlays WHERE id = b.parlay_id AND final_odds > 1.0), 0)
                        ELSE 0
                    END
                ), 0) as weekly_points
            FROM bets b
            WHERE b.status IN ('won', 'lost')
                AND b.resolved_at >= week_start
                AND b.resolved_at < week_end + INTERVAL '1 day'
            GROUP BY b.user_id
        )
    SELECT
        p.id as user_id,
        COALESCE(NULLIF(TRIM(p.username), ''), SPLIT_PART(p.email, '@', 1), 'Player')::TEXT as username,
        p.avatar_url,
        COALESCE(ws.weekly_points::INTEGER, 0) as leaderboard_points,
        COALESCE(p.current_winning_streak, 0)::INTEGER as current_winning_streak,
        COALESCE(p.best_winning_streak, 0)::INTEGER as best_winning_streak,
        COALESCE(ws.correct_picks::INTEGER, 0) as total_correct_picks,
        COALESCE(ws.total_picks::INTEGER, 0) as total_picks,
        CASE
            WHEN ws.total_picks > 0 THEN ROUND((ws.correct_picks::DECIMAL / ws.total_picks::DECIMAL) * 100, 2)
            ELSE 0.00
        END as accuracy_percentage
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

COMMENT ON FUNCTION get_weekly_leaderboard_stats(DATE) IS 'Get weekly leaderboard for all players with at least one resolved bet in the week';
