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
    accuracy_percentage DECIMAL
(5,2)
) AS $$
DECLARE
    week_start DATE;
BEGIN
    -- If no week_start_date provided, use the start of the current week (Monday)
    IF week_start_date IS NULL THEN
        week_start := DATE_TRUNC
    ('week', CURRENT_DATE)::DATE;
ELSE
        week_start := week_start_date;
END
IF;

    RETURN QUERY
SELECT
    p.id as user_id,
    p.username,
    p.avatar_url,
    COALESCE(p.leaderboard_points, 0) as leaderboard_points,
    COALESCE(p.current_winning_streak, 0) as current_winning_streak,
    COALESCE(p.best_winning_streak, 0) as best_winning_streak,
    COALESCE(p.total_correct_picks, 0) as total_correct_picks,
    COALESCE(p.total_picks, 0) as total_picks,
    COALESCE(p.accuracy_percentage, 0.00) as accuracy_percentage
FROM profiles p
WHERE p.username IS NOT NULL
    AND p.total_picks > 0
ORDER BY p.leaderboard_points DESC, p.current_winning_streak DESC, p.accuracy_percentage DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION get_weekly_leaderboard_stats
(DATE) IS 'Get weekly leaderboard statistics for all users';
