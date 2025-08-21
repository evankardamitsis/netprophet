-- Add locked field to matches table to track when matches are locked for betting
ALTER TABLE public.matches 
ADD COLUMN
IF NOT EXISTS locked BOOLEAN DEFAULT false;

-- Add index for efficient queries on locked status
CREATE INDEX
IF NOT EXISTS idx_matches_locked ON public.matches
(locked);

-- Add comment to document the locked field
COMMENT ON COLUMN public.matches.locked IS 'Indicates if the match is locked for betting (lock_time has passed)';

-- Add updated_at column if it doesn't exist
ALTER TABLE public.matches 
ADD COLUMN
IF NOT EXISTS updated_at TIMESTAMP
WITH TIME ZONE DEFAULT NOW
();

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_matches_updated_at
()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW
();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS update_matches_updated_at_trigger
ON public.matches;

-- Create trigger
CREATE TRIGGER update_matches_updated_at_trigger
    BEFORE
UPDATE ON public.matches
    FOR EACH ROW
EXECUTE FUNCTION update_matches_updated_at
();
