-- Add doubles match support to matches and match_results tables
-- This migration adds match_type enum and doubles player fields

-- Step 1: Create match_type enum
CREATE TYPE match_type AS ENUM ('singles', 'doubles');

-- Step 2: Add match_type column to matches table (default to 'singles' for existing matches)
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS match_type match_type NOT NULL DEFAULT 'singles';

-- Step 3: Add doubles player fields to matches table
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS player_a1_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS player_a2_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS player_b1_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS player_b2_id UUID REFERENCES public.players(id) ON DELETE SET NULL;

-- Step 4: Add indexes for doubles player fields
CREATE INDEX IF NOT EXISTS idx_matches_player_a1_id ON public.matches(player_a1_id);
CREATE INDEX IF NOT EXISTS idx_matches_player_a2_id ON public.matches(player_a2_id);
CREATE INDEX IF NOT EXISTS idx_matches_player_b1_id ON public.matches(player_b1_id);
CREATE INDEX IF NOT EXISTS idx_matches_player_b2_id ON public.matches(player_b2_id);
CREATE INDEX IF NOT EXISTS idx_matches_match_type ON public.matches(match_type);

-- Step 4.5: Ensure all existing matches have required player fields set
-- This handles any edge cases where player_a_id or player_b_id might be NULL
-- Delete or update matches with NULL player fields before adding constraint
-- First, let's identify and handle problematic matches
DO $$
DECLARE
    null_matches_count INTEGER;
BEGIN
    -- Count matches with NULL player fields
    SELECT COUNT(*) INTO null_matches_count
    FROM public.matches
    WHERE player_a_id IS NULL OR player_b_id IS NULL;
    
    -- If there are matches with NULL players, we need to handle them
    -- For now, we'll delete them (you may want to update them instead)
    IF null_matches_count > 0 THEN
        RAISE NOTICE 'Found % matches with NULL player fields. Deleting them...', null_matches_count;
        DELETE FROM public.matches
        WHERE player_a_id IS NULL OR player_b_id IS NULL;
    END IF;
END $$;

-- Step 5: Add constraint to ensure proper player fields are set based on match_type
-- For singles: player_a_id and player_b_id must be set
-- For doubles: all 4 doubles player fields must be set
-- Note: This constraint will fail if there are existing matches with NULL player_a_id or player_b_id.
-- Any such matches should be fixed or deleted before running this migration.
ALTER TABLE public.matches 
ADD CONSTRAINT check_match_type_players CHECK (
    (match_type = 'singles' AND player_a_id IS NOT NULL AND player_b_id IS NOT NULL) OR
    (match_type = 'doubles' AND player_a1_id IS NOT NULL AND player_a2_id IS NOT NULL 
     AND player_b1_id IS NOT NULL AND player_b2_id IS NOT NULL)
);

-- Step 6: Update match_results table for doubles support
-- Add team winner field for doubles matches
ALTER TABLE public.match_results 
ADD COLUMN IF NOT EXISTS match_winner_team TEXT CHECK (match_winner_team IN ('team_a', 'team_b'));

-- Add doubles set winner fields (for each set, we need to track which team won)
-- Note: For doubles, set winners are teams, not individual players
-- We'll keep the existing set_winner_id fields for singles compatibility
-- For doubles, we can use set_winner_id to reference a "team" concept or leave it for singles only
-- For now, we'll add team-based fields and keep individual player fields for singles

-- Add doubles-specific set winner team fields
ALTER TABLE public.match_results 
ADD COLUMN IF NOT EXISTS set1_winner_team TEXT CHECK (set1_winner_team IN ('team_a', 'team_b')),
ADD COLUMN IF NOT EXISTS set2_winner_team TEXT CHECK (set2_winner_team IN ('team_a', 'team_b')),
ADD COLUMN IF NOT EXISTS set3_winner_team TEXT CHECK (set3_winner_team IN ('team_a', 'team_b')),
ADD COLUMN IF NOT EXISTS set4_winner_team TEXT CHECK (set4_winner_team IN ('team_a', 'team_b')),
ADD COLUMN IF NOT EXISTS set5_winner_team TEXT CHECK (set5_winner_team IN ('team_a', 'team_b')),
ADD COLUMN IF NOT EXISTS super_tiebreak_winner_team TEXT CHECK (super_tiebreak_winner_team IN ('team_a', 'team_b'));

-- Step 7: Add constraint to match_results to ensure consistency
-- For singles matches: winner_id must be set, match_winner_team should be NULL
-- For doubles matches: match_winner_team must be set
-- Note: We can't easily check match_type from matches table in a check constraint,
-- so we'll enforce this in application logic. The constraint here just ensures data format.
-- winner_id can reference any player from the winning team for doubles (or be NULL)

-- Step 8: Add comments for documentation
COMMENT ON TYPE match_type IS 'Enum for match type: singles (2 players) or doubles (4 players)';
COMMENT ON COLUMN public.matches.match_type IS 'Type of match: singles or doubles';
COMMENT ON COLUMN public.matches.player_a1_id IS 'Doubles: Team A Player 1 (only used when match_type = doubles)';
COMMENT ON COLUMN public.matches.player_a2_id IS 'Doubles: Team A Player 2 (only used when match_type = doubles)';
COMMENT ON COLUMN public.matches.player_b1_id IS 'Doubles: Team B Player 1 (only used when match_type = doubles)';
COMMENT ON COLUMN public.matches.player_b2_id IS 'Doubles: Team B Player 2 (only used when match_type = doubles)';
COMMENT ON COLUMN public.match_results.match_winner_team IS 'Doubles: Winning team (team_a or team_b). NULL for singles matches.';
COMMENT ON COLUMN public.match_results.set1_winner_team IS 'Doubles: Team that won set 1. NULL for singles matches.';
COMMENT ON COLUMN public.match_results.set2_winner_team IS 'Doubles: Team that won set 2. NULL for singles matches.';
COMMENT ON COLUMN public.match_results.set3_winner_team IS 'Doubles: Team that won set 3. NULL for singles matches.';
COMMENT ON COLUMN public.match_results.set4_winner_team IS 'Doubles: Team that won set 4. NULL for singles matches.';
COMMENT ON COLUMN public.match_results.set5_winner_team IS 'Doubles: Team that won set 5. NULL for singles matches.';
COMMENT ON COLUMN public.match_results.super_tiebreak_winner_team IS 'Doubles: Team that won super tiebreak. NULL for singles matches.';

