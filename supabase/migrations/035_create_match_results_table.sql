-- Create match_results table to store detailed match results
CREATE TABLE IF NOT EXISTS public.match_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    
    -- Match winner
    winner_id UUID NOT NULL REFERENCES public.players(id),
    
    -- Match result (e.g., "2-1", "3-0", "0-2")
    match_result VARCHAR(10) NOT NULL,
    
    -- Set scores (up to 5 sets for best of 5)
    set1_score VARCHAR(10),
    set2_score VARCHAR(10),
    set3_score VARCHAR(10),
    set4_score VARCHAR(10),
    set5_score VARCHAR(10),
    
    -- Set winners (up to 5 sets)
    set1_winner_id UUID REFERENCES public.players(id),
    set2_winner_id UUID REFERENCES public.players(id),
    set3_winner_id UUID REFERENCES public.players(id),
    set4_winner_id UUID REFERENCES public.players(id),
    set5_winner_id UUID REFERENCES public.players(id),
    
    -- Tiebreak details
    set1_tiebreak_score VARCHAR(10), -- e.g., "7-5", "7-6"
    set2_tiebreak_score VARCHAR(10),
    set3_tiebreak_score VARCHAR(10),
    set4_tiebreak_score VARCHAR(10),
    set5_tiebreak_score VARCHAR(10),
    
    -- Super tiebreak (for amateur format)
    super_tiebreak_score VARCHAR(10), -- e.g., "10-8", "10-6"
    super_tiebreak_winner_id UUID REFERENCES public.players(id),
    
    -- Additional statistics (for future use)
    total_games INTEGER,
    aces_leader_id UUID REFERENCES public.players(id),
    double_faults_count INTEGER,
    break_points_count INTEGER,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT valid_match_result CHECK (match_result ~ '^[0-9]-[0-9]$'),
    CONSTRAINT valid_set1_score CHECK (set1_score IS NULL OR set1_score ~ '^[0-9]+-[0-9]+$'),
    CONSTRAINT valid_set2_score CHECK (set2_score IS NULL OR set2_score ~ '^[0-9]+-[0-9]+$'),
    CONSTRAINT valid_set3_score CHECK (set3_score IS NULL OR set3_score ~ '^[0-9]+-[0-9]+$'),
    CONSTRAINT valid_set4_score CHECK (set4_score IS NULL OR set4_score ~ '^[0-9]+-[0-9]+$'),
    CONSTRAINT valid_set5_score CHECK (set5_score IS NULL OR set5_score ~ '^[0-9]+-[0-9]+$')
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_match_results_match_id ON public.match_results(match_id);
CREATE INDEX IF NOT EXISTS idx_match_results_winner_id ON public.match_results(winner_id);
CREATE INDEX IF NOT EXISTS idx_match_results_created_at ON public.match_results(created_at);

-- Add RLS policies
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage match results
CREATE POLICY "Admins can manage match results" ON public.match_results
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- Allow read access to authenticated users
CREATE POLICY "Users can view match results" ON public.match_results
    FOR SELECT USING (auth.role() = 'authenticated');

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_match_results_updated_at
    BEFORE UPDATE ON public.match_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
