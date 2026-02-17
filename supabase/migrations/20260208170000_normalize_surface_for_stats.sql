-- Normalize surface values for player stats
-- Tournaments may store "Hard Court", "Clay Court", "Grass Court" but update_player_stats expects "Hard", "Clay", "Grass"

CREATE OR REPLACE FUNCTION public.normalize_surface_for_stats(p_surface TEXT)
RETURNS TEXT AS $$
BEGIN
    IF p_surface IS NULL THEN RETURN NULL; END IF;
    IF p_surface ILIKE 'hard%' THEN RETURN 'Hard'; END IF;
    IF p_surface ILIKE 'clay%' THEN RETURN 'Clay'; END IF;
    IF p_surface ILIKE 'grass%' THEN RETURN 'Grass'; END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update update_player_stats to normalize surface at the start
CREATE OR REPLACE FUNCTION public.update_player_stats(
    p_winner_id UUID,
    p_loser_id UUID,
    p_match_date TIMESTAMP WITH TIME ZONE,
    p_surface TEXT
)
RETURNS VOID AS $$
DECLARE
    winner_wins INTEGER;
    winner_losses INTEGER;
    loser_wins INTEGER;
    loser_losses INTEGER;
    winner_win_rate DECIMAL(5,2);
    loser_win_rate DECIMAL(5,2);
    winner_surface_wins INTEGER;
    winner_surface_losses INTEGER;
    loser_surface_wins INTEGER;
    loser_surface_losses INTEGER;
    winner_surface_win_rate DECIMAL(5,2);
    loser_surface_win_rate DECIMAL(5,2);
    winner_surface_matches INTEGER;
    loser_surface_matches INTEGER;
    winner_last5 TEXT[];
    winner_current_streak INTEGER;
    winner_streak_type TEXT;
    loser_last5 TEXT[];
    loser_current_streak INTEGER;
    loser_streak_type TEXT;
    winner_new_last5 TEXT[];
    loser_new_last5 TEXT[];
    winner_new_streak INTEGER;
    winner_new_streak_type TEXT;
    loser_new_streak INTEGER;
    loser_new_streak_type TEXT;
    surface_key TEXT;
