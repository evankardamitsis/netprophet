-- Create head_to_head table to track match history between players
CREATE TABLE IF NOT EXISTS public.head_to_head (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_a_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    player_b_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    player_a_wins INTEGER DEFAULT 0,
    player_b_wins INTEGER DEFAULT 0,
    total_matches INTEGER DEFAULT 0,
    last_match_date TIMESTAMP WITH TIME ZONE,
    last_match_result VARCHAR(1), -- 'A' for player A win, 'B' for player B win
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure player_a_id is always the smaller UUID for consistency
    CONSTRAINT player_order CHECK (player_a_id < player_b_id),
    
    -- Ensure wins don't exceed total matches
    CONSTRAINT valid_wins CHECK (player_a_wins + player_b_wins <= total_matches),
    
    -- Ensure total matches is sum of wins
    CONSTRAINT valid_total_matches CHECK (total_matches = player_a_wins + player_b_wins)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_head_to_head_player_a ON public.head_to_head(player_a_id);
CREATE INDEX IF NOT EXISTS idx_head_to_head_player_b ON public.head_to_head(player_b_id);
CREATE INDEX IF NOT EXISTS idx_head_to_head_last_match_date ON public.head_to_head(last_match_date);

-- Create RLS policies
ALTER TABLE public.head_to_head ENABLE ROW LEVEL SECURITY;

-- Allow public read access for odds calculation
CREATE POLICY "Allow public read access" ON public.head_to_head
    FOR SELECT USING (true);

-- Allow admin full access
CREATE POLICY "Allow admin full access" ON public.head_to_head
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- Create function to update head-to-head records
CREATE OR REPLACE FUNCTION public.update_head_to_head_record(
    p_player_a_id UUID,
    p_player_b_id UUID,
    p_winner_id UUID,
    p_match_date TIMESTAMP WITH TIME ZONE
)
RETURNS VOID AS $$
DECLARE
    v_player_a_id UUID;
    v_player_b_id UUID;
    v_existing_record RECORD;
    v_player_a_wins INTEGER;
    v_player_b_wins INTEGER;
BEGIN
    -- Ensure consistent ordering (smaller UUID first)
    IF p_player_a_id < p_player_b_id THEN
        v_player_a_id := p_player_a_id;
        v_player_b_id := p_player_b_id;
    ELSE
        v_player_a_id := p_player_b_id;
        v_player_b_id := p_player_a_id;
    END IF;
    
    -- Try to find existing record
    SELECT * INTO v_existing_record
    FROM public.head_to_head
    WHERE player_a_id = v_player_a_id AND player_b_id = v_player_b_id;
    
    -- Determine which player won from player A's perspective
    IF p_winner_id = v_player_a_id THEN
        v_player_a_wins := 1;
        v_player_b_wins := 0;
    ELSE
        v_player_a_wins := 0;
        v_player_b_wins := 1;
    END IF;
    
    IF v_existing_record IS NULL THEN
        -- Create new record
        INSERT INTO public.head_to_head (
            player_a_id,
            player_b_id,
            player_a_wins,
            player_b_wins,
            total_matches,
            last_match_date,
            last_match_result
        ) VALUES (
            v_player_a_id,
            v_player_b_id,
            v_player_a_wins,
            v_player_b_wins,
            1,
            p_match_date,
            CASE WHEN p_winner_id = v_player_a_id THEN 'A' ELSE 'B' END
        );
    ELSE
        -- Update existing record
        UPDATE public.head_to_head
        SET 
            player_a_wins = player_a_wins + v_player_a_wins,
            player_b_wins = player_b_wins + v_player_b_wins,
            total_matches = total_matches + 1,
            last_match_date = p_match_date,
            last_match_result = CASE WHEN p_winner_id = v_player_a_id THEN 'A' ELSE 'B' END,
            updated_at = NOW()
        WHERE player_a_id = v_player_a_id AND player_b_id = v_player_b_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get head-to-head record for a player pair
CREATE OR REPLACE FUNCTION public.get_head_to_head_record(
    p_player_1_id UUID,
    p_player_2_id UUID
)
RETURNS TABLE (
    player_a_id UUID,
    player_b_id UUID,
    player_a_wins INTEGER,
    player_b_wins INTEGER,
    total_matches INTEGER,
    last_match_date TIMESTAMP WITH TIME ZONE,
    last_match_result VARCHAR(1)
) AS $$
DECLARE
    v_player_a_id UUID;
    v_player_b_id UUID;
BEGIN
    -- Ensure consistent ordering (smaller UUID first)
    IF p_player_1_id < p_player_2_id THEN
        v_player_a_id := p_player_1_id;
        v_player_b_id := p_player_2_id;
    ELSE
        v_player_a_id := p_player_2_id;
        v_player_b_id := p_player_1_id;
    END IF;
    
    RETURN QUERY
    SELECT 
        h2h.player_a_id,
        h2h.player_b_id,
        h2h.player_a_wins,
        h2h.player_b_wins,
        h2h.total_matches,
        h2h.last_match_date,
        h2h.last_match_result
    FROM public.head_to_head h2h
    WHERE h2h.player_a_id = v_player_a_id AND h2h.player_b_id = v_player_b_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to reverse head-to-head record (for when match results are deleted/changed)
CREATE OR REPLACE FUNCTION public.reverse_head_to_head_record(
    p_player_a_id UUID,
    p_player_b_id UUID,
    p_previous_winner_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_player_a_id UUID;
    v_player_b_id UUID;
    v_existing_record RECORD;
    v_player_a_wins INTEGER;
    v_player_b_wins INTEGER;
BEGIN
    -- Ensure consistent ordering (smaller UUID first)
    IF p_player_a_id < p_player_b_id THEN
        v_player_a_id := p_player_a_id;
        v_player_b_id := p_player_b_id;
    ELSE
        v_player_a_id := p_player_b_id;
        v_player_b_id := p_player_a_id;
    END IF;
    
    -- Get existing record
    SELECT * INTO v_existing_record
    FROM public.head_to_head
    WHERE player_a_id = v_player_a_id AND player_b_id = v_player_b_id;
    
    IF v_existing_record IS NULL THEN
        RETURN; -- No record to reverse
    END IF;
    
    -- Determine which player previously won from player A's perspective
    IF p_previous_winner_id = v_player_a_id THEN
        v_player_a_wins := -1;
        v_player_b_wins := 0;
    ELSE
        v_player_a_wins := 0;
        v_player_b_wins := -1;
    END IF;
    
    -- Update record
    UPDATE public.head_to_head
    SET 
        player_a_wins = GREATEST(0, player_a_wins + v_player_a_wins),
        player_b_wins = GREATEST(0, player_b_wins + v_player_b_wins),
        total_matches = GREATEST(0, total_matches - 1),
        updated_at = NOW()
    WHERE player_a_id = v_player_a_id AND player_b_id = v_player_b_id;
    
    -- Delete record if no matches remain
    DELETE FROM public.head_to_head
    WHERE player_a_id = v_player_a_id 
    AND player_b_id = v_player_b_id 
    AND total_matches = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE public.head_to_head IS 'Tracks head-to-head match history between player pairs';
COMMENT ON COLUMN public.head_to_head.player_a_id IS 'Player with smaller UUID (for consistent ordering)';
COMMENT ON COLUMN public.head_to_head.player_b_id IS 'Player with larger UUID (for consistent ordering)';
COMMENT ON COLUMN public.head_to_head.last_match_result IS 'A = player A won, B = player B won';
COMMENT ON FUNCTION public.update_head_to_head_record IS 'Updates or creates head-to-head record for a match result';
COMMENT ON FUNCTION public.get_head_to_head_record IS 'Retrieves head-to-head record for a player pair';
COMMENT ON FUNCTION public.reverse_head_to_head_record IS 'Reverses head-to-head record when a match result is deleted/changed';
