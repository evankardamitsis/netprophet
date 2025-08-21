-- Add missing columns to matches table
ALTER TABLE public.matches ADD COLUMN
IF NOT EXISTS locked BOOLEAN DEFAULT false;
ALTER TABLE public.matches ADD COLUMN
IF NOT EXISTS updated_at TIMESTAMP
WITH TIME ZONE DEFAULT NOW
();

-- Create index for locked column
CREATE INDEX
IF NOT EXISTS idx_matches_locked ON public.matches
(locked);