BEGIN
    surface_key := public.normalize_surface_for_stats(p_surface);

    -- Get current stats for winner
    SELECT wins, losses, 
           COALESCE(last5, ARRAY['','','','',''])::TEXT[],
           COALESCE(current_streak, 0),
           COALESCE(NULLIF(streak_type, ''), 'W'),
           CASE WHEN surface_key = 'Hard' THEN hard_wins WHEN surface_key = 'Clay' THEN clay_wins WHEN surface_key = 'Grass' THEN grass_wins ELSE 0 END,
           CASE WHEN surface_key = 'Hard' THEN hard_losses WHEN surface_key = 'Clay' THEN clay_losses WHEN surface_key = 'Grass' THEN grass_losses ELSE 0 END,
           CASE WHEN surface_key = 'Hard' THEN hard_matches WHEN surface_key = 'Clay' THEN clay_matches WHEN surface_key = 'Grass' THEN grass_matches ELSE 0 END
    INTO winner_wins, winner_losses, winner_last5, winner_current_streak, winner_streak_type,
         winner_surface_wins, winner_surface_losses, winner_surface_matches
    FROM public.players
    WHERE id = p_winner_id;

    -- Get current stats for loser
    SELECT wins, losses,
           COALESCE(last5, ARRAY['','','','',''])::TEXT[],
           COALESCE(current_streak, 0),
           COALESCE(NULLIF(streak_type, ''), 'L'),
           CASE WHEN surface_key = 'Hard' THEN hard_wins WHEN surface_key = 'Clay' THEN clay_wins WHEN surface_key = 'Grass' THEN grass_wins ELSE 0 END,
           CASE WHEN surface_key = 'Hard' THEN hard_losses WHEN surface_key = 'Clay' THEN clay_losses WHEN surface_key = 'Grass' THEN grass_losses ELSE 0 END,
           CASE WHEN surface_key = 'Hard' THEN hard_matches WHEN surface_key = 'Clay' THEN clay_matches WHEN surface_key = 'Grass' THEN grass_matches ELSE 0 END
    INTO loser_wins, loser_losses, loser_last5, loser_current_streak, loser_streak_type,
         loser_surface_wins, loser_surface_losses, loser_surface_matches
    FROM public.players
    WHERE id = p_loser_id;

    -- Pad last5 to 5 elements if needed
    winner_last5 := CASE 
        WHEN array_length(winner_last5, 1) IS NULL THEN ARRAY['','','','','']
        WHEN array_length(winner_last5, 1) < 5 THEN array_fill(''::TEXT, ARRAY[5 - array_length(winner_last5, 1)]) || winner_last5
        ELSE winner_last5
    END;
    loser_last5 := CASE 
        WHEN array_length(loser_last5, 1) IS NULL THEN ARRAY['','','','','']
        WHEN array_length(loser_last5, 1) < 5 THEN array_fill(''::TEXT, ARRAY[5 - array_length(loser_last5, 1)]) || loser_last5
        ELSE loser_last5
    END;

    -- Build new last5: shift left, add new result (winner: W, loser: L)
    winner_new_last5 := ARRAY[winner_last5[2], winner_last5[3], winner_last5[4], winner_last5[5], 'W'];
    loser_new_last5 := ARRAY[loser_last5[2], loser_last5[3], loser_last5[4], loser_last5[5], 'L'];

    -- Streak: winner
    IF winner_streak_type = 'W' THEN
        winner_new_streak := winner_current_streak + 1;
        winner_new_streak_type := 'W';
    ELSE
        winner_new_streak := 1;
        winner_new_streak_type := 'W';
    END IF;

    -- Streak: loser
    IF loser_streak_type = 'L' THEN
        loser_new_streak := loser_current_streak + 1;
        loser_new_streak_type := 'L';
    ELSE
        loser_new_streak := 1;
        loser_new_streak_type := 'L';
    END IF;

    -- Calculate new win rates
    winner_win_rate := CASE 
        WHEN (winner_wins + 1 + loser_losses) > 0 
        THEN ROUND(((winner_wins + 1)::DECIMAL / (winner_wins + 1 + loser_losses)) * 100, 2)
        ELSE 0
    END;

    loser_win_rate := CASE 
        WHEN (loser_wins + winner_wins + 1) > 0 
        THEN ROUND((loser_wins::DECIMAL / (loser_wins + winner_wins + 1)) * 100, 2)
        ELSE 0
    END;

    -- Calculate surface-specific win rates
    winner_surface_win_rate := CASE 
        WHEN (winner_surface_wins + 1 + winner_surface_losses) > 0 
        THEN ROUND(((winner_surface_wins + 1)::DECIMAL / (winner_surface_wins + 1 + winner_surface_losses)) * 100, 2)
        ELSE 0
    END;

    loser_surface_win_rate := CASE 
        WHEN (loser_surface_wins + loser_surface_losses + 1) > 0 
        THEN ROUND((loser_surface_wins::DECIMAL / (loser_surface_wins + loser_surface_losses + 1)) * 100, 2)
        ELSE 0
    END;

    -- Update winner's stats (including last5, streak)
    UPDATE public.players
    SET 
        wins = wins + 1,
        win_rate = winner_win_rate,
        last5 = winner_new_last5,
        current_streak = winner_new_streak,
        streak_type = winner_new_streak_type,
        last_match_date = p_match_date::DATE,
        hard_wins = CASE WHEN surface_key = 'Hard' THEN hard_wins + 1 ELSE hard_wins END,
        clay_wins = CASE WHEN surface_key = 'Clay' THEN clay_wins + 1 ELSE clay_wins END,
        grass_wins = CASE WHEN surface_key = 'Grass' THEN grass_wins + 1 ELSE grass_wins END,
        hard_matches = CASE WHEN surface_key = 'Hard' THEN hard_matches + 1 ELSE hard_matches END,
        clay_matches = CASE WHEN surface_key = 'Clay' THEN clay_matches + 1 ELSE clay_matches END,
        grass_matches = CASE WHEN surface_key = 'Grass' THEN grass_matches + 1 ELSE grass_matches END,
        hard_win_rate = CASE WHEN surface_key = 'Hard' THEN winner_surface_win_rate ELSE hard_win_rate END,
        clay_win_rate = CASE WHEN surface_key = 'Clay' THEN winner_surface_win_rate ELSE clay_win_rate END,
        grass_win_rate = CASE WHEN surface_key = 'Grass' THEN winner_surface_win_rate ELSE grass_win_rate END,
        updated_at = NOW()
    WHERE id = p_winner_id;

    -- Update loser's stats (including last5, streak)
    UPDATE public.players
    SET 
        losses = losses + 1,
        win_rate = loser_win_rate,
        last5 = loser_new_last5,
        current_streak = loser_new_streak,
        streak_type = loser_new_streak_type,
        last_match_date = p_match_date::DATE,
        hard_losses = CASE WHEN surface_key = 'Hard' THEN hard_losses + 1 ELSE hard_losses END,
        clay_losses = CASE WHEN surface_key = 'Clay' THEN clay_losses + 1 ELSE clay_losses END,
        grass_losses = CASE WHEN surface_key = 'Grass' THEN grass_losses + 1 ELSE grass_losses END,
        hard_matches = CASE WHEN surface_key = 'Hard' THEN hard_matches + 1 ELSE hard_matches END,
        clay_matches = CASE WHEN surface_key = 'Clay' THEN clay_matches + 1 ELSE clay_matches END,
        grass_matches = CASE WHEN surface_key = 'Grass' THEN grass_matches + 1 ELSE grass_matches END,
        hard_win_rate = CASE WHEN surface_key = 'Hard' THEN loser_surface_win_rate ELSE hard_win_rate END,
        clay_win_rate = CASE WHEN surface_key = 'Clay' THEN loser_surface_win_rate ELSE clay_win_rate END,
        grass_win_rate = CASE WHEN surface_key = 'Grass' THEN loser_surface_win_rate ELSE grass_win_rate END,
        updated_at = NOW()
    WHERE id = p_loser_id;

    RAISE NOTICE 'Updated player stats: Winner % (+1 win), Loser %, surface=%', p_winner_id, p_loser_id, surface_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update reverse_player_stats to use normalized surface
