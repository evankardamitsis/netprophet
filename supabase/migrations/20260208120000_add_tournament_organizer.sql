-- Add optional organizer to tournaments (displayed under tournament name in matches table)
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS organizer text;

COMMENT ON COLUMN tournaments.organizer IS 'Organizer name or entity; shown under tournament name when set';
