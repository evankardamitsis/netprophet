-- Add leaderboard-related columns to profiles table
-- This migration adds columns to track user performance for leaderboard functionality

-- Add leaderboard points column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS leaderboard_points INTEGER DEFAULT 0;

-- Add current streak column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS current_winning_streak INTEGER DEFAULT 0;

-- Add best streak column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS best_winning_streak INTEGER DEFAULT 0;

-- Add total correct picks column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS total_correct_picks INTEGER DEFAULT 0;

-- Add total picks column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS total_picks INTEGER DEFAULT 0;

-- Add accuracy percentage column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS accuracy_percentage DECIMAL(5,2) DEFAULT 0.00;

-- Add last leaderboard update timestamp
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_leaderboard_update TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for efficient leaderboard queries
CREATE INDEX IF NOT EXISTS idx_profiles_leaderboard_points ON profiles(leaderboard_points DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_current_streak ON profiles(current_winning_streak DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_best_streak ON profiles(best_winning_streak DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_accuracy ON profiles(accuracy_percentage DESC);

-- Add comments for documentation
COMMENT ON COLUMN profiles.leaderboard_points IS 'Total leaderboard points earned from successful predictions';
COMMENT ON COLUMN profiles.current_winning_streak IS 'Current consecutive winning streak';
COMMENT ON COLUMN profiles.best_winning_streak IS 'Best consecutive winning streak achieved';
COMMENT ON COLUMN profiles.total_correct_picks IS 'Total number of correct predictions made';
COMMENT ON COLUMN profiles.total_picks IS 'Total number of predictions made';
COMMENT ON COLUMN profiles.accuracy_percentage IS 'Percentage of correct predictions (0.00 to 100.00)';
COMMENT ON COLUMN profiles.last_leaderboard_update IS 'Timestamp of last leaderboard statistics update';
