-- Ensure is_team_tournament column exists in tournaments table
-- This migration is idempotent and safe to run multiple times
-- It addresses PostgREST schema cache issues

DO $
$
BEGIN
    -- Check if column exists, if not add it
    IF NOT EXISTS (
        SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = 'tournaments'
        AND column_name = 'is_team_tournament'
    ) THEN
    ALTER TABLE public.tournaments 
        ADD COLUMN is_team_tournament BOOLEAN DEFAULT FALSE NOT NULL;

COMMENT ON COLUMN public.tournaments.is_team_tournament IS 'When true, tournament uses teams instead of categories. Teams are groups of players that compete together.';
        
        RAISE NOTICE 'Added is_team_tournament column to tournaments table';
    ELSE
        RAISE NOTICE 'Column is_team_tournament already exists in tournaments table';
END
IF;
END
$$;

-- Ensure index exists
CREATE INDEX
IF NOT EXISTS idx_tournaments_is_team_tournament 
ON public.tournaments
(is_team_tournament) 
WHERE is_team_tournament = true;
