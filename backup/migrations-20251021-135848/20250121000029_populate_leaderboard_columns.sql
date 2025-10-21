-- Populate leaderboard columns with actual data from bets
-- This migration calculates and updates leaderboard statistics for all users

-- Create a function to update leaderboard stats for a user
CREATE OR REPLACE FUNCTION populate_user_leaderboard_stats(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
    user_stats RECORD;
    user_total_picks INTEGER;
    user_correct_picks INTEGER;
    user_current_streak INTEGER;
    user_best_streak INTEGER;
    user_leaderboard_points INTEGER;
    user_accuracy DECIMAL(5,2);
BEGIN
    -- Get user's bet statistics
    SELECT 
        COUNT(*) as total_bets,
        COUNT(CASE WHEN status = 'won' THEN 1 END) as won_bets,
        COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost_bets
    INTO user_stats
    FROM bets 
    WHERE user_id = user_uuid AND status IN ('won', 'lost');

    user_total_picks := COALESCE(user_stats.total_bets, 0);
    user_correct_picks := COALESCE(user_stats.won_bets, 0);
    
    -- Calculate accuracy percentage
    IF user_total_picks > 0 THEN
        user_accuracy := ROUND((user_correct_picks::DECIMAL / user_total_picks::DECIMAL) * 100, 2);
    ELSE
        user_accuracy := 0.00;
    END IF;

    -- Calculate current streak (consecutive wins from most recent bets)
    WITH recent_bets AS (
        SELECT status, created_at
        FROM bets 
        WHERE user_id = user_uuid AND status IN ('won', 'lost')
        ORDER BY created_at DESC
    ),
    streak_calculation AS (
        SELECT 
            CASE 
                WHEN status = 'won' THEN 
                    ROW_NUMBER() OVER (ORDER BY created_at DESC) - 1
                ELSE 0
            END as streak
        FROM recent_bets
        WHERE status = 'won'
        LIMIT 1
    )
    SELECT COALESCE(MAX(streak), 0) INTO user_current_streak FROM streak_calculation;

    -- Calculate best streak (this is a simplified version - in production you'd want a more sophisticated algorithm)
    WITH all_streaks AS (
        SELECT 
            status,
            ROW_NUMBER() OVER (ORDER BY created_at) as rn,
            ROW_NUMBER() OVER (PARTITION BY status ORDER BY created_at) as status_rn
        FROM bets 
        WHERE user_id = user_uuid AND status IN ('won', 'lost')
        ORDER BY created_at
    ),
    streak_groups AS (
        SELECT 
            status,
            (rn - status_rn) as streak_group
        FROM all_streaks
    ),
    streak_lengths AS (
        SELECT 
            streak_group,
            COUNT(*) as length
        FROM streak_groups 
        WHERE status = 'won'
        GROUP BY streak_group
    )
    SELECT COALESCE(MAX(length), 0) INTO user_best_streak FROM streak_lengths;

    -- Calculate leaderboard points (simplified calculation)
    -- Base points: 10 points per correct pick
    -- Bonus points: 5 points per correct pick with odds >= 2.0
    SELECT 
        COALESCE(SUM(
            CASE 
                WHEN b.status = 'won' THEN 
                    10 + CASE WHEN b.multiplier >= 2.0 THEN 5 ELSE 0 END
                ELSE 0
            END
        ), 0)
    INTO user_leaderboard_points
    FROM bets b
    WHERE b.user_id = user_uuid AND b.status = 'won';

    -- Update the user's profile with calculated stats
    UPDATE profiles 
    SET 
        total_picks = user_total_picks,
        total_correct_picks = user_correct_picks,
        accuracy_percentage = user_accuracy,
        current_winning_streak = user_current_streak,
        best_winning_streak = user_best_streak,
        leaderboard_points = user_leaderboard_points,
        last_leaderboard_update = NOW()
    WHERE profiles.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update leaderboard stats for all users
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN 
        SELECT id FROM profiles 
        WHERE id IS NOT NULL
    LOOP
        PERFORM populate_user_leaderboard_stats(user_record.id);
    END LOOP;
END $$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION populate_user_leaderboard_stats(UUID) TO service_role;
