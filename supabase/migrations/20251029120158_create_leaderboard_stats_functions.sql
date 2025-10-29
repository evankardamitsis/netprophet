-- Create function to get weekly leaderboard statistics
-- This function returns leaderboard data for the current week

CREATE OR REPLACE FUNCTION get_weekly_leaderboard_stats
(week_start_date DATE DEFAULT NULL)
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
    -- If no week_start_date provided, use the start of the current week (Monday)
    IF week_start_date IS NULL THEN
        week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    ELSE
        week_start := week_start_date;
    END IF;
    
    -- Calculate week end (Sunday)
    week_end := week_start + INTERVAL '6 days';

    RETURN QUERY
    WITH
        weekly_stats
        AS
        (
            SELECT
                b.user_id,
                COUNT(*) as total_picks,
                COUNT(CASE WHEN b.status = 'won' THEN 1 END) as correct_picks,
                -- Calculate weekly leaderboard points
                COALESCE(SUM(
                    CASE 
                        WHEN b.status = 'won' THEN 10 -- Base points for winning
                        ELSE 0
                    END +
                    CASE 
                        WHEN b.status = 'won' AND b.multiplier >= 2.0 THEN FLOOR(b.multiplier * 5) -- Bonus for high odds
                        ELSE 0
                    END +
                    CASE 
                        WHEN b.status = 'won' AND b.is_parlay = true AND b.parlay_id IS NOT NULL THEN 
                            COALESCE((SELECT FLOOR(final_odds * 10) FROM parlays WHERE id = b.parlay_id AND final_odds > 1.0), 0) -- Bonus for parlay wins
                        ELSE 0
                    END
                ), 0) as weekly_points
            FROM bets b
            WHERE b.status IN ('won', 'lost')
                AND b.resolved_at >= week_start
                AND b.resolved_at < week_end + INTERVAL '1 day'
            GROUP BY b.user_id
        ),
        user_profiles
        AS
        (
            SELECT
                p.id,
                p.username,
                p.avatar_url,
                p.current_winning_streak,
                p.best_winning_streak
            FROM profiles p
            WHERE p.username IS NOT NULL
        )
    SELECT
        up.id as user_id,
        up.username,
        up.avatar_url,
        COALESCE(ws.weekly_points::INTEGER, 0) as leaderboard_points,
        COALESCE(up.current_winning_streak, 0) as current_winning_streak,
        COALESCE(up.best_winning_streak, 0) as best_winning_streak,
        COALESCE(ws.correct_picks::INTEGER, 0) as total_correct_picks,
        COALESCE(ws.total_picks::INTEGER, 0) as total_picks,
        CASE 
            WHEN ws.total_picks > 0 THEN ROUND((ws.correct_picks::DECIMAL / ws.total_picks::DECIMAL) * 100, 2)
            ELSE 0.00
        END as accuracy_percentage
    FROM user_profiles up
        LEFT JOIN weekly_stats ws ON up.id = ws.user_id
    WHERE ws.user_id IS NOT NULL
    -- Only show users who have made bets this week
    ORDER BY COALESCE(ws.weekly_points, 0) DESC, 
             COALESCE(up.current_winning_streak, 0) DESC, 
             CASE 
                WHEN ws.total_picks > 0 THEN ROUND((ws.correct_picks::DECIMAL / ws.total_picks::DECIMAL) * 100, 2)
                ELSE 0.00
             END DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION get_weekly_leaderboard_stats(DATE) IS 'Get weekly leaderboard statistics calculated from bets resolved during the specified week';

-- Create function to get all-time leaderboard statistics
-- This function returns leaderboard data calculated from all bets

CREATE OR REPLACE FUNCTION get_all_time_leaderboard_stats
()
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
    -- Return all-time stats calculated from all bets
    RETURN QUERY
    WITH
        all_time_stats
        AS
        (
            SELECT
                b.user_id,
                COUNT(*) as total_picks,
                COUNT(CASE WHEN b.status = 'won' THEN 1 END) as correct_picks,
                -- Calculate all-time leaderboard points
                COALESCE(SUM(
                    CASE 
                        WHEN b.status = 'won' THEN 10 -- Base points for winning
                        ELSE 0
                    END +
                    CASE 
                        WHEN b.status = 'won' AND b.multiplier >= 2.0 THEN FLOOR(b.multiplier * 5) -- Bonus for high odds
                        ELSE 0
                    END +
                    CASE 
                        WHEN b.status = 'won' AND b.is_parlay = true AND b.parlay_id IS NOT NULL THEN 
                            COALESCE((SELECT FLOOR(final_odds * 10) FROM parlays WHERE id = b.parlay_id AND final_odds > 1.0), 0) -- Bonus for parlay wins
                        ELSE 0
                    END
                ), 0) as all_time_points
            FROM bets b
            WHERE b.status IN ('won', 'lost')
            GROUP BY b.user_id
        ),
        user_profiles
        AS
        (
            SELECT
                p.id,
                p.username,
                p.avatar_url,
                p.current_winning_streak,
                p.best_winning_streak
            FROM profiles p
            WHERE p.username IS NOT NULL
        )
    SELECT
        up.id as user_id,
        up.username,
        up.avatar_url,
        COALESCE(ats.all_time_points::INTEGER, 0) as leaderboard_points,
        COALESCE(up.current_winning_streak, 0) as current_winning_streak,
        COALESCE(up.best_winning_streak, 0) as best_winning_streak,
        COALESCE(ats.correct_picks::INTEGER, 0) as total_correct_picks,
        COALESCE(ats.total_picks::INTEGER, 0) as total_picks,
        CASE 
            WHEN ats.total_picks > 0 THEN ROUND((ats.correct_picks::DECIMAL / ats.total_picks::DECIMAL) * 100, 2)
            ELSE 0.00
        END as accuracy_percentage
    FROM user_profiles up
        LEFT JOIN all_time_stats ats ON up.id = ats.user_id
    WHERE ats.user_id IS NOT NULL
    -- Only show users who have made bets
    ORDER BY COALESCE(ats.all_time_points, 0) DESC, 
             COALESCE(up.current_winning_streak, 0) DESC, 
             CASE 
                WHEN ats.total_picks > 0 THEN ROUND((ats.correct_picks::DECIMAL / ats.total_picks::DECIMAL) * 100, 2)
                ELSE 0.00
             END DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION get_all_time_leaderboard_stats() IS 'Get all-time leaderboard statistics calculated from all bets';

