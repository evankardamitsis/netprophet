-- Follow-up to 20260514120000: default "weekly" window is last 7 days UTC (not only Mon–Sun
-- current ISO week), so the leaderboard is not empty when activity was recent but before
-- Monday 00:00. Optional week_start_date still anchors a 7-day window from that Monday UTC.
-- Keeps COALESCE(resolved_at, updated_at). Adds explicit EXECUTE grants for PostgREST RPC.

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
    period_start TIMESTAMPTZ;
    period_end   TIMESTAMPTZ;
BEGIN
    IF week_start_date IS NULL THEN
        period_end := timezone('utc', now());
        period_start := period_end - INTERVAL '7 days';
    ELSE
        period_start := (week_start_date::timestamp AT TIME ZONE 'UTC');
        period_end := period_start + INTERVAL '7 days';
    END IF;

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
              AND COALESCE(b.resolved_at, b.updated_at) >= period_start
              AND COALESCE(b.resolved_at, b.updated_at) <= period_end
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
'Leaderboard for settled bets (won/lost): default = last 7 days UTC; optional week_start_date = that Monday UTC for a fixed 7d window. Uses COALESCE(resolved_at, updated_at).';

GRANT EXECUTE ON FUNCTION get_weekly_leaderboard_stats(DATE) TO anon;
GRANT EXECUTE ON FUNCTION get_weekly_leaderboard_stats(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_leaderboard_stats(DATE) TO service_role;
