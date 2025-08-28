-- Restore winner_id column to matches table
-- This column is needed for the web app to display match results

-- Add the winner_id column back to matches table
ALTER TABLE matches 
ADD COLUMN
IF NOT EXISTS winner_id UUID REFERENCES public.players
(id) ON
DELETE
SET NULL;

-- Add index for the winner_id column
CREATE INDEX
IF NOT EXISTS idx_matches_winner_id ON public.matches
(winner_id);

-- Populate winner_id from match_results table
UPDATE matches 
SET winner_id = match_results.winner_id
FROM match_results 
WHERE matches.id = match_results.match_id
    AND match_results.winner_id IS NOT NULL;

-- Add comment to document the restoration
COMMENT ON COLUMN matches.winner_id IS 'Winner of the match - restored from match_results table';
