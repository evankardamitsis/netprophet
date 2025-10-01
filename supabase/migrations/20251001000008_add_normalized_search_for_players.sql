-- Add normalized text search for players to handle Greek accents and diacritics
-- This makes search accent-insensitive (e.g., "Βασιλης" finds "Βασίλης")

-- Enable unaccent extension if not already enabled
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Create a function to normalize Greek text for searching
CREATE OR REPLACE FUNCTION normalize_for_search(text TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Remove accents and convert to lowercase
    RETURN lower(unaccent(text));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add generated columns for normalized first and last names
ALTER TABLE players
ADD COLUMN IF NOT EXISTS first_name_normalized TEXT GENERATED ALWAYS AS (normalize_for_search(first_name)) STORED,
ADD COLUMN IF NOT EXISTS last_name_normalized TEXT GENERATED ALWAYS AS (normalize_for_search(last_name)) STORED;

-- Create indexes on normalized columns for fast searching
CREATE INDEX IF NOT EXISTS idx_players_first_name_normalized ON players(first_name_normalized);
CREATE INDEX IF NOT EXISTS idx_players_last_name_normalized ON players(last_name_normalized);
CREATE INDEX IF NOT EXISTS idx_players_full_name_normalized ON players(first_name_normalized, last_name_normalized);

-- Add comments
COMMENT ON COLUMN players.first_name_normalized IS 'Normalized first name for accent-insensitive search';
COMMENT ON COLUMN players.last_name_normalized IS 'Normalized last name for accent-insensitive search';
COMMENT ON FUNCTION normalize_for_search(TEXT) IS 'Normalizes text for accent and case-insensitive searching';

