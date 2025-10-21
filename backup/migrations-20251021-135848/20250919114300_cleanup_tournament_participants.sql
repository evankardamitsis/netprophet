-- Clean up tournament_participants table by removing unused columns
-- Based on analysis, these fields are not essential for core functionality

-- Drop the columns that are not needed
ALTER TABLE public.tournament_participants 
DROP COLUMN IF EXISTS category_id
,
DROP COLUMN
IF EXISTS status,
DROP COLUMN
IF EXISTS points_earned;

-- Update the comment to reflect the simplified structure
COMMENT ON TABLE public.tournament_participants IS 'Simplified tournament participants table with core fields only';

-- The table now only contains:
-- - id (primary key)
-- - tournament_id (foreign key to tournaments)
-- - player_id (foreign key to players)
-- - registration_date (when they registered)
-- - seed_position (tournament seeding)
-- - final_position (final ranking)
-- - created_at, updated_at (timestamps)
