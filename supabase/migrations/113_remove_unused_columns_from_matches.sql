-- Remove unused columns from matches table
-- These columns are either always NULL or not used in the application

-- Drop columns that are always NULL or unused
ALTER TABLE matches 
DROP COLUMN IF EXISTS player_a,
DROP COLUMN IF EXISTS player_b,
DROP COLUMN IF EXISTS a_score,
DROP COLUMN IF EXISTS b_score,
DROP COLUMN IF EXISTS played_at,
DROP COLUMN IF EXISTS prob_a,
DROP COLUMN IF EXISTS prob_b,
DROP COLUMN IF EXISTS points_fav,
DROP COLUMN IF EXISTS points_dog,
DROP COLUMN IF EXISTS court_number,
DROP COLUMN IF EXISTS winner_id,
DROP COLUMN IF EXISTS match_duration,
DROP COLUMN IF EXISTS match_notes;

-- Drop columns that are always 0 (not used)
ALTER TABLE matches 
DROP COLUMN IF EXISTS sets_a,
DROP COLUMN IF EXISTS sets_b,
DROP COLUMN IF EXISTS games_a,
DROP COLUMN IF EXISTS games_b,
DROP COLUMN IF EXISTS tiebreaks_a,
DROP COLUMN IF EXISTS tiebreaks_b;

-- Add comment to document the cleanup
COMMENT ON TABLE matches IS 'Matches table - cleaned up by removing unused columns. Match results are stored in match_results table.';
