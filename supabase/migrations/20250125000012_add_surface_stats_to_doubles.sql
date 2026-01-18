-- Add surface stats updates to doubles player stats function
-- This ensures doubles matches update surface-specific stats (hard_wins, clay_wins, grass_wins, etc.)

-- Step 1: Update update_doubles_player_stats function to include surface parameter and update surface stats
CREATE OR REPLACE FUNCTION public.update_doubles_player_stats(
    p_winner_1_id UUID,
    p_winner_2_id UUID,
    p_loser_1_id UUID,
    p_loser_2_id UUID,
    p_match_date TIMESTAMP WITH TIME ZONE,
    p_surface TEXT DEFAULT NULL
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
    -- Surface-specific stats
    v_winner_1_surface_wins INTEGER;
    v_winner_1_surface_losses INTEGER;
    v_winner_2_surface_wins INTEGER;
    v_winner_2_surface_losses INTEGER;
    v_loser_1_surface_wins INTEGER;
    v_loser_1_surface_losses INTEGER;
    v_loser_2_surface_wins INTEGER;
    v_loser_2_surface_losses INTEGER;
    v_winner_1_surface_win_rate DECIMAL(5,2);
    v_winner_2_surface_win_rate DECIMAL(5,2);
    v_loser_1_surface_win_rate DECIMAL(5,2);
    v_loser_2_surface_win_rate DECIMAL(5,2);
BEGIN
    -- Get current stats for all players including surface stats
    SELECT 
        doubles_wins, doubles_losses, doubles_last5, doubles_current_streak, doubles_streak_type,
        CASE 
            WHEN p_surface = 'Hard' THEN hard_wins
            WHEN p_surface = 'Clay' THEN clay_wins
            WHEN p_surface = 'Grass' THEN grass_wins
            ELSE 0
        END as surface_wins,
        CASE 
            WHEN p_surface = 'Hard' THEN hard_losses
            WHEN p_surface = 'Clay' THEN clay_losses
            WHEN p_surface = 'Grass' THEN grass_losses
            ELSE 0
        END as surface_losses
    INTO v_winner_1
    FROM public.players
    WHERE id = p_winner_1_id;

    SELECT 
        doubles_wins, doubles_losses, doubles_last5, doubles_current_streak, doubles_streak_type,
        CASE 
            WHEN p_surface = 'Hard' THEN hard_wins
            WHEN p_surface = 'Clay' THEN clay_wins
            WHEN p_surface = 'Grass' THEN grass_wins
            ELSE 0
        END as surface_wins,
        CASE 
            WHEN p_surface = 'Hard' THEN hard_losses
            WHEN p_surface = 'Clay' THEN clay_losses
            WHEN p_surface = 'Grass' THEN grass_losses
            ELSE 0
        END as surface_losses
    INTO v_winner_2
    FROM public.players
    WHERE id = p_winner_2_id;

    SELECT 
        doubles_wins, doubles_losses, doubles_last5, doubles_current_streak, doubles_streak_type,
        CASE 
            WHEN p_surface = 'Hard' THEN hard_wins
            WHEN p_surface = 'Clay' THEN clay_wins
            WHEN p_surface = 'Grass' THEN grass_wins
            ELSE 0
        END as surface_wins,
        CASE 
            WHEN p_surface = 'Hard' THEN hard_losses
            WHEN p_surface = 'Clay' THEN clay_losses
            WHEN p_surface = 'Grass' THEN grass_losses
            ELSE 0
        END as surface_losses
    INTO v_loser_1
    FROM public.players
    WHERE id = p_loser_1_id;

    SELECT 
        doubles_wins, doubles_losses, doubles_last5, doubles_current_streak, doubles_streak_type,
        CASE 
            WHEN p_surface = 'Hard' THEN hard_wins
            WHEN p_surface = 'Clay' THEN clay_wins
            WHEN p_surface = 'Grass' THEN grass_wins
            ELSE 0
        END as surface_wins,
        CASE 
            WHEN p_surface = 'Hard' THEN hard_losses
            WHEN p_surface = 'Clay' THEN clay_losses
            WHEN p_surface = 'Grass' THEN grass_losses
            ELSE 0
        END as surface_losses
    INTO v_loser_2
    FROM public.players
    WHERE id = p_loser_2_id;

    -- Extract surface stats
    v_winner_1_surface_wins := v_winner_1.surface_wins;
    v_winner_1_surface_losses := v_winner_1.surface_losses;
    v_winner_2_surface_wins := v_winner_2.surface_wins;
    v_winner_2_surface_losses := v_winner_2.surface_losses;
    v_loser_1_surface_wins := v_loser_1.surface_wins;
    v_loser_1_surface_losses := v_loser_1.surface_losses;
    v_loser_2_surface_wins := v_loser_2.surface_wins;
    v_loser_2_surface_losses := v_loser_2.surface_losses;

    -- Calculate surface-specific win rates
    v_winner_1_surface_win_rate := CASE 
        WHEN (v_winner_1_surface_wins + 1 + v_winner_1_surface_losses) > 0 
        THEN ROUND(((v_winner_1_surface_wins + 1)::DECIMAL / (v_winner_1_surface_wins + 1 + v_winner_1_surface_losses)) * 100, 2)
        ELSE 0
    END;

    v_winner_2_surface_win_rate := CASE 
        WHEN (v_winner_2_surface_wins + 1 + v_winner_2_surface_losses) > 0 
        THEN ROUND(((v_winner_2_surface_wins + 1)::DECIMAL / (v_winner_2_surface_wins + 1 + v_winner_2_surface_losses)) * 100, 2)
        ELSE 0
    END;

    v_loser_1_surface_win_rate := CASE 
        WHEN (v_loser_1_surface_wins + v_loser_1_surface_losses + 1) > 0 
        THEN ROUND((v_loser_1_surface_wins::DECIMAL / (v_loser_1_surface_wins + v_loser_1_surface_losses + 1)) * 100, 2)
        ELSE 0
    END;

    v_loser_2_surface_win_rate := CASE 
        WHEN (v_loser_2_surface_wins + v_loser_2_surface_losses + 1) > 0 
        THEN ROUND((v_loser_2_surface_wins::DECIMAL / (v_loser_2_surface_wins + v_loser_2_surface_losses + 1)) * 100, 2)
        ELSE 0
    END;

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

    -- Update winner 1 with surface stats
    UPDATE public.players
    SET 
        doubles_wins = doubles_wins + 1,
        doubles_last5 = v_new_last5_winner_1,
        doubles_current_streak = v_new_streak_winner_1,
        doubles_streak_type = v_new_streak_type_winner_1,
        doubles_last_match_date = p_match_date::DATE,
        -- Surface-specific stats (only update if surface is provided)
        hard_wins = CASE WHEN p_surface = 'Hard' THEN hard_wins + 1 ELSE hard_wins END,
        clay_wins = CASE WHEN p_surface = 'Clay' THEN clay_wins + 1 ELSE clay_wins END,
        grass_wins = CASE WHEN p_surface = 'Grass' THEN grass_wins + 1 ELSE grass_wins END,
        hard_win_rate = CASE WHEN p_surface = 'Hard' THEN v_winner_1_surface_win_rate ELSE hard_win_rate END,
        clay_win_rate = CASE WHEN p_surface = 'Clay' THEN v_winner_1_surface_win_rate ELSE clay_win_rate END,
        grass_win_rate = CASE WHEN p_surface = 'Grass' THEN v_winner_1_surface_win_rate ELSE grass_win_rate END,
        hard_matches = CASE WHEN p_surface = 'Hard' THEN hard_matches + 1 ELSE hard_matches END,
        clay_matches = CASE WHEN p_surface = 'Clay' THEN clay_matches + 1 ELSE clay_matches END,
        grass_matches = CASE WHEN p_surface = 'Grass' THEN grass_matches + 1 ELSE grass_matches END
    WHERE id = p_winner_1_id;

    -- Update winner 2 with surface stats
    UPDATE public.players
    SET 
        doubles_wins = doubles_wins + 1,
        doubles_last5 = v_new_last5_winner_2,
        doubles_current_streak = v_new_streak_winner_2,
        doubles_streak_type = v_new_streak_type_winner_2,
        doubles_last_match_date = p_match_date::DATE,
        -- Surface-specific stats (only update if surface is provided)
        hard_wins = CASE WHEN p_surface = 'Hard' THEN hard_wins + 1 ELSE hard_wins END,
        clay_wins = CASE WHEN p_surface = 'Clay' THEN clay_wins + 1 ELSE clay_wins END,
        grass_wins = CASE WHEN p_surface = 'Grass' THEN grass_wins + 1 ELSE grass_wins END,
        hard_win_rate = CASE WHEN p_surface = 'Hard' THEN v_winner_2_surface_win_rate ELSE hard_win_rate END,
        clay_win_rate = CASE WHEN p_surface = 'Clay' THEN v_winner_2_surface_win_rate ELSE clay_win_rate END,
        grass_win_rate = CASE WHEN p_surface = 'Grass' THEN v_winner_2_surface_win_rate ELSE grass_win_rate END,
        hard_matches = CASE WHEN p_surface = 'Hard' THEN hard_matches + 1 ELSE hard_matches END,
        clay_matches = CASE WHEN p_surface = 'Clay' THEN clay_matches + 1 ELSE clay_matches END,
        grass_matches = CASE WHEN p_surface = 'Grass' THEN grass_matches + 1 ELSE grass_matches END
    WHERE id = p_winner_2_id;

    -- Update loser 1 with surface stats
    UPDATE public.players
    SET 
        doubles_losses = doubles_losses + 1,
        doubles_last5 = v_new_last5_loser_1,
        doubles_current_streak = v_new_streak_loser_1,
        doubles_streak_type = v_new_streak_type_loser_1,
        doubles_last_match_date = p_match_date::DATE,
        -- Surface-specific stats (only update if surface is provided)
        hard_losses = CASE WHEN p_surface = 'Hard' THEN hard_losses + 1 ELSE hard_losses END,
        clay_losses = CASE WHEN p_surface = 'Clay' THEN clay_losses + 1 ELSE clay_losses END,
        grass_losses = CASE WHEN p_surface = 'Grass' THEN grass_losses + 1 ELSE grass_losses END,
        hard_win_rate = CASE WHEN p_surface = 'Hard' THEN v_loser_1_surface_win_rate ELSE hard_win_rate END,
        clay_win_rate = CASE WHEN p_surface = 'Clay' THEN v_loser_1_surface_win_rate ELSE clay_win_rate END,
        grass_win_rate = CASE WHEN p_surface = 'Grass' THEN v_loser_1_surface_win_rate ELSE grass_win_rate END,
        hard_matches = CASE WHEN p_surface = 'Hard' THEN hard_matches + 1 ELSE hard_matches END,
        clay_matches = CASE WHEN p_surface = 'Clay' THEN clay_matches + 1 ELSE clay_matches END,
        grass_matches = CASE WHEN p_surface = 'Grass' THEN grass_matches + 1 ELSE grass_matches END
    WHERE id = p_loser_1_id;

    -- Update loser 2 with surface stats
    UPDATE public.players
    SET 
        doubles_losses = doubles_losses + 1,
        doubles_last5 = v_new_last5_loser_2,
        doubles_current_streak = v_new_streak_loser_2,
        doubles_streak_type = v_new_streak_type_loser_2,
        doubles_last_match_date = p_match_date::DATE,
        -- Surface-specific stats (only update if surface is provided)
        hard_losses = CASE WHEN p_surface = 'Hard' THEN hard_losses + 1 ELSE hard_losses END,
        clay_losses = CASE WHEN p_surface = 'Clay' THEN clay_losses + 1 ELSE clay_losses END,
        grass_losses = CASE WHEN p_surface = 'Grass' THEN grass_losses + 1 ELSE grass_losses END,
        hard_win_rate = CASE WHEN p_surface = 'Hard' THEN v_loser_2_surface_win_rate ELSE hard_win_rate END,
        clay_win_rate = CASE WHEN p_surface = 'Clay' THEN v_loser_2_surface_win_rate ELSE clay_win_rate END,
        grass_win_rate = CASE WHEN p_surface = 'Grass' THEN v_loser_2_surface_win_rate ELSE grass_win_rate END,
        hard_matches = CASE WHEN p_surface = 'Hard' THEN hard_matches + 1 ELSE hard_matches END,
        clay_matches = CASE WHEN p_surface = 'Clay' THEN clay_matches + 1 ELSE clay_matches END,
        grass_matches = CASE WHEN p_surface = 'Grass' THEN grass_matches + 1 ELSE grass_matches END
    WHERE id = p_loser_2_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Update reverse_doubles_player_stats function to include surface parameter and reverse surface stats
CREATE OR REPLACE FUNCTION public.reverse_doubles_player_stats(
    p_winner_1_id UUID,
    p_winner_2_id UUID,
    p_loser_1_id UUID,
    p_loser_2_id UUID,
    p_surface TEXT DEFAULT NULL
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
    -- Surface-specific stats for reversal
    v_winner_1_surface_wins INTEGER;
    v_winner_1_surface_losses INTEGER;
    v_winner_2_surface_wins INTEGER;
    v_winner_2_surface_losses INTEGER;
    v_loser_1_surface_wins INTEGER;
    v_loser_1_surface_losses INTEGER;
    v_loser_2_surface_wins INTEGER;
    v_loser_2_surface_losses INTEGER;
    v_winner_1_surface_win_rate DECIMAL(5,2);
    v_winner_2_surface_win_rate DECIMAL(5,2);
    v_loser_1_surface_win_rate DECIMAL(5,2);
    v_loser_2_surface_win_rate DECIMAL(5,2);
BEGIN
    -- Get current stats for all players including surface stats
    SELECT 
        doubles_wins, doubles_losses, doubles_last5, doubles_current_streak, doubles_streak_type,
        CASE 
            WHEN p_surface = 'Hard' THEN hard_wins
            WHEN p_surface = 'Clay' THEN clay_wins
            WHEN p_surface = 'Grass' THEN grass_wins
            ELSE 0
        END as surface_wins,
        CASE 
            WHEN p_surface = 'Hard' THEN hard_losses
            WHEN p_surface = 'Clay' THEN clay_losses
            WHEN p_surface = 'Grass' THEN grass_losses
            ELSE 0
        END as surface_losses
    INTO v_winner_1
    FROM public.players
    WHERE id = p_winner_1_id;

    SELECT 
        doubles_wins, doubles_losses, doubles_last5, doubles_current_streak, doubles_streak_type,
        CASE 
            WHEN p_surface = 'Hard' THEN hard_wins
            WHEN p_surface = 'Clay' THEN clay_wins
            WHEN p_surface = 'Grass' THEN grass_wins
            ELSE 0
        END as surface_wins,
        CASE 
            WHEN p_surface = 'Hard' THEN hard_losses
            WHEN p_surface = 'Clay' THEN clay_losses
            WHEN p_surface = 'Grass' THEN grass_losses
            ELSE 0
        END as surface_losses
    INTO v_winner_2
    FROM public.players
    WHERE id = p_winner_2_id;

    SELECT 
        doubles_wins, doubles_losses, doubles_last5, doubles_current_streak, doubles_streak_type,
        CASE 
            WHEN p_surface = 'Hard' THEN hard_wins
            WHEN p_surface = 'Clay' THEN clay_wins
            WHEN p_surface = 'Grass' THEN grass_wins
            ELSE 0
        END as surface_wins,
        CASE 
            WHEN p_surface = 'Hard' THEN hard_losses
            WHEN p_surface = 'Clay' THEN clay_losses
            WHEN p_surface = 'Grass' THEN grass_losses
            ELSE 0
        END as surface_losses
    INTO v_loser_1
    FROM public.players
    WHERE id = p_loser_1_id;

    SELECT 
        doubles_wins, doubles_losses, doubles_last5, doubles_current_streak, doubles_streak_type,
        CASE 
            WHEN p_surface = 'Hard' THEN hard_wins
            WHEN p_surface = 'Clay' THEN clay_wins
            WHEN p_surface = 'Grass' THEN grass_wins
            ELSE 0
        END as surface_wins,
        CASE 
            WHEN p_surface = 'Hard' THEN hard_losses
            WHEN p_surface = 'Clay' THEN clay_losses
            WHEN p_surface = 'Grass' THEN grass_losses
            ELSE 0
        END as surface_losses
    INTO v_loser_2
    FROM public.players
    WHERE id = p_loser_2_id;

    -- Extract surface stats
    v_winner_1_surface_wins := v_winner_1.surface_wins;
    v_winner_1_surface_losses := v_winner_1.surface_losses;
    v_winner_2_surface_wins := v_winner_2.surface_wins;
    v_winner_2_surface_losses := v_winner_2.surface_losses;
    v_loser_1_surface_wins := v_loser_1.surface_wins;
    v_loser_1_surface_losses := v_loser_1.surface_losses;
    v_loser_2_surface_wins := v_loser_2.surface_wins;
    v_loser_2_surface_losses := v_loser_2.surface_losses;

    -- Calculate surface-specific win rates after reversal
    v_winner_1_surface_win_rate := CASE 
        WHEN (GREATEST(0, v_winner_1_surface_wins - 1) + v_winner_1_surface_losses) > 0 
        THEN ROUND((GREATEST(0, v_winner_1_surface_wins - 1)::DECIMAL / (GREATEST(0, v_winner_1_surface_wins - 1) + v_winner_1_surface_losses)) * 100, 2)
        ELSE 0
    END;

    v_winner_2_surface_win_rate := CASE 
        WHEN (GREATEST(0, v_winner_2_surface_wins - 1) + v_winner_2_surface_losses) > 0 
        THEN ROUND((GREATEST(0, v_winner_2_surface_wins - 1)::DECIMAL / (GREATEST(0, v_winner_2_surface_wins - 1) + v_winner_2_surface_losses)) * 100, 2)
        ELSE 0
    END;

    v_loser_1_surface_win_rate := CASE 
        WHEN (v_loser_1_surface_wins + GREATEST(0, v_loser_1_surface_losses - 1)) > 0 
        THEN ROUND((v_loser_1_surface_wins::DECIMAL / (v_loser_1_surface_wins + GREATEST(0, v_loser_1_surface_losses - 1))) * 100, 2)
        ELSE 0
    END;

    v_loser_2_surface_win_rate := CASE 
        WHEN (v_loser_2_surface_wins + GREATEST(0, v_loser_2_surface_losses - 1)) > 0 
        THEN ROUND((v_loser_2_surface_wins::DECIMAL / (v_loser_2_surface_wins + GREATEST(0, v_loser_2_surface_losses - 1))) * 100, 2)
        ELSE 0
    END;

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

    -- Update winner 1 (decrease wins and reverse surface stats)
    UPDATE public.players
    SET 
        doubles_wins = GREATEST(0, doubles_wins - 1),
        doubles_last5 = v_new_last5_winner_1,
        doubles_current_streak = v_new_streak_winner_1,
        doubles_streak_type = v_new_streak_type_winner_1,
        -- Surface-specific stats reversal (only update if surface is provided)
        hard_wins = CASE WHEN p_surface = 'Hard' THEN GREATEST(0, hard_wins - 1) ELSE hard_wins END,
        clay_wins = CASE WHEN p_surface = 'Clay' THEN GREATEST(0, clay_wins - 1) ELSE clay_wins END,
        grass_wins = CASE WHEN p_surface = 'Grass' THEN GREATEST(0, grass_wins - 1) ELSE grass_wins END,
        hard_win_rate = CASE WHEN p_surface = 'Hard' THEN v_winner_1_surface_win_rate ELSE hard_win_rate END,
        clay_win_rate = CASE WHEN p_surface = 'Clay' THEN v_winner_1_surface_win_rate ELSE clay_win_rate END,
        grass_win_rate = CASE WHEN p_surface = 'Grass' THEN v_winner_1_surface_win_rate ELSE grass_win_rate END,
        hard_matches = CASE WHEN p_surface = 'Hard' THEN GREATEST(0, hard_matches - 1) ELSE hard_matches END,
        clay_matches = CASE WHEN p_surface = 'Clay' THEN GREATEST(0, clay_matches - 1) ELSE clay_matches END,
        grass_matches = CASE WHEN p_surface = 'Grass' THEN GREATEST(0, grass_matches - 1) ELSE grass_matches END
    WHERE id = p_winner_1_id;

    -- Update winner 2 (decrease wins and reverse surface stats)
    UPDATE public.players
    SET 
        doubles_wins = GREATEST(0, doubles_wins - 1),
        doubles_last5 = v_new_last5_winner_2,
        doubles_current_streak = v_new_streak_winner_2,
        doubles_streak_type = v_new_streak_type_winner_2,
        -- Surface-specific stats reversal (only update if surface is provided)
        hard_wins = CASE WHEN p_surface = 'Hard' THEN GREATEST(0, hard_wins - 1) ELSE hard_wins END,
        clay_wins = CASE WHEN p_surface = 'Clay' THEN GREATEST(0, clay_wins - 1) ELSE clay_wins END,
        grass_wins = CASE WHEN p_surface = 'Grass' THEN GREATEST(0, grass_wins - 1) ELSE grass_wins END,
        hard_win_rate = CASE WHEN p_surface = 'Hard' THEN v_winner_2_surface_win_rate ELSE hard_win_rate END,
        clay_win_rate = CASE WHEN p_surface = 'Clay' THEN v_winner_2_surface_win_rate ELSE clay_win_rate END,
        grass_win_rate = CASE WHEN p_surface = 'Grass' THEN v_winner_2_surface_win_rate ELSE grass_win_rate END,
        hard_matches = CASE WHEN p_surface = 'Hard' THEN GREATEST(0, hard_matches - 1) ELSE hard_matches END,
        clay_matches = CASE WHEN p_surface = 'Clay' THEN GREATEST(0, clay_matches - 1) ELSE clay_matches END,
        grass_matches = CASE WHEN p_surface = 'Grass' THEN GREATEST(0, grass_matches - 1) ELSE grass_matches END
    WHERE id = p_winner_2_id;

    -- Update loser 1 (decrease losses and reverse surface stats)
    UPDATE public.players
    SET 
        doubles_losses = GREATEST(0, doubles_losses - 1),
        doubles_last5 = v_new_last5_loser_1,
        doubles_current_streak = v_new_streak_loser_1,
        doubles_streak_type = v_new_streak_type_loser_1,
        -- Surface-specific stats reversal (only update if surface is provided)
        hard_losses = CASE WHEN p_surface = 'Hard' THEN GREATEST(0, hard_losses - 1) ELSE hard_losses END,
        clay_losses = CASE WHEN p_surface = 'Clay' THEN GREATEST(0, clay_losses - 1) ELSE clay_losses END,
        grass_losses = CASE WHEN p_surface = 'Grass' THEN GREATEST(0, grass_losses - 1) ELSE grass_losses END,
        hard_win_rate = CASE WHEN p_surface = 'Hard' THEN v_loser_1_surface_win_rate ELSE hard_win_rate END,
        clay_win_rate = CASE WHEN p_surface = 'Clay' THEN v_loser_1_surface_win_rate ELSE clay_win_rate END,
        grass_win_rate = CASE WHEN p_surface = 'Grass' THEN v_loser_1_surface_win_rate ELSE grass_win_rate END,
        hard_matches = CASE WHEN p_surface = 'Hard' THEN GREATEST(0, hard_matches - 1) ELSE hard_matches END,
        clay_matches = CASE WHEN p_surface = 'Clay' THEN GREATEST(0, clay_matches - 1) ELSE clay_matches END,
        grass_matches = CASE WHEN p_surface = 'Grass' THEN GREATEST(0, grass_matches - 1) ELSE grass_matches END
    WHERE id = p_loser_1_id;

    -- Update loser 2 (decrease losses and reverse surface stats)
    UPDATE public.players
    SET 
        doubles_losses = GREATEST(0, doubles_losses - 1),
        doubles_last5 = v_new_last5_loser_2,
        doubles_current_streak = v_new_streak_loser_2,
        doubles_streak_type = v_new_streak_type_loser_2,
        -- Surface-specific stats reversal (only update if surface is provided)
        hard_losses = CASE WHEN p_surface = 'Hard' THEN GREATEST(0, hard_losses - 1) ELSE hard_losses END,
        clay_losses = CASE WHEN p_surface = 'Clay' THEN GREATEST(0, clay_losses - 1) ELSE clay_losses END,
        grass_losses = CASE WHEN p_surface = 'Grass' THEN GREATEST(0, grass_losses - 1) ELSE grass_losses END,
        hard_win_rate = CASE WHEN p_surface = 'Hard' THEN v_loser_2_surface_win_rate ELSE hard_win_rate END,
        clay_win_rate = CASE WHEN p_surface = 'Clay' THEN v_loser_2_surface_win_rate ELSE clay_win_rate END,
        grass_win_rate = CASE WHEN p_surface = 'Grass' THEN v_loser_2_surface_win_rate ELSE grass_win_rate END,
        hard_matches = CASE WHEN p_surface = 'Hard' THEN GREATEST(0, hard_matches - 1) ELSE hard_matches END,
        clay_matches = CASE WHEN p_surface = 'Clay' THEN GREATEST(0, clay_matches - 1) ELSE clay_matches END,
        grass_matches = CASE WHEN p_surface = 'Grass' THEN GREATEST(0, grass_matches - 1) ELSE grass_matches END
    WHERE id = p_loser_2_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Update the trigger function to pass surface to update_doubles_player_stats
CREATE OR REPLACE FUNCTION public.trigger_update_player_stats_on_insert()
RETURNS TRIGGER AS $$
DECLARE
    match_record RECORD;
    tournament_record RECORD;
    player_a_id UUID;
    player_b_id UUID;
    player_a1_id UUID;
    player_a2_id UUID;
    player_b1_id UUID;
    player_b2_id UUID;
    winner_id UUID;
    loser_id UUID;
    winner_team TEXT;
    match_type_value TEXT;
    surface TEXT;
BEGIN
    -- Get match details including match_type and all player fields
    BEGIN
        SELECT 
            m.player_a_id, 
            m.player_b_id,
            m.player_a1_id,
            m.player_a2_id,
            m.player_b1_id,
            m.player_b2_id,
            m.match_type,
            t.surface
        INTO match_record
        FROM public.matches m
        JOIN public.tournaments t ON m.tournament_id = t.id
        WHERE m.id = NEW.match_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Match not found for match_id: %', NEW.match_id;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Error fetching match details for match_id %: %', NEW.match_id, SQLERRM;
        RAISE;
    END;

    player_a_id := match_record.player_a_id;
    player_b_id := match_record.player_b_id;
    player_a1_id := match_record.player_a1_id;
    player_a2_id := match_record.player_a2_id;
    player_b1_id := match_record.player_b1_id;
    player_b2_id := match_record.player_b2_id;
    match_type_value := match_record.match_type;
    surface := match_record.surface;
    winner_id := NEW.winner_id;
    winner_team := NEW.match_winner_team;

    -- Handle doubles matches
    IF match_type_value = 'doubles' THEN
        -- Validate doubles match data
        IF player_a1_id IS NULL OR player_a2_id IS NULL OR 
           player_b1_id IS NULL OR player_b2_id IS NULL THEN
            RAISE EXCEPTION 'Incomplete doubles match data for match_id: %. player_a1_id: %, player_a2_id: %, player_b1_id: %, player_b2_id: %', 
                NEW.match_id, player_a1_id, player_a2_id, player_b1_id, player_b2_id;
        END IF;

        IF winner_team IS NULL THEN
            RAISE EXCEPTION 'match_winner_team is required for doubles matches. match_id: %', NEW.match_id;
        END IF;

        RAISE LOG 'Updating doubles stats for match_id: %, winner_team: %, surface: %, players: a1=%, a2=%, b1=%, b2=%', 
            NEW.match_id, winner_team, surface, player_a1_id, player_a2_id, player_b1_id, player_b2_id;

        -- Update partnerships for both teams
        BEGIN
            -- Team A partnership: if team_a won, pass a1 (partnership won), else pass b1 (partnership lost)
            PERFORM public.update_partnership_record(
                player_a1_id,
                player_a2_id,
                CASE WHEN winner_team = 'team_a' THEN player_a1_id ELSE player_b1_id END,
                NEW.created_at
            );
            RAISE LOG 'Updated partnership record for team A (%, %)', player_a1_id, player_a2_id;
        EXCEPTION WHEN OTHERS THEN
            RAISE LOG 'Error updating partnership record for team A (%, %): %', player_a1_id, player_a2_id, SQLERRM;
            RAISE;
        END;

        BEGIN
            -- Team B partnership: if team_b won, pass b1 (partnership won), else pass a1 (partnership lost)
            PERFORM public.update_partnership_record(
                player_b1_id,
                player_b2_id,
                CASE WHEN winner_team = 'team_b' THEN player_b1_id ELSE player_a1_id END,
                NEW.created_at
            );
            RAISE LOG 'Updated partnership record for team B (%, %)', player_b1_id, player_b2_id;
        EXCEPTION WHEN OTHERS THEN
            RAISE LOG 'Error updating partnership record for team B (%, %): %', player_b1_id, player_b2_id, SQLERRM;
            RAISE;
        END;

        -- Update doubles H2H record
        BEGIN
            PERFORM public.update_doubles_h2h_record(
                player_a1_id,
                player_a2_id,
                player_b1_id,
                player_b2_id,
                winner_team,
                NEW.created_at
            );
            RAISE LOG 'Updated doubles H2H record';
        EXCEPTION WHEN OTHERS THEN
            RAISE LOG 'Error updating doubles H2H record: %', SQLERRM;
            RAISE;
        END;

        -- Update doubles-specific player stats with surface information
        BEGIN
            IF winner_team = 'team_a' THEN
                PERFORM public.update_doubles_player_stats(
                    player_a1_id,
                    player_a2_id,
                    player_b1_id,
                    player_b2_id,
                    NEW.created_at,
                    surface
                );
                RAISE LOG 'Updated doubles player stats: team A (%, %) won, team B (%, %) lost on surface %', 
                    player_a1_id, player_a2_id, player_b1_id, player_b2_id, surface;
            ELSE
                PERFORM public.update_doubles_player_stats(
                    player_b1_id,
                    player_b2_id,
                    player_a1_id,
                    player_a2_id,
                    NEW.created_at,
                    surface
                );
                RAISE LOG 'Updated doubles player stats: team B (%, %) won, team A (%, %) lost on surface %', 
                    player_b1_id, player_b2_id, player_a1_id, player_a2_id, surface;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE LOG 'Error updating doubles player stats: %', SQLERRM;
            RAISE;
        END;

    ELSE
        -- Handle singles matches (existing logic)
        -- Determine loser
        IF winner_id = player_a_id THEN
            loser_id := player_b_id;
        ELSE
            loser_id := player_a_id;
        END IF;

        -- Update player stats with surface information
        PERFORM public.update_player_stats(winner_id, loser_id, NEW.created_at, surface);

        -- Update head-to-head record
        PERFORM public.update_head_to_head_record(player_a_id, player_b_id, winner_id, NEW.created_at);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Update the update trigger to pass surface to reverse_doubles_player_stats
CREATE OR REPLACE FUNCTION public.trigger_update_player_stats_on_update()
RETURNS TRIGGER AS $$
DECLARE
    match_record RECORD;
    player_a_id UUID;
    player_b_id UUID;
    player_a1_id UUID;
    player_a2_id UUID;
    player_b1_id UUID;
    player_b2_id UUID;
    old_winner_id UUID;
    new_winner_id UUID;
    old_winner_team TEXT;
    new_winner_team TEXT;
    old_loser_id UUID;
    new_loser_id UUID;
    match_type_value TEXT;
    surface TEXT;
BEGIN
    -- Get match details including match_type and all player fields
    SELECT 
        m.player_a_id, 
        m.player_b_id,
        m.player_a1_id,
        m.player_a2_id,
        m.player_b1_id,
        m.player_b2_id,
        m.match_type,
        t.surface
    INTO match_record
    FROM public.matches m
    JOIN public.tournaments t ON m.tournament_id = t.id
    WHERE m.id = NEW.match_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Match not found for match_id: %', NEW.match_id;
    END IF;

    player_a_id := match_record.player_a_id;
    player_b_id := match_record.player_b_id;
    player_a1_id := match_record.player_a1_id;
    player_a2_id := match_record.player_a2_id;
    player_b1_id := match_record.player_b1_id;
    player_b2_id := match_record.player_b2_id;
    match_type_value := match_record.match_type;
    surface := match_record.surface;
    old_winner_id := OLD.winner_id;
    new_winner_id := NEW.winner_id;
    old_winner_team := OLD.match_winner_team;
    new_winner_team := NEW.match_winner_team;

    -- Handle doubles matches
    IF match_type_value = 'doubles' THEN
        -- Validate doubles match data
        IF player_a1_id IS NULL OR player_a2_id IS NULL OR 
           player_b1_id IS NULL OR player_b2_id IS NULL THEN
            RAISE EXCEPTION 'Incomplete doubles match data for match_id: %', NEW.match_id;
        END IF;

        -- Only process if winner team changed
        IF old_winner_team IS DISTINCT FROM new_winner_team THEN
            -- Reverse old partnerships
            IF old_winner_team IS NOT NULL THEN
                -- Reverse Team A partnership
                PERFORM public.reverse_partnership_record(
                    player_a1_id,
                    player_a2_id,
                    CASE WHEN old_winner_team = 'team_a' THEN player_a1_id ELSE player_b1_id END
                );

                -- Reverse Team B partnership
                PERFORM public.reverse_partnership_record(
                    player_b1_id,
                    player_b2_id,
                    CASE WHEN old_winner_team = 'team_b' THEN player_b1_id ELSE player_a1_id END
                );

                -- Reverse doubles H2H
                PERFORM public.reverse_doubles_h2h_record(
                    player_a1_id,
                    player_a2_id,
                    player_b1_id,
                    player_b2_id,
                    old_winner_team
                );

                -- Reverse doubles player stats with surface
                IF old_winner_team = 'team_a' THEN
                    PERFORM public.reverse_doubles_player_stats(
                        player_a1_id,
                        player_a2_id,
                        player_b1_id,
                        player_b2_id,
                        surface
                    );
                ELSE
                    PERFORM public.reverse_doubles_player_stats(
                        player_b1_id,
                        player_b2_id,
                        player_a1_id,
                        player_a2_id,
                        surface
                    );
                END IF;
            END IF;

            -- Apply new partnerships
            IF new_winner_team IS NOT NULL THEN
                -- Team A partnership
                PERFORM public.update_partnership_record(
                    player_a1_id,
                    player_a2_id,
                    CASE WHEN new_winner_team = 'team_a' THEN player_a1_id ELSE player_b1_id END,
                    NEW.updated_at
                );

                -- Team B partnership
                PERFORM public.update_partnership_record(
                    player_b1_id,
                    player_b2_id,
                    CASE WHEN new_winner_team = 'team_b' THEN player_b1_id ELSE player_a1_id END,
                    NEW.updated_at
                );

                -- Update doubles H2H
                PERFORM public.update_doubles_h2h_record(
                    player_a1_id,
                    player_a2_id,
                    player_b1_id,
                    player_b2_id,
                    new_winner_team,
                    NEW.updated_at
                );

                -- Update doubles player stats with surface
                IF new_winner_team = 'team_a' THEN
                    PERFORM public.update_doubles_player_stats(
                        player_a1_id,
                        player_a2_id,
                        player_b1_id,
                        player_b2_id,
                        NEW.updated_at,
                        surface
                    );
                ELSE
                    PERFORM public.update_doubles_player_stats(
                        player_b1_id,
                        player_b2_id,
                        player_a1_id,
                        player_a2_id,
                        NEW.updated_at,
                        surface
                    );
                END IF;
            END IF;
        END IF;

    ELSE
        -- Handle singles matches (existing logic)
        -- Only process if winner changed
        IF old_winner_id != new_winner_id THEN
            -- Determine old loser
            IF old_winner_id = player_a_id THEN
                old_loser_id := player_b_id;
            ELSE
                old_loser_id := player_a_id;
            END IF;

            -- Determine new loser
            IF new_winner_id = player_a_id THEN
                new_loser_id := player_b_id;
            ELSE
                new_loser_id := player_a_id;
            END IF;

            -- Reverse old stats with surface information
            PERFORM public.reverse_player_stats(old_winner_id, old_loser_id, surface);

            -- Apply new stats with surface information
            PERFORM public.update_player_stats(new_winner_id, new_loser_id, NEW.updated_at, surface);

            -- Update head-to-head record
            PERFORM public.update_head_to_head_record(player_a_id, player_b_id, new_winner_id, NEW.updated_at);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Update the delete trigger to pass surface to reverse_doubles_player_stats
CREATE OR REPLACE FUNCTION public.trigger_update_player_stats_on_delete()
RETURNS TRIGGER AS $$
DECLARE
    match_record RECORD;
    player_a_id UUID;
    player_b_id UUID;
    player_a1_id UUID;
    player_a2_id UUID;
    player_b1_id UUID;
    player_b2_id UUID;
    winner_id UUID;
    loser_id UUID;
    winner_team TEXT;
    match_type_value TEXT;
    surface TEXT;
BEGIN
    -- Get match details including match_type and all player fields
    -- If match is already deleted (e.g., during bulk delete), gracefully skip stats reversal
    SELECT 
        m.player_a_id, 
        m.player_b_id,
        m.player_a1_id,
        m.player_a2_id,
        m.player_b1_id,
        m.player_b2_id,
        m.match_type,
        t.surface
    INTO match_record
    FROM public.matches m
    JOIN public.tournaments t ON m.tournament_id = t.id
    WHERE m.id = OLD.match_id;

    -- If match not found (already deleted), skip stats reversal
    -- This allows bulk deletion of matches without errors
    IF NOT FOUND THEN
        -- Log for debugging but don't raise exception
        RAISE LOG 'Match % already deleted, skipping stats reversal for match_result', OLD.match_id;
        RETURN OLD;
    END IF;

    player_a_id := match_record.player_a_id;
    player_b_id := match_record.player_b_id;
    player_a1_id := match_record.player_a1_id;
    player_a2_id := match_record.player_a2_id;
    player_b1_id := match_record.player_b1_id;
    player_b2_id := match_record.player_b2_id;
    match_type_value := match_record.match_type;
    surface := match_record.surface;
    winner_id := OLD.winner_id;
    winner_team := OLD.match_winner_team;

    -- Handle doubles matches
    IF match_type_value = 'doubles' THEN
        -- Validate doubles match data
        IF player_a1_id IS NULL OR player_a2_id IS NULL OR 
           player_b1_id IS NULL OR player_b2_id IS NULL THEN
            RAISE LOG 'Incomplete doubles match data for match_id: %, skipping stats reversal', OLD.match_id;
            RETURN OLD;
        END IF;

        IF winner_team IS NULL THEN
            -- Skip if no winner team (match result was incomplete)
            RETURN OLD;
        END IF;

        -- Reverse partnerships
        -- Team A partnership: reverse based on who won
        PERFORM public.reverse_partnership_record(
            player_a1_id,
            player_a2_id,
            CASE WHEN winner_team = 'team_a' THEN player_a1_id ELSE player_b1_id END
        );

        -- Team B partnership: reverse based on who won
        PERFORM public.reverse_partnership_record(
            player_b1_id,
            player_b2_id,
            CASE WHEN winner_team = 'team_b' THEN player_b1_id ELSE player_a1_id END
        );

        -- Reverse doubles H2H record
        PERFORM public.reverse_doubles_h2h_record(
            player_a1_id,
            player_a2_id,
            player_b1_id,
            player_b2_id,
            winner_team
        );

        -- Reverse doubles player stats with surface
        IF winner_team = 'team_a' THEN
            PERFORM public.reverse_doubles_player_stats(
                player_a1_id,
                player_a2_id,
                player_b1_id,
                player_b2_id,
                surface
            );
        ELSE
            PERFORM public.reverse_doubles_player_stats(
                player_b1_id,
                player_b2_id,
                player_a1_id,
                player_a2_id,
                surface
            );
        END IF;

    ELSE
        -- Handle singles matches (existing logic)
        -- Determine loser
        IF winner_id = player_a_id THEN
            loser_id := player_b_id;
        ELSE
            loser_id := player_a_id;
        END IF;

        -- Reverse player stats with surface information
        PERFORM public.reverse_player_stats(winner_id, loser_id, surface);

        -- Reverse head-to-head record
        PERFORM public.reverse_head_to_head_record(player_a_id, player_b_id, winner_id);
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update comments
COMMENT ON FUNCTION public.update_doubles_player_stats(UUID, UUID, UUID, UUID, TIMESTAMP WITH TIME ZONE, TEXT) IS 'Updates doubles player stats including surface-specific stats (hard_wins, clay_wins, grass_wins, etc.) when doubles match results are added.';
COMMENT ON FUNCTION public.reverse_doubles_player_stats(UUID, UUID, UUID, UUID, TEXT) IS 'Reverses doubles player stats including surface-specific stats when doubles match results are updated or deleted.';
