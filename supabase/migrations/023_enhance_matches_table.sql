-- Enhance matches table with tournament support and additional fields
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.tournament_categories(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS round TEXT,
ADD COLUMN IF NOT EXISTS court_number INTEGER,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'finished', 'cancelled')),
ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS lock_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS points_value INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS odds_a DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS odds_b DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS winner_id UUID REFERENCES public.players(id),
ADD COLUMN IF NOT EXISTS match_duration INTEGER, -- in minutes
ADD COLUMN IF NOT EXISTS sets_a INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sets_b INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS games_a INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS games_b INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tiebreaks_a INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tiebreaks_b INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS match_notes TEXT;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_matches_tournament_id ON public.matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_category_id ON public.matches(category_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_start_time ON public.matches(start_time);
CREATE INDEX IF NOT EXISTS idx_matches_lock_time ON public.matches(lock_time);

-- Update existing matches to have a default status
UPDATE public.matches SET status = 'finished' WHERE processed = true;
UPDATE public.matches SET status = 'upcoming' WHERE processed = false;

-- Add constraint to ensure odds_a + odds_b = 1 (or close to it for bookmaker margin)
ALTER TABLE public.matches 
ADD CONSTRAINT check_odds_sum CHECK (
    (odds_a IS NULL AND odds_b IS NULL) OR 
    (odds_a IS NOT NULL AND odds_b IS NOT NULL AND odds_a > 0 AND odds_b > 0)
);

-- Add constraint to ensure lock_time is before start_time
ALTER TABLE public.matches 
ADD CONSTRAINT check_lock_before_start CHECK (
    (lock_time IS NULL AND start_time IS NULL) OR
    (lock_time IS NOT NULL AND start_time IS NOT NULL AND lock_time <= start_time)
); 