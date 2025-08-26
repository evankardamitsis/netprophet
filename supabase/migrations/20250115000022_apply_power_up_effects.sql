-- Modify the leaderboard function to apply power-up effects
-- This will check for active streak multiplier power-ups and apply 1.5x multiplier

CREATE OR REPLACE FUNCTION update_user_leaderboard_stats
(user_id_param UUID)
RETURNS VOID AS $$
DECLARE
    user_stats RECORD;
    new_leaderboard_points INTEGER := 0;
    new_current_streak INTEGER := 0;
    new_best_streak INTEGER := 0;
    new_total_correct_picks INTEGER := 0;
    new_total_picks INTEGER := 0;
    new_accuracy_percentage DECIMAL
(5,2) := 0.00;
    has_streak_multiplier BOOLEAN := false;
    current_points INTEGER := 0;
    new_points INTEGER := 0;
BEGIN
    -- Get current leaderboard points
    SELECT COALESCE(leaderboard_points, 0)
    INTO current_points
    FROM profiles
    WHERE id = user_id_param;

    -- Check if user has active streak multiplier power-up
    SELECT EXISTS
    (
        SELECT 1
    FROM user_power_ups
    WHERE user_id = user_id_param
        AND power_up_id = 'streakBoost'
        AND quantity > 0
        AND (expires_at IS NULL OR expires_at > NOW())
    )
    INTO has_streak_multiplier;

-- Get user's betting statistics
SELECT
    COUNT(*) as total_bets,
    COUNT(CASE WHEN status = 'won' THEN 1 END) as won_bets,
    COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost_bets
INTO user_stats
FROM bets
WHERE user_id = user_id_param
    AND status IN ('won', 'lost');

-- Calculate new points earned (only recent wins that haven't been counted yet)
SELECT COALESCE(SUM(
        CASE 
            WHEN status = 'won' THEN 10 -- Base points for winning
            ELSE 0
        END +
        CASE 
            WHEN status = 'won' AND multiplier >= 2.0 THEN FLOOR(multiplier * 5) -- Bonus for high odds
            ELSE 0
        END +
        CASE 
            WHEN status = 'won' AND is_parlay = true AND parlay_final_odds > 1.0 THEN FLOOR(parlay_final_odds * 10) -- Bonus for parlay wins
            ELSE 0
        END
    ), 0)
INTO new_points
FROM bets
WHERE user_id = user_id_param
    AND status = 'won'
    AND resolved_at > COALESCE((SELECT last_leaderboard_update FROM profiles WHERE id = user_id_param), '1970-01-01'
::timestamp);

-- Apply streak multiplier power-up effect only to new points if active
IF has_streak_multiplier THEN
        new_points := FLOOR
(new_points * 1.5);
END
IF;

-- Calculate total points (current + new)
new_leaderboard_points := current_points + new_points;

-- Calculate current streak (simplified - just count recent wins)
SELECT COALESCE(COUNT(*), 0)
INTO new_current_streak
FROM (
        SELECT status
    FROM bets
    WHERE user_id = user_id_param
        AND status IN ('won', 'lost')
    ORDER BY resolved_at DESC
        LIMIT 5  -- Check last 5 bets for current streak
    ) recent_bets
    WHERE status = 'won';

    -- Calculate best streak (simplified - just total wins for now)
    SELECT COALESCE(COUNT
(*), 0)
    INTO new_best_streak
    FROM bets 
    WHERE user_id = user_id_param 
    AND status = 'won';

    -- Set calculated values
    new_total_correct_picks := user_stats.won_bets;
    new_total_picks := user_stats.total_bets;

-- Calculate accuracy percentage
IF new_total_picks > 0 THEN
        new_accuracy_percentage := ROUND
((new_total_correct_picks::DECIMAL / new_total_picks) * 100, 2);
    ELSE
        new_accuracy_percentage := 0.00;
END
IF;

    -- Update user profile with new statistics
    UPDATE profiles 
    SET 
        leaderboard_points = new_leaderboard_points,
        current_winning_streak = new_current_streak,
        best_winning_streak = GREATEST(best_winning_streak, new_best_streak), -- Keep the best streak ever achieved
        total_correct_picks = new_total_correct_picks,
        total_picks = new_total_picks,
        accuracy_percentage = new_accuracy_percentage,
        last_leaderboard_update = NOW()
    WHERE id = user_id_param;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON FUNCTION update_user_leaderboard_stats
(UUID) IS 'Update user leaderboard statistics based on their betting history with power-up effects applied';
