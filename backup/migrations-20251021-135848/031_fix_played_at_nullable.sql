-- Fix played_at column to be nullable for new matches
ALTER TABLE public.matches 
ALTER COLUMN played_at DROP NOT NULL;

-- Add a comment to clarify the column usage
COMMENT ON COLUMN public.matches.played_at IS 'Timestamp when the match was actually played. NULL for upcoming matches.'; 