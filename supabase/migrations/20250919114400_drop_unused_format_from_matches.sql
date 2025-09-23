-- Drop unused format column from matches table
-- The format information is already available through tournaments.matches_type
-- and the format column is not being used in any queries

-- Drop the format column
ALTER TABLE public.matches 
DROP COLUMN IF EXISTS format;

-- Drop the index that was created for the format column
DROP INDEX IF EXISTS idx_matches_format;

-- Add comment to document the cleanup
COMMENT ON TABLE public.matches IS 'Matches table - format information is available through tournaments.matches_type relationship';
