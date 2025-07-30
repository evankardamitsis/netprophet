-- Create matches table if it doesn't exist
CREATE TABLE
IF NOT EXISTS public.matches
(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid
(),
    player_a TEXT NOT NULL,
    player_b TEXT NOT NULL,
    a_score INTEGER,
    b_score INTEGER,
    played_at TIMESTAMP
WITH TIME ZONE NOT NULL,
    prob_a DECIMAL
(3,2),
    prob_b DECIMAL
(3,2),
    points_fav INTEGER,
    points_dog INTEGER,
    processed BOOLEAN DEFAULT false
);

-- Create index for efficient queries
CREATE INDEX
IF NOT EXISTS idx_matches_played_at ON public.matches
(played_at);
CREATE INDEX
IF NOT EXISTS idx_matches_processed ON public.matches
(processed);

-- Enable RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for matches
-- Everyone can view matches
CREATE POLICY "Everyone can view matches" ON public.matches
    FOR
SELECT USING (true);

-- Only admins can insert/update matches
CREATE POLICY "Admins can manage matches" ON public.matches
    FOR ALL USING
(
        EXISTS
(
            SELECT 1
FROM public.profiles
WHERE id = auth.uid()
    AND is_admin = true
        )
); 