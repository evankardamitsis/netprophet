-- Add doubles-specific stats fields to players table
-- This allows tracking singles and doubles stats separately for each player

-- Step 1: Add doubles stats columns to players table
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS doubles_wins INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS doubles_losses INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS doubles_last5 TEXT[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS doubles_current_streak INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS doubles_streak_type TEXT NOT NULL DEFAULT 'W',
ADD COLUMN IF NOT EXISTS doubles_last_match_date DATE;

-- Step 2: Add constraint for doubles_streak_type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'doubles_streak_type_check'
    ) THEN
        ALTER TABLE public.players
        ADD CONSTRAINT doubles_streak_type_check CHECK (doubles_streak_type IN ('W', 'L'));
    END IF;
END $$;

-- Step 3: Add comments for documentation
COMMENT ON COLUMN public.players.doubles_wins IS 'Number of doubles matches won (separate from singles wins)';
COMMENT ON COLUMN public.players.doubles_losses IS 'Number of doubles matches lost (separate from singles losses)';
COMMENT ON COLUMN public.players.doubles_last5 IS 'Last 5 doubles match results (W or L), separate from singles last5';
COMMENT ON COLUMN public.players.doubles_current_streak IS 'Current doubles win/loss streak, separate from singles streak';
COMMENT ON COLUMN public.players.doubles_streak_type IS 'Type of current doubles streak: W (winning) or L (losing)';
COMMENT ON COLUMN public.players.doubles_last_match_date IS 'Date of last doubles match played';

-- Step 4: Create function to update doubles player stats
CREATE OR REPLACE FUNCTION public.update_doubles_player_stats(
    p_winner_1_id UUID,
    p_winner_2_id UUID,
    p_loser_1_id UUID,
    p_loser_2_id UUID,
    p_match_date TIMESTAMP WITH TIME ZONE
)
RETURNS VOID AS $$
DECLARE
    v_winner_1 RECORD;
    v_winner_2 RECORD;
    v_loser_1 RECORD;
    v_loser_2 RECORD;
    v_new_last5_winner_1 TEXT[];
    v_new_last5_winner_2 TEXT[];
    v_new_last5_loser_1 TEXT[];
    v_new_last5_loser_2 TEXT[];
    v_new_streak_winner_1 INTEGER;
    v_new_streak_winner_2 INTEGER;
    v_new_streak_loser_1 INTEGER;
    v_new_streak_loser_2 INTEGER;
    v_new_streak_type_winner_1 TEXT;
    v_new_streak_type_winner_2 TEXT;
    v_new_streak_type_loser_1 TEXT;
    v_new_streak_type_loser_2 TEXT;
