-- Add matches_type field to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN
IF NOT EXISTS matches_type TEXT NOT NULL DEFAULT 'best-of-3' 
CHECK
(matches_type IN
('best-of-3', 'best-of-5', 'best-of-3-super-tiebreak'));

-- Add index for performance
CREATE INDEX
IF NOT EXISTS idx_tournaments_matches_type ON public.tournaments
(matches_type);
