-- Drop unused points_value column from matches table
-- This column was added but never actually used in the application logic
-- Points are calculated dynamically in the frontend and leaderboard system

ALTER TABLE public.matches 
DROP COLUMN IF EXISTS points_value;

-- Drop any associated index if it exists
DROP INDEX IF EXISTS idx_matches_points_value;
