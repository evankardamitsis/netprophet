-- Fix get_all_time_leaderboard_stats to calculate streaks from bets directly
-- instead of from profiles, ensuring consistency (e.g. best_streak cannot exceed total_correct_picks)

-- Helper function to compute current and best streak for a user from their bets
CREATE OR REPLACE FUNCTION compute_user_streaks_from_bets(p_user_id UUID)
RETURNS TABLE(current_streak INTEGER, best_streak INTEGER) AS $$
DECLARE
    r RECORD;
    cur_streak INTEGER := 0;
    best_val INTEGER := 0;
    run INTEGER := 0;
BEGIN
    -- Current streak: consecutive wins from most recent bet going backwards
    FOR r IN
        SELECT status
        FROM bets
        WHERE user_id = p_user_id AND status IN ('won', 'lost')
        ORDER BY resolved_at DESC
    LOOP
        IF r.status = 'won' THEN
            cur_streak := cur_streak + 1;
        ELSE
            EXIT;
        END IF;
    END LOOP;

    -- Best streak: longest consecutive winning streak ever
    FOR r IN
        SELECT status
        FROM bets
        WHERE user_id = p_user_id AND status IN ('won', 'lost')
        ORDER BY resolved_at ASC
    LOOP
        IF r.status = 'won' THEN
            run := run + 1;
            best_val := GREATEST(best_val, run);
        ELSE
            run := 0;
        END IF;
    END LOOP;

    current_streak := cur_streak;
    best_streak := best_val;
    RETURN NEXT;
    RETURN;
END;
$$ LANGUAGE plpgsql STABLE;

-- Update get_all_time_leaderboard_stats to compute streaks from bets
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
        user_profiles
        AS (
            SELECT
                p.id,
                p.username,
                p.avatar_url
            FROM profiles p
            WHERE p.username IS NOT NULL
        ),
        -- Compute streaks from bets for each user with bets
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
        up.id as user_id,
        up.username,
        up.avatar_url,
        COALESCE(ats.all_time_points::INTEGER, 0) as leaderboard_points,
        COALESCE(us.current_winning_streak, 0) as current_winning_streak,
        COALESCE(us.best_winning_streak, 0) as best_winning_streak,
        COALESCE(ats.correct_picks::INTEGER, 0) as total_correct_picks,
        COALESCE(ats.total_picks::INTEGER, 0) as total_picks,
        CASE
            WHEN ats.total_picks > 0 THEN ROUND((ats.correct_picks::DECIMAL / ats.total_picks::DECIMAL) * 100, 2)
            ELSE 0.00
        END as accuracy_percentage
    FROM user_profiles up
    INNER JOIN all_time_stats ats ON up.id = ats.user_id
    LEFT JOIN user_streaks us ON up.id = us.user_id
    WHERE ats.user_id IS NOT NULL
    ORDER BY COALESCE(ats.all_time_points, 0) DESC,
             COALESCE(us.current_winning_streak, 0) DESC,
             CASE
                 WHEN ats.total_picks > 0 THEN ROUND((ats.correct_picks::DECIMAL / ats.total_picks::DECIMAL) * 100, 2)
                 ELSE 0.00
             END DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_all_time_leaderboard_stats() IS 'Get all-time leaderboard statistics calculated from bets (including streaks)';
COMMENT ON FUNCTION compute_user_streaks_from_bets(UUID) IS 'Compute current and best winning streak for a user from their bet history';
