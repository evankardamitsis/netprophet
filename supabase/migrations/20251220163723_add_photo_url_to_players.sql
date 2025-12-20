-- Add photo_url column to players table for athlete photos
ALTER TABLE players
ADD COLUMN
IF NOT EXISTS photo_url TEXT;

-- Add comment to document the column
COMMENT ON COLUMN players.photo_url IS 'URL to the athlete photo stored in Supabase storage or external URL';

