-- Fix the weekly leaderboard function to actually calculate weekly stats
-- The current function just returns all-time stats, not weekly stats

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
    week_end DATE;
BEGIN
    -- If no week_start_date provided, use the start of the current week (Monday)
    IF week_start_date IS NULL THEN
        week_start := DATE_TRUNC
    ('week', CURRENT_DATE)::DATE;
ELSE
        week_start := week_start_date;
END
IF;
    
    -- Calculate week end (Sunday)
    week_end := week_start + INTERVAL '6 days';

-- Return weekly stats calculated from bets in the specified week
RETURN QUERY
WITH
    weekly_bets
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
        WHERE b.resolved_at >= week_start
            AND b.resolved_at <= week_end + INTERVAL
     '1 day' -- Include the entire end day
            AND b.status IN
('won', 'lost')
        GROUP BY b.user_id
    ),
    user_profiles AS
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
    COALESCE(wb.weekly_points, 0) as leaderboard_points,
    COALESCE(up.current_winning_streak, 0) as current_winning_streak,
    COALESCE(up.best_winning_streak, 0) as best_winning_streak,
    COALESCE(wb.correct_picks, 0) as total_correct_picks,
    COALESCE(wb.total_picks, 0) as total_picks,
    CASE 
            WHEN wb.total_picks > 0 THEN ROUND((wb.correct_picks::DECIMAL / wb.total_picks::DECIMAL) * 100, 2)
            ELSE 0.00
        END as accuracy_percentage
FROM user_profiles up
    LEFT JOIN weekly_bets wb ON up.id = wb.user_id
WHERE wb.user_id IS NOT NULL
-- Only show users who had activity this week
ORDER BY COALESCE(wb.weekly_points, 0) DESC, 
             COALESCE(up.current_winning_streak, 0) DESC, 
             CASE 
                WHEN wb.total_picks > 0 THEN ROUND((wb.correct_picks::DECIMAL / wb.total_picks::DECIMAL) * 100, 2)
                ELSE 0.00
             END DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION get_weekly_leaderboard_stats
(DATE) IS 'Get weekly leaderboard statistics calculated from bets in the specified week';