CREATE OR REPLACE FUNCTION public.reverse_player_stats(
    p_previous_winner_id UUID,
    p_previous_loser_id UUID,
    p_surface TEXT
)
RETURNS VOID AS $$
DECLARE
    winner_wins INTEGER;
    winner_losses INTEGER;
    loser_wins INTEGER;
    loser_losses INTEGER;
    winner_win_rate DECIMAL(5,2);
    loser_win_rate DECIMAL(5,2);
    winner_surface_wins INTEGER;
    winner_surface_losses INTEGER;
    loser_surface_wins INTEGER;
    loser_surface_losses INTEGER;
    winner_surface_win_rate DECIMAL(5,2);
    loser_surface_win_rate DECIMAL(5,2);
    winner_last5 TEXT[];
    winner_current_streak INTEGER;
    winner_streak_type TEXT;
    loser_last5 TEXT[];
    loser_current_streak INTEGER;
    loser_streak_type TEXT;
    winner_new_last5 TEXT[];
    loser_new_last5 TEXT[];
    winner_new_streak INTEGER;
    winner_new_streak_type TEXT;
    loser_new_streak INTEGER;
    loser_new_streak_type TEXT;
    surface_key TEXT;
BEGIN
    surface_key := public.normalize_surface_for_stats(p_surface);

    -- Get current stats for winner
    SELECT wins, losses, 
           COALESCE(last5, ARRAY['','','','',''])::TEXT[],
           COALESCE(current_streak, 0),
           COALESCE(NULLIF(streak_type, ''), 'W'),
           CASE WHEN surface_key = 'Hard' THEN hard_wins WHEN surface_key = 'Clay' THEN clay_wins WHEN surface_key = 'Grass' THEN grass_wins ELSE 0 END,
           CASE WHEN surface_key = 'Hard' THEN hard_losses WHEN surface_key = 'Clay' THEN clay_losses WHEN surface_key = 'Grass' THEN grass_losses ELSE 0 END
    INTO winner_wins, winner_losses, winner_last5, winner_current_streak, winner_streak_type,
         winner_surface_wins, winner_surface_losses
    FROM public.players
    WHERE id = p_previous_winner_id;

    -- Get current stats for loser
    SELECT wins, losses,
           COALESCE(last5, ARRAY['','','','',''])::TEXT[],
           COALESCE(current_streak, 0),
           COALESCE(NULLIF(streak_type, ''), 'L'),
           CASE WHEN surface_key = 'Hard' THEN hard_wins WHEN surface_key = 'Clay' THEN clay_wins WHEN surface_key = 'Grass' THEN grass_wins ELSE 0 END,
           CASE WHEN surface_key = 'Hard' THEN hard_losses WHEN surface_key = 'Clay' THEN clay_losses WHEN surface_key = 'Grass' THEN grass_losses ELSE 0 END
    INTO loser_wins, loser_losses, loser_last5, loser_current_streak, loser_streak_type,
         loser_surface_wins, loser_surface_losses
    FROM public.players
    WHERE id = p_previous_loser_id;

    -- Reverse last5
    winner_new_last5 := CASE 
        WHEN array_length(winner_last5, 1) >= 1 AND winner_last5[5] = 'W' 
        THEN ARRAY[COALESCE(winner_last5[1],''), COALESCE(winner_last5[2],''), COALESCE(winner_last5[3],''), COALESCE(winner_last5[4],'')]
        ELSE winner_last5
    END;
    loser_new_last5 := CASE 
        WHEN array_length(loser_last5, 1) >= 1 AND loser_last5[5] = 'L' 
        THEN ARRAY[COALESCE(loser_last5[1],''), COALESCE(loser_last5[2],''), COALESCE(loser_last5[3],''), COALESCE(loser_last5[4],'')]
        ELSE loser_last5
    END;

    -- Reverse streak
    IF winner_current_streak > 1 AND winner_streak_type = 'W' THEN
        winner_new_streak := winner_current_streak - 1;
        winner_new_streak_type := 'W';
    ELSE
        winner_new_streak := 0;
        winner_new_streak_type := 'W';
    END IF;

    IF loser_current_streak > 1 AND loser_streak_type = 'L' THEN
        loser_new_streak := loser_current_streak - 1;
        loser_new_streak_type := 'L';
    ELSE
        loser_new_streak := 0;
        loser_new_streak_type := 'L';
    END IF;

    -- Calculate new win rates after reversal
    winner_win_rate := CASE 
        WHEN (winner_wins - 1 + loser_losses) > 0 
        THEN ROUND(((winner_wins - 1)::DECIMAL / (winner_wins - 1 + loser_losses)) * 100, 2)
        ELSE 0
    END;

    loser_win_rate := CASE 
        WHEN (loser_wins + winner_wins - 1) > 0 
        THEN ROUND((loser_wins::DECIMAL / (loser_wins + winner_wins - 1)) * 100, 2)
        ELSE 0
    END;

    winner_surface_win_rate := CASE 
        WHEN (winner_surface_wins - 1 + winner_surface_losses) > 0 
        THEN ROUND(((winner_surface_wins - 1)::DECIMAL / (winner_surface_wins - 1 + winner_surface_losses)) * 100, 2)
        ELSE 0
    END;

    loser_surface_win_rate := CASE 
        WHEN (loser_surface_wins + loser_surface_losses - 1) > 0 
        THEN ROUND((loser_surface_wins::DECIMAL / (loser_surface_wins + loser_surface_losses - 1)) * 100, 2)
        ELSE 0
    END;

    -- Reverse winner's stats
    UPDATE public.players
    SET 
        wins = GREATEST(0, wins - 1),
        win_rate = winner_win_rate,
        last5 = winner_new_last5,
        current_streak = winner_new_streak,
        streak_type = winner_new_streak_type,
        hard_wins = CASE WHEN surface_key = 'Hard' THEN GREATEST(0, hard_wins - 1) ELSE hard_wins END,
        clay_wins = CASE WHEN surface_key = 'Clay' THEN GREATEST(0, clay_wins - 1) ELSE clay_wins END,
        grass_wins = CASE WHEN surface_key = 'Grass' THEN GREATEST(0, grass_wins - 1) ELSE grass_wins END,
        hard_matches = CASE WHEN surface_key = 'Hard' THEN GREATEST(0, hard_matches - 1) ELSE hard_matches END,
        clay_matches = CASE WHEN surface_key = 'Clay' THEN GREATEST(0, clay_matches - 1) ELSE clay_matches END,
        grass_matches = CASE WHEN surface_key = 'Grass' THEN GREATEST(0, grass_matches - 1) ELSE grass_matches END,
        hard_win_rate = CASE WHEN surface_key = 'Hard' THEN winner_surface_win_rate ELSE hard_win_rate END,
        clay_win_rate = CASE WHEN surface_key = 'Clay' THEN winner_surface_win_rate ELSE clay_win_rate END,
        grass_win_rate = CASE WHEN surface_key = 'Grass' THEN winner_surface_win_rate ELSE grass_win_rate END,
        updated_at = NOW()
    WHERE id = p_previous_winner_id;

    -- Reverse loser's stats
    UPDATE public.players
    SET 
        losses = GREATEST(0, losses - 1),
        win_rate = loser_win_rate,
        last5 = loser_new_last5,
        current_streak = loser_new_streak,
        streak_type = loser_new_streak_type,
        hard_losses = CASE WHEN surface_key = 'Hard' THEN GREATEST(0, hard_losses - 1) ELSE hard_losses END,
        clay_losses = CASE WHEN surface_key = 'Clay' THEN GREATEST(0, clay_losses - 1) ELSE clay_losses END,
        grass_losses = CASE WHEN surface_key = 'Grass' THEN GREATEST(0, grass_losses - 1) ELSE grass_losses END,
        hard_matches = CASE WHEN surface_key = 'Hard' THEN GREATEST(0, hard_matches - 1) ELSE hard_matches END,
        clay_matches = CASE WHEN surface_key = 'Clay' THEN GREATEST(0, clay_matches - 1) ELSE clay_matches END,
        grass_matches = CASE WHEN surface_key = 'Grass' THEN GREATEST(0, grass_matches - 1) ELSE grass_matches END,
        hard_win_rate = CASE WHEN surface_key = 'Hard' THEN loser_surface_win_rate ELSE hard_win_rate END,
        clay_win_rate = CASE WHEN surface_key = 'Clay' THEN loser_surface_win_rate ELSE clay_win_rate END,
        grass_win_rate = CASE WHEN surface_key = 'Grass' THEN loser_surface_win_rate ELSE grass_win_rate END,
        updated_at = NOW()
    WHERE id = p_previous_loser_id;

    RAISE NOTICE 'Reversed player stats: % and %', p_previous_winner_id, p_previous_loser_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update backfill to use normalized surface
-- (Backfill already ran; re-running would need the backfill script. This migration fixes future inserts.)
COMMENT ON FUNCTION public.normalize_surface_for_stats(TEXT) IS 'Maps "Hard Court", "Hard", etc. to "Hard" for player stats. Clay/Grass similarly.';
