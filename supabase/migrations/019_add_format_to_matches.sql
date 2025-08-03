-- Add format field to matches table
ALTER TABLE public.matches 
ADD COLUMN format TEXT DEFAULT 'best-of-3' 
CHECK
(format IN
('best-of-3', 'best-of-5', 'best-of-3-super-tiebreak'));

-- Add index for efficient queries by format
CREATE INDEX
IF NOT EXISTS idx_matches_format ON public.matches
(format);

-- Update existing matches to have the default format
UPDATE public.matches SET format = 'best-of-3' WHERE format IS NULL; 