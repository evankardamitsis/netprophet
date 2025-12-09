-- Add doubles head-to-head and partnerships tracking
-- This migration creates tables to track doubles-specific statistics

-- Step 1: Create partnerships table to track player pairs
CREATE TABLE IF NOT EXISTS public.partnerships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_a_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    player_b_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    total_matches INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    win_rate DECIMAL(5,4) DEFAULT 0.0000 CHECK (win_rate >= 0.0000 AND win_rate <= 1.0000),
    last_match_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure player_a_id is always the smaller UUID for consistency
    CONSTRAINT partnership_player_order CHECK (player_a_id < player_b_id),
    
    -- Ensure wins + losses = total_matches
    CONSTRAINT valid_partnership_wins CHECK (wins + losses = total_matches),
    
    -- Unique constraint: one record per player pair
    CONSTRAINT unique_partnership UNIQUE (player_a_id, player_b_id)
);

-- Step 2: Create doubles head-to-head table (team vs team)
CREATE TABLE IF NOT EXISTS public.doubles_head_to_head (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_a_player1_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    team_a_player2_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    team_b_player1_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    team_b_player2_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    team_a_wins INTEGER DEFAULT 0,
    team_b_wins INTEGER DEFAULT 0,
    total_matches INTEGER DEFAULT 0,
    last_match_date TIMESTAMP WITH TIME ZONE,
    last_match_result VARCHAR(1), -- 'A' for team A win, 'B' for team B win
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure consistent ordering: team A players < team B players, and within teams: player1 < player2
    CONSTRAINT doubles_h2h_team_a_order CHECK (team_a_player1_id < team_a_player2_id),
    CONSTRAINT doubles_h2h_team_b_order CHECK (team_b_player1_id < team_b_player2_id),
    
    -- Ensure wins don't exceed total matches
    CONSTRAINT valid_doubles_h2h_wins CHECK (team_a_wins + team_b_wins <= total_matches),
    
    -- Ensure total matches is sum of wins
    CONSTRAINT valid_doubles_h2h_total CHECK (total_matches = team_a_wins + team_b_wins)
);

-- Step 3: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_partnerships_player_a ON public.partnerships(player_a_id);
CREATE INDEX IF NOT EXISTS idx_partnerships_player_b ON public.partnerships(player_b_id);
CREATE INDEX IF NOT EXISTS idx_partnerships_win_rate ON public.partnerships(win_rate);
CREATE INDEX IF NOT EXISTS idx_partnerships_total_matches ON public.partnerships(total_matches);

CREATE INDEX IF NOT EXISTS idx_doubles_h2h_team_a_p1 ON public.doubles_head_to_head(team_a_player1_id);
CREATE INDEX IF NOT EXISTS idx_doubles_h2h_team_a_p2 ON public.doubles_head_to_head(team_a_player2_id);
CREATE INDEX IF NOT EXISTS idx_doubles_h2h_team_b_p1 ON public.doubles_head_to_head(team_b_player1_id);
CREATE INDEX IF NOT EXISTS idx_doubles_h2h_team_b_p2 ON public.doubles_head_to_head(team_b_player2_id);
CREATE INDEX IF NOT EXISTS idx_doubles_h2h_last_match_date ON public.doubles_head_to_head(last_match_date);

-- Step 4: Enable RLS
ALTER TABLE public.partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doubles_head_to_head ENABLE ROW LEVEL SECURITY;

-- RLS Policies for partnerships
CREATE POLICY "Allow public read access to partnerships" ON public.partnerships
    FOR SELECT USING (true);

CREATE POLICY "Allow admin full access to partnerships" ON public.partnerships
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- RLS Policies for doubles head-to-head
CREATE POLICY "Allow public read access to doubles H2H" ON public.doubles_head_to_head
    FOR SELECT USING (true);

CREATE POLICY "Allow admin full access to doubles H2H" ON public.doubles_head_to_head
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- Step 5: Create function to update partnership record
CREATE OR REPLACE FUNCTION public.update_partnership_record(
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
    v_wins INTEGER;
    v_losses INTEGER;
    v_new_win_rate DECIMAL(5,4);
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
    FROM public.partnerships
    WHERE player_a_id = v_player_a_id AND player_b_id = v_player_b_id;
    
    -- Determine if this partnership won
    IF (p_winner_id = v_player_a_id OR p_winner_id = v_player_b_id) THEN
        v_wins := 1;
        v_losses := 0;
    ELSE
        v_wins := 0;
        v_losses := 1;
    END IF;
    
    IF v_existing_record IS NULL THEN
        -- Create new record
        v_new_win_rate := CASE WHEN v_wins = 1 THEN 1.0000 ELSE 0.0000 END;
        INSERT INTO public.partnerships (
            player_a_id,
            player_b_id,
            total_matches,
            wins,
            losses,
            win_rate,
            last_match_date
        ) VALUES (
            v_player_a_id,
            v_player_b_id,
            1,
            v_wins,
            v_losses,
            v_new_win_rate,
            p_match_date
        );
    ELSE
        -- Update existing record
        v_new_win_rate := (v_existing_record.wins + v_wins)::DECIMAL / (v_existing_record.total_matches + 1)::DECIMAL;
        UPDATE public.partnerships
        SET 
            total_matches = total_matches + 1,
            wins = wins + v_wins,
            losses = losses + v_losses,
            win_rate = v_new_win_rate,
            last_match_date = p_match_date,
            updated_at = NOW()
        WHERE player_a_id = v_player_a_id AND player_b_id = v_player_b_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create function to get partnership record
CREATE OR REPLACE FUNCTION public.get_partnership_record(
    p_player_1_id UUID,
    p_player_2_id UUID
)
RETURNS TABLE (
    player_a_id UUID,
    player_b_id UUID,
    total_matches INTEGER,
    wins INTEGER,
    losses INTEGER,
    win_rate DECIMAL(5,4),
    last_match_date TIMESTAMP WITH TIME ZONE
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
        p.player_a_id,
        p.player_b_id,
        p.total_matches,
        p.wins,
        p.losses,
        p.win_rate,
        p.last_match_date
    FROM public.partnerships p
    WHERE p.player_a_id = v_player_a_id AND p.player_b_id = v_player_b_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create function to update doubles head-to-head record
CREATE OR REPLACE FUNCTION public.update_doubles_h2h_record(
    p_team_a_p1_id UUID,
    p_team_a_p2_id UUID,
    p_team_b_p1_id UUID,
    p_team_b_p2_id UUID,
    p_winner_team TEXT, -- 'team_a' or 'team_b'
    p_match_date TIMESTAMP WITH TIME ZONE
)
RETURNS VOID AS $$
DECLARE
    v_team_a_p1_id UUID;
    v_team_a_p2_id UUID;
    v_team_b_p1_id UUID;
    v_team_b_p2_id UUID;
    v_existing_record RECORD;
    v_team_a_wins INTEGER;
    v_team_b_wins INTEGER;
BEGIN
    -- Ensure consistent ordering within teams (smaller UUID first)
    IF p_team_a_p1_id < p_team_a_p2_id THEN
        v_team_a_p1_id := p_team_a_p1_id;
        v_team_a_p2_id := p_team_a_p2_id;
    ELSE
        v_team_a_p1_id := p_team_a_p2_id;
        v_team_a_p2_id := p_team_a_p1_id;
    END IF;
    
    IF p_team_b_p1_id < p_team_b_p2_id THEN
        v_team_b_p1_id := p_team_b_p1_id;
        v_team_b_p2_id := p_team_b_p2_id;
    ELSE
        v_team_b_p1_id := p_team_b_p2_id;
        v_team_b_p2_id := p_team_b_p1_id;
    END IF;
    
    -- Try to find existing record
    SELECT * INTO v_existing_record
    FROM public.doubles_head_to_head
    WHERE team_a_player1_id = v_team_a_p1_id 
      AND team_a_player2_id = v_team_a_p2_id
      AND team_b_player1_id = v_team_b_p1_id
      AND team_b_player2_id = v_team_b_p2_id;
    
    -- Determine which team won
    IF p_winner_team = 'team_a' THEN
        v_team_a_wins := 1;
        v_team_b_wins := 0;
    ELSE
        v_team_a_wins := 0;
        v_team_b_wins := 1;
    END IF;
    
    IF v_existing_record IS NULL THEN
        -- Create new record
        INSERT INTO public.doubles_head_to_head (
            team_a_player1_id,
            team_a_player2_id,
            team_b_player1_id,
            team_b_player2_id,
            team_a_wins,
            team_b_wins,
            total_matches,
            last_match_date,
            last_match_result
        ) VALUES (
            v_team_a_p1_id,
            v_team_a_p2_id,
            v_team_b_p1_id,
            v_team_b_p2_id,
            v_team_a_wins,
            v_team_b_wins,
            1,
            p_match_date,
            CASE WHEN p_winner_team = 'team_a' THEN 'A' ELSE 'B' END
        );
    ELSE
        -- Update existing record
        UPDATE public.doubles_head_to_head
        SET 
            team_a_wins = team_a_wins + v_team_a_wins,
            team_b_wins = team_b_wins + v_team_b_wins,
            total_matches = total_matches + 1,
            last_match_date = p_match_date,
            last_match_result = CASE WHEN p_winner_team = 'team_a' THEN 'A' ELSE 'B' END,
            updated_at = NOW()
        WHERE team_a_player1_id = v_team_a_p1_id 
          AND team_a_player2_id = v_team_a_p2_id
          AND team_b_player1_id = v_team_b_p1_id
          AND team_b_player2_id = v_team_b_p2_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create function to get doubles head-to-head record
CREATE OR REPLACE FUNCTION public.get_doubles_h2h_record(
    p_team_a_p1_id UUID,
    p_team_a_p2_id UUID,
    p_team_b_p1_id UUID,
    p_team_b_p2_id UUID
)
RETURNS TABLE (
    team_a_player1_id UUID,
    team_a_player2_id UUID,
    team_b_player1_id UUID,
    team_b_player2_id UUID,
    team_a_wins INTEGER,
    team_b_wins INTEGER,
    total_matches INTEGER,
    last_match_date TIMESTAMP WITH TIME ZONE,
    last_match_result VARCHAR(1)
) AS $$
DECLARE
    v_team_a_p1_id UUID;
    v_team_a_p2_id UUID;
    v_team_b_p1_id UUID;
    v_team_b_p2_id UUID;
BEGIN
    -- Ensure consistent ordering within teams
    IF p_team_a_p1_id < p_team_a_p2_id THEN
        v_team_a_p1_id := p_team_a_p1_id;
        v_team_a_p2_id := p_team_a_p2_id;
    ELSE
        v_team_a_p1_id := p_team_a_p2_id;
        v_team_a_p2_id := p_team_a_p1_id;
    END IF;
    
    IF p_team_b_p1_id < p_team_b_p2_id THEN
        v_team_b_p1_id := p_team_b_p1_id;
        v_team_b_p2_id := p_team_b_p2_id;
    ELSE
        v_team_b_p1_id := p_team_b_p2_id;
        v_team_b_p2_id := p_team_b_p1_id;
    END IF;
    
    RETURN QUERY
    SELECT 
        h2h.team_a_player1_id,
        h2h.team_a_player2_id,
        h2h.team_b_player1_id,
        h2h.team_b_player2_id,
        h2h.team_a_wins,
        h2h.team_b_wins,
        h2h.total_matches,
        h2h.last_match_date,
        h2h.last_match_result
    FROM public.doubles_head_to_head h2h
    WHERE h2h.team_a_player1_id = v_team_a_p1_id 
      AND h2h.team_a_player2_id = v_team_a_p2_id
      AND h2h.team_b_player1_id = v_team_b_p1_id
      AND h2h.team_b_player2_id = v_team_b_p2_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Add comments for documentation
COMMENT ON TABLE public.partnerships IS 'Tracks doubles partnerships (player pairs) and their win rates together';
COMMENT ON TABLE public.doubles_head_to_head IS 'Tracks head-to-head records between doubles teams (exact team combinations)';
COMMENT ON COLUMN public.partnerships.win_rate IS 'Partnership win rate (0.0000 to 1.0000)';
COMMENT ON COLUMN public.partnerships.total_matches IS 'Total matches played together as a partnership';
COMMENT ON COLUMN public.doubles_head_to_head.team_a_wins IS 'Number of times team A (player1 + player2) beat team B';
COMMENT ON COLUMN public.doubles_head_to_head.team_b_wins IS 'Number of times team B (player1 + player2) beat team A';