BEGIN
    -- Get current stats for all players
    SELECT doubles_wins, doubles_losses, doubles_last5, doubles_current_streak, doubles_streak_type
    INTO v_winner_1
    FROM public.players
    WHERE id = p_winner_1_id;

    SELECT doubles_wins, doubles_losses, doubles_last5, doubles_current_streak, doubles_streak_type
    INTO v_winner_2
    FROM public.players
    WHERE id = p_winner_2_id;

    SELECT doubles_wins, doubles_losses, doubles_last5, doubles_current_streak, doubles_streak_type
    INTO v_loser_1
    FROM public.players
    WHERE id = p_loser_1_id;

    SELECT doubles_wins, doubles_losses, doubles_last5, doubles_current_streak, doubles_streak_type
    INTO v_loser_2
    FROM public.players
    WHERE id = p_loser_2_id;

    -- Update last5 for winners (add W, remove oldest)
    v_new_last5_winner_1 := ARRAY[v_winner_1.doubles_last5[2], v_winner_1.doubles_last5[3], v_winner_1.doubles_last5[4], v_winner_1.doubles_last5[5], 'W'];
    v_new_last5_winner_2 := ARRAY[v_winner_2.doubles_last5[2], v_winner_2.doubles_last5[3], v_winner_2.doubles_last5[4], v_winner_2.doubles_last5[5], 'W'];

    -- Update last5 for losers (add L, remove oldest)
    v_new_last5_loser_1 := ARRAY[v_loser_1.doubles_last5[2], v_loser_1.doubles_last5[3], v_loser_1.doubles_last5[4], v_loser_1.doubles_last5[5], 'L'];
    v_new_last5_loser_2 := ARRAY[v_loser_2.doubles_last5[2], v_loser_2.doubles_last5[3], v_loser_2.doubles_last5[4], v_loser_2.doubles_last5[5], 'L'];

    -- Update streaks for winners
    IF v_winner_1.doubles_streak_type = 'W' THEN
        v_new_streak_winner_1 := v_winner_1.doubles_current_streak + 1;
        v_new_streak_type_winner_1 := 'W';
    ELSE
        v_new_streak_winner_1 := 1;
        v_new_streak_type_winner_1 := 'W';
    END IF;

    IF v_winner_2.doubles_streak_type = 'W' THEN
        v_new_streak_winner_2 := v_winner_2.doubles_current_streak + 1;
        v_new_streak_type_winner_2 := 'W';
    ELSE
        v_new_streak_winner_2 := 1;
        v_new_streak_type_winner_2 := 'W';
    END IF;

    -- Update streaks for losers
    IF v_loser_1.doubles_streak_type = 'L' THEN
        v_new_streak_loser_1 := v_loser_1.doubles_current_streak + 1;
        v_new_streak_type_loser_1 := 'L';
    ELSE
        v_new_streak_loser_1 := 1;
        v_new_streak_type_loser_1 := 'L';
    END IF;

    IF v_loser_2.doubles_streak_type = 'L' THEN
        v_new_streak_loser_2 := v_loser_2.doubles_current_streak + 1;
        v_new_streak_type_loser_2 := 'L';
    ELSE
        v_new_streak_loser_2 := 1;
        v_new_streak_type_loser_2 := 'L';
    END IF;

    -- Update winner 1
    UPDATE public.players
    SET 
        doubles_wins = doubles_wins + 1,
        doubles_last5 = v_new_last5_winner_1,
        doubles_current_streak = v_new_streak_winner_1,
        doubles_streak_type = v_new_streak_type_winner_1,
        doubles_last_match_date = p_match_date::DATE
    WHERE id = p_winner_1_id;

    -- Update winner 2
    UPDATE public.players
    SET 
        doubles_wins = doubles_wins + 1,
        doubles_last5 = v_new_last5_winner_2,
        doubles_current_streak = v_new_streak_winner_2,
        doubles_streak_type = v_new_streak_type_winner_2,
        doubles_last_match_date = p_match_date::DATE
    WHERE id = p_winner_2_id;

    -- Update loser 1
    UPDATE public.players
    SET 
        doubles_losses = doubles_losses + 1,
        doubles_last5 = v_new_last5_loser_1,
        doubles_current_streak = v_new_streak_loser_1,
        doubles_streak_type = v_new_streak_type_loser_1,
        doubles_last_match_date = p_match_date::DATE
    WHERE id = p_loser_1_id;

    -- Update loser 2
    UPDATE public.players
    SET 
        doubles_losses = doubles_losses + 1,
        doubles_last5 = v_new_last5_loser_2,
        doubles_current_streak = v_new_streak_loser_2,
        doubles_streak_type = v_new_streak_type_loser_2,
        doubles_last_match_date = p_match_date::DATE
    WHERE id = p_loser_2_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create function to reverse doubles player stats (for updates/deletes)
