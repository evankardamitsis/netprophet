-- Add web_synced field to matches table
ALTER TABLE matches ADD COLUMN web_synced BOOLEAN DEFAULT FALSE;

-- Add index for better performance when filtering by web_synced status
CREATE INDEX idx_matches_web_synced ON matches(web_synced);

-- Add comment to document the field
COMMENT ON COLUMN matches.web_synced IS 'Indicates whether this match has been synced to the web application';
