-- Migration: Add team tournament flag to tournaments table
-- This allows tournaments to be configured as team tournaments
-- When enabled, tournaments will use teams instead of categories

-- Add is_team_tournament column to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN
IF NOT EXISTS is_team_tournament BOOLEAN DEFAULT FALSE NOT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.tournaments.is_team_tournament IS 'When true, tournament uses teams instead of categories. Teams are groups of players that compete together.';

-- Create index for faster queries on team tournaments
CREATE INDEX
IF NOT EXISTS idx_tournaments_is_team_tournament 
ON public.tournaments
(is_team_tournament) 
WHERE is_team_tournament = true;
