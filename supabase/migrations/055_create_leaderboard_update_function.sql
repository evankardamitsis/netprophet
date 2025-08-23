-- Create function to update user leaderboard statistics
-- This function will be called when bets are resolved to update user performance metrics

CREATE OR REPLACE FUNCTION update_user_leaderboard_stats(user_id_param UUID)
RETURNS VOID AS $$
DECLARE
    user_stats RECORD;
    new_leaderboard_points INTEGER := 0;
    new_current_streak INTEGER := 0;
    new_best_streak INTEGER := 0;
    new_total_correct_picks INTEGER := 0;
    new_total_picks INTEGER := 0;
    new_accuracy_percentage DECIMAL(5,2) := 0.00;
BEGIN
    -- Get user's betting statistics
    SELECT 
        COUNT(*) as total_bets,
        COUNT(CASE WHEN status = 'won' THEN 1 END) as won_bets,
        COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost_bets
    INTO user_stats
    FROM bets 
    WHERE user_id = user_id_param 
    AND status IN ('won', 'lost');

    -- Calculate leaderboard points
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
    INTO new_leaderboard_points
    FROM bets 
    WHERE user_id = user_id_param 
    AND status = 'won';

    -- Calculate current streak (simplified approach)
    WITH recent_bets AS (
        SELECT status, resolved_at
        FROM bets 
        WHERE user_id = user_id_param 
        AND status IN ('won', 'lost')
        ORDER BY resolved_at DESC
    )
    SELECT COALESCE(COUNT(*), 0)
    INTO new_current_streak
    FROM (
        SELECT status
        FROM recent_bets
        WHERE status = 'won'
        LIMIT 1
    ) consecutive_wins;

    -- Calculate best streak (simplified approach)
    WITH chronological_bets AS (
        SELECT status, resolved_at
        FROM bets 
        WHERE user_id = user_id_param 
        AND status IN ('won', 'lost')
        ORDER BY resolved_at ASC
    )
    SELECT COALESCE(MAX(streak_length), 0)
    INTO new_best_streak
    FROM (
        SELECT 
            COUNT(*) as streak_length
        FROM chronological_bets
        WHERE status = 'won'
        GROUP BY status
    ) streak_groups;

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

-- Create trigger to automatically update leaderboard stats when bets are resolved
CREATE OR REPLACE FUNCTION trigger_update_leaderboard_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update leaderboard stats when bet status changes to 'won' or 'lost'
    IF (NEW.status IN ('won', 'lost') AND OLD.status NOT IN ('won', 'lost')) OR
       (NEW.status IN ('won', 'lost') AND OLD.status IN ('won', 'lost') AND NEW.resolved_at != OLD.resolved_at) THEN
        PERFORM update_user_leaderboard_stats(NEW.user_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS update_leaderboard_stats_trigger ON bets;
CREATE TRIGGER update_leaderboard_stats_trigger
    AFTER UPDATE ON bets
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_leaderboard_stats();

-- Add comments for documentation
COMMENT ON FUNCTION update_user_leaderboard_stats(UUID) IS 'Update user leaderboard statistics based on their betting history';
COMMENT ON FUNCTION trigger_update_leaderboard_stats() IS 'Trigger function to automatically update leaderboard stats when bets are resolved';
