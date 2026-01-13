-- Add captain_name field to tournament_teams table
-- This allows teams to have captains who are not in the players database

ALTER TABLE public.tournament_teams
ADD COLUMN IF NOT EXISTS captain_name TEXT;

COMMENT ON COLUMN public.tournament_teams.captain_name IS 'Name of the team captain if they are not in the players database. If captain_id is set, this should be null.';

-- Update the constraint comment
COMMENT ON COLUMN public.tournament_teams.captain_id IS 'The team captain (player ID if captain is in the database, otherwise null if using captain_name)';
