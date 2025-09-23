-- Fix the power-up multiplier issue by using a different approach
-- Instead of trying to track new vs old points, we'll store the base points separately

-- Add a column to store base points (without power-up multipliers)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS base_leaderboard_points INTEGER DEFAULT 0;

-- Create a new function that properly handles power-up effects
CREATE OR REPLACE FUNCTION update_user_leaderboard_stats_fixed(user_id_param UUID)
RETURNS VOID AS $$
DECLARE
    user_stats RECORD;
    base_points INTEGER := 0;
    has_streak_multiplier BOOLEAN := false;
    new_current_streak INTEGER := 0;
    new_best_streak INTEGER := 0;
    new_total_correct_picks INTEGER := 0;
    new_total_picks INTEGER := 0;
    new_accuracy_percentage DECIMAL(5,2) := 0.00;
BEGIN
    -- Check if user has active streak multiplier power-up
    SELECT EXISTS(
        SELECT 1 FROM user_power_ups 
        WHERE user_id = user_id_param 
        AND power_up_id = 'streakBoost' 
        AND quantity > 0 
        AND (expires_at IS NULL OR expires_at > NOW())
    ) INTO has_streak_multiplier;

    -- Get user's betting statistics
    SELECT
        COUNT(*) as total_bets,
        COUNT(CASE WHEN status = 'won' THEN 1 END) as won_bets,
        COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost_bets
    INTO user_stats
    FROM bets
    WHERE user_id = user_id_param
        AND status IN ('won', 'lost');

    -- Calculate base points (without any power-up multipliers)
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
            WHEN status = 'won' AND is_parlay = true AND parlay_id IS NOT NULL THEN 
                (SELECT FLOOR(final_odds * 10) FROM parlays WHERE id = parlay_id AND final_odds > 1.0) -- Bonus for parlay wins
            ELSE 0
        END
    ), 0)
    INTO base_points
    FROM bets
    WHERE user_id = user_id_param
        AND status = 'won';

    -- Calculate current streak
    SELECT COALESCE(COUNT(*), 0)
    INTO new_current_streak
    FROM (
        SELECT status
        FROM bets
        WHERE user_id = user_id_param
            AND status IN ('won', 'lost')
        ORDER BY resolved_at DESC
        LIMIT 5
    ) recent_bets
    WHERE status = 'won';

    -- Calculate best streak
    SELECT COALESCE(COUNT(*), 0)
    INTO new_best_streak
    FROM bets 
    WHERE user_id = user_id_param 
    AND status = 'won';

    -- Set calculated values
    new_total_correct_picks := user_stats.won_bets;
    new_total_picks := user_stats.total_bets;

    -- Calculate accuracy percentage
    IF new_total_picks > 0 THEN
        new_accuracy_percentage := ROUND((new_total_correct_picks::DECIMAL / new_total_picks) * 100, 2);
    ELSE
        new_accuracy_percentage := 0.00;
    END IF;

    -- Update user profile with new statistics
    UPDATE profiles 
    SET 
        base_leaderboard_points = base_points, -- Store base points without multiplier
        leaderboard_points = CASE 
            WHEN has_streak_multiplier THEN FLOOR(base_points * 1.5) -- Apply 1.5x multiplier if active
            ELSE base_points -- No multiplier
        END,
        current_winning_streak = new_current_streak,
        best_winning_streak = GREATEST(best_winning_streak, new_best_streak),
        total_correct_picks = new_total_correct_picks,
        total_picks = new_total_picks,
        accuracy_percentage = new_accuracy_percentage,
        last_leaderboard_update = NOW()
    WHERE id = user_id_param;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace the old function with the new one
DROP FUNCTION IF EXISTS update_user_leaderboard_stats(UUID);
CREATE OR REPLACE FUNCTION update_user_leaderboard_stats(user_id_param UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM update_user_leaderboard_stats_fixed(user_id_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON FUNCTION update_user_leaderboard_stats_fixed(UUID) IS 'Update user leaderboard statistics with proper power-up effect handling';
COMMENT ON FUNCTION update_user_leaderboard_stats(UUID) IS 'Wrapper function for update_user_leaderboard_stats_fixed';