CREATE OR REPLACE FUNCTION public.reverse_doubles_player_stats(
    p_winner_1_id UUID,
    p_winner_2_id UUID,
    p_loser_1_id UUID,
    p_loser_2_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_winner_1 RECORD;
    v_winner_2 RECORD;
    v_loser_1 RECORD;
    v_loser_2 RECORD;
    v_new_last5_winner_1 TEXT[];
    v_new_last5_winner_2 TEXT[];
    v_new_last5_loser_1 TEXT[];
    v_new_last5_loser_2 TEXT[];
    v_new_streak_winner_1 INTEGER;
    v_new_streak_winner_2 INTEGER;
    v_new_streak_loser_1 INTEGER;
    v_new_streak_loser_2 INTEGER;
    v_new_streak_type_winner_1 TEXT;
    v_new_streak_type_winner_2 TEXT;
    v_new_streak_type_loser_1 TEXT;
    v_new_streak_type_loser_2 TEXT;
BEGIN
    -- Get current stats for all players
    SELECT doubles_wins, doubles_losses, doubles_last5, doubles_current_streak, doubles_streak_type
    INTO v_winner_1
    FROM public.players
    WHERE id = p_winner_1_id;

    SELECT doubles_wins, doubles_losses, doubles_last5, doubles_current_streak, doubles_streak_type
    INTO v_winner_2
    FROM public.players
    WHERE id = p_winner_2_id;

    SELECT doubles_wins, doubles_losses, doubles_last5, doubles_current_streak, doubles_streak_type
    INTO v_loser_1
    FROM public.players
    WHERE id = p_loser_1_id;

    SELECT doubles_wins, doubles_losses, doubles_last5, doubles_current_streak, doubles_streak_type
    INTO v_loser_2
    FROM public.players
    WHERE id = p_loser_2_id;

    -- Reverse last5 (remove last element, add to front)
    -- For winners: remove the last 'W'
    IF array_length(v_winner_1.doubles_last5, 1) > 0 AND v_winner_1.doubles_last5[5] = 'W' THEN
        v_new_last5_winner_1 := ARRAY[v_winner_1.doubles_last5[1], v_winner_1.doubles_last5[2], v_winner_1.doubles_last5[3], v_winner_1.doubles_last5[4]];
    ELSE
        v_new_last5_winner_1 := v_winner_1.doubles_last5;
    END IF;

    IF array_length(v_winner_2.doubles_last5, 1) > 0 AND v_winner_2.doubles_last5[5] = 'W' THEN
        v_new_last5_winner_2 := ARRAY[v_winner_2.doubles_last5[1], v_winner_2.doubles_last5[2], v_winner_2.doubles_last5[3], v_winner_2.doubles_last5[4]];
    ELSE
        v_new_last5_winner_2 := v_winner_2.doubles_last5;
    END IF;

    -- For losers: remove the last 'L'
    IF array_length(v_loser_1.doubles_last5, 1) > 0 AND v_loser_1.doubles_last5[5] = 'L' THEN
        v_new_last5_loser_1 := ARRAY[v_loser_1.doubles_last5[1], v_loser_1.doubles_last5[2], v_loser_1.doubles_last5[3], v_loser_1.doubles_last5[4]];
    ELSE
        v_new_last5_loser_1 := v_loser_1.doubles_last5;
    END IF;

    IF array_length(v_loser_2.doubles_last5, 1) > 0 AND v_loser_2.doubles_last5[5] = 'L' THEN
        v_new_last5_loser_2 := ARRAY[v_loser_2.doubles_last5[1], v_loser_2.doubles_last5[2], v_loser_2.doubles_last5[3], v_loser_2.doubles_last5[4]];
    ELSE
        v_new_last5_loser_2 := v_loser_2.doubles_last5;
    END IF;

    -- Reverse streaks for winners (decrease or reset)
    IF v_winner_1.doubles_current_streak > 1 AND v_winner_1.doubles_streak_type = 'W' THEN
        v_new_streak_winner_1 := v_winner_1.doubles_current_streak - 1;
        v_new_streak_type_winner_1 := 'W';
    ELSE
        -- Need to check previous match to determine new streak
        -- For simplicity, reset to 0
        v_new_streak_winner_1 := 0;
        v_new_streak_type_winner_1 := 'W';
    END IF;

    IF v_winner_2.doubles_current_streak > 1 AND v_winner_2.doubles_streak_type = 'W' THEN
        v_new_streak_winner_2 := v_winner_2.doubles_current_streak - 1;
        v_new_streak_type_winner_2 := 'W';
    ELSE
        v_new_streak_winner_2 := 0;
        v_new_streak_type_winner_2 := 'W';
    END IF;

    -- Reverse streaks for losers (decrease or reset)
    IF v_loser_1.doubles_current_streak > 1 AND v_loser_1.doubles_streak_type = 'L' THEN
        v_new_streak_loser_1 := v_loser_1.doubles_current_streak - 1;
        v_new_streak_type_loser_1 := 'L';
    ELSE
        v_new_streak_loser_1 := 0;
        v_new_streak_type_loser_1 := 'L';
    END IF;

    IF v_loser_2.doubles_current_streak > 1 AND v_loser_2.doubles_streak_type = 'L' THEN
        v_new_streak_loser_2 := v_loser_2.doubles_current_streak - 1;
        v_new_streak_type_loser_2 := 'L';
    ELSE
        v_new_streak_loser_2 := 0;
        v_new_streak_type_loser_2 := 'L';
    END IF;

    -- Update winner 1 (decrease wins)
    UPDATE public.players
    SET 
        doubles_wins = GREATEST(0, doubles_wins - 1),
        doubles_last5 = v_new_last5_winner_1,
        doubles_current_streak = v_new_streak_winner_1,
        doubles_streak_type = v_new_streak_type_winner_1
    WHERE id = p_winner_1_id;

    -- Update winner 2 (decrease wins)
    UPDATE public.players
    SET 
        doubles_wins = GREATEST(0, doubles_wins - 1),
        doubles_last5 = v_new_last5_winner_2,
        doubles_current_streak = v_new_streak_winner_2,
        doubles_streak_type = v_new_streak_type_winner_2
    WHERE id = p_winner_2_id;

    -- Update loser 1 (decrease losses)
    UPDATE public.players
    SET 
        doubles_losses = GREATEST(0, doubles_losses - 1),
        doubles_last5 = v_new_last5_loser_1,
        doubles_current_streak = v_new_streak_loser_1,
        doubles_streak_type = v_new_streak_type_loser_1
    WHERE id = p_loser_1_id;

    -- Update loser 2 (decrease losses)
    UPDATE public.players
    SET 
        doubles_losses = GREATEST(0, doubles_losses - 1),
        doubles_last5 = v_new_last5_loser_2,
        doubles_current_streak = v_new_streak_loser_2,
        doubles_streak_type = v_new_streak_type_loser_2
    WHERE id = p_loser_2_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

