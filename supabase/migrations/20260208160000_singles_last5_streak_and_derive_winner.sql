-- Add last5, current_streak, streak_type updates to singles update_player_stats
-- Derive winner from set scores when winner_id is null
-- Ensures match results count towards overall form, streak, and surface stats

-- Step 1: Extend update_player_stats to update last5, current_streak, streak_type for singles
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
BEGIN
    -- Get current stats for winner
    SELECT wins, losses, 
           COALESCE(last5, ARRAY['','','','',''])::TEXT[],
           COALESCE(current_streak, 0),
           COALESCE(NULLIF(streak_type, ''), 'W'),
           CASE WHEN p_surface = 'Hard' THEN hard_wins WHEN p_surface = 'Clay' THEN clay_wins WHEN p_surface = 'Grass' THEN grass_wins ELSE 0 END,
           CASE WHEN p_surface = 'Hard' THEN hard_losses WHEN p_surface = 'Clay' THEN clay_losses WHEN p_surface = 'Grass' THEN grass_losses ELSE 0 END,
           CASE WHEN p_surface = 'Hard' THEN hard_matches WHEN p_surface = 'Clay' THEN clay_matches WHEN p_surface = 'Grass' THEN grass_matches ELSE 0 END
    INTO winner_wins, winner_losses, winner_last5, winner_current_streak, winner_streak_type,
         winner_surface_wins, winner_surface_losses, winner_surface_matches
    FROM public.players
    WHERE id = p_winner_id;

    -- Get current stats for loser
    SELECT wins, losses,
           COALESCE(last5, ARRAY['','','','',''])::TEXT[],
           COALESCE(current_streak, 0),
           COALESCE(NULLIF(streak_type, ''), 'L'),
           CASE WHEN p_surface = 'Hard' THEN hard_wins WHEN p_surface = 'Clay' THEN clay_wins WHEN p_surface = 'Grass' THEN grass_wins ELSE 0 END,
           CASE WHEN p_surface = 'Hard' THEN hard_losses WHEN p_surface = 'Clay' THEN clay_losses WHEN p_surface = 'Grass' THEN grass_losses ELSE 0 END,
           CASE WHEN p_surface = 'Hard' THEN hard_matches WHEN p_surface = 'Clay' THEN clay_matches WHEN p_surface = 'Grass' THEN grass_matches ELSE 0 END
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
        hard_wins = CASE WHEN p_surface = 'Hard' THEN hard_wins + 1 ELSE hard_wins END,
        clay_wins = CASE WHEN p_surface = 'Clay' THEN clay_wins + 1 ELSE clay_wins END,
        grass_wins = CASE WHEN p_surface = 'Grass' THEN grass_wins + 1 ELSE grass_wins END,
        hard_matches = CASE WHEN p_surface = 'Hard' THEN hard_matches + 1 ELSE hard_matches END,
        clay_matches = CASE WHEN p_surface = 'Clay' THEN clay_matches + 1 ELSE clay_matches END,
        grass_matches = CASE WHEN p_surface = 'Grass' THEN grass_matches + 1 ELSE grass_matches END,
        hard_win_rate = CASE WHEN p_surface = 'Hard' THEN winner_surface_win_rate ELSE hard_win_rate END,
        clay_win_rate = CASE WHEN p_surface = 'Clay' THEN winner_surface_win_rate ELSE clay_win_rate END,
        grass_win_rate = CASE WHEN p_surface = 'Grass' THEN winner_surface_win_rate ELSE grass_win_rate END,
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
        hard_losses = CASE WHEN p_surface = 'Hard' THEN hard_losses + 1 ELSE hard_losses END,
        clay_losses = CASE WHEN p_surface = 'Clay' THEN clay_losses + 1 ELSE clay_losses END,
        grass_losses = CASE WHEN p_surface = 'Grass' THEN grass_losses + 1 ELSE grass_losses END,
        hard_matches = CASE WHEN p_surface = 'Hard' THEN hard_matches + 1 ELSE hard_matches END,
        clay_matches = CASE WHEN p_surface = 'Clay' THEN clay_matches + 1 ELSE clay_matches END,
        grass_matches = CASE WHEN p_surface = 'Grass' THEN grass_matches + 1 ELSE grass_matches END,
        hard_win_rate = CASE WHEN p_surface = 'Hard' THEN loser_surface_win_rate ELSE hard_win_rate END,
        clay_win_rate = CASE WHEN p_surface = 'Clay' THEN loser_surface_win_rate ELSE clay_win_rate END,
        grass_win_rate = CASE WHEN p_surface = 'Grass' THEN loser_surface_win_rate ELSE grass_win_rate END,
        updated_at = NOW()
    WHERE id = p_loser_id;

    RAISE NOTICE 'Updated player stats: Winner % (+1 win, last5, streak), Loser % (+1 loss, last5, streak)', p_winner_id, p_loser_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Extend reverse_player_stats to reverse last5 and streak
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
BEGIN
    -- Get current stats for winner
    SELECT wins, losses, 
           COALESCE(last5, ARRAY['','','','',''])::TEXT[],
           COALESCE(current_streak, 0),
           COALESCE(NULLIF(streak_type, ''), 'W'),
           CASE WHEN p_surface = 'Hard' THEN hard_wins WHEN p_surface = 'Clay' THEN clay_wins WHEN p_surface = 'Grass' THEN grass_wins ELSE 0 END,
           CASE WHEN p_surface = 'Hard' THEN hard_losses WHEN p_surface = 'Clay' THEN clay_losses WHEN p_surface = 'Grass' THEN grass_losses ELSE 0 END
    INTO winner_wins, winner_losses, winner_last5, winner_current_streak, winner_streak_type,
         winner_surface_wins, winner_surface_losses
    FROM public.players
    WHERE id = p_previous_winner_id;

    -- Get current stats for loser
    SELECT wins, losses,
           COALESCE(last5, ARRAY['','','','',''])::TEXT[],
           COALESCE(current_streak, 0),
           COALESCE(NULLIF(streak_type, ''), 'L'),
           CASE WHEN p_surface = 'Hard' THEN hard_wins WHEN p_surface = 'Clay' THEN clay_wins WHEN p_surface = 'Grass' THEN grass_wins ELSE 0 END,
           CASE WHEN p_surface = 'Hard' THEN hard_losses WHEN p_surface = 'Clay' THEN clay_losses WHEN p_surface = 'Grass' THEN grass_losses ELSE 0 END
    INTO loser_wins, loser_losses, loser_last5, loser_current_streak, loser_streak_type,
         loser_surface_wins, loser_surface_losses
    FROM public.players
    WHERE id = p_previous_loser_id;

    -- Reverse last5: remove last element (the W or L we added), shift right
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

    -- Calculate surface-specific win rates after reversal
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
        hard_wins = CASE WHEN p_surface = 'Hard' THEN GREATEST(0, hard_wins - 1) ELSE hard_wins END,
        clay_wins = CASE WHEN p_surface = 'Clay' THEN GREATEST(0, clay_wins - 1) ELSE clay_wins END,
        grass_wins = CASE WHEN p_surface = 'Grass' THEN GREATEST(0, grass_wins - 1) ELSE grass_wins END,
        hard_matches = CASE WHEN p_surface = 'Hard' THEN GREATEST(0, hard_matches - 1) ELSE hard_matches END,
        clay_matches = CASE WHEN p_surface = 'Clay' THEN GREATEST(0, clay_matches - 1) ELSE clay_matches END,
        grass_matches = CASE WHEN p_surface = 'Grass' THEN GREATEST(0, grass_matches - 1) ELSE grass_matches END,
        hard_win_rate = CASE WHEN p_surface = 'Hard' THEN winner_surface_win_rate ELSE hard_win_rate END,
        clay_win_rate = CASE WHEN p_surface = 'Clay' THEN winner_surface_win_rate ELSE clay_win_rate END,
        grass_win_rate = CASE WHEN p_surface = 'Grass' THEN winner_surface_win_rate ELSE grass_win_rate END,
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
        hard_losses = CASE WHEN p_surface = 'Hard' THEN GREATEST(0, hard_losses - 1) ELSE hard_losses END,
        clay_losses = CASE WHEN p_surface = 'Clay' THEN GREATEST(0, clay_losses - 1) ELSE clay_losses END,
        grass_losses = CASE WHEN p_surface = 'Grass' THEN GREATEST(0, grass_losses - 1) ELSE grass_losses END,
        hard_matches = CASE WHEN p_surface = 'Hard' THEN GREATEST(0, hard_matches - 1) ELSE hard_matches END,
        clay_matches = CASE WHEN p_surface = 'Clay' THEN GREATEST(0, clay_matches - 1) ELSE clay_matches END,
        grass_matches = CASE WHEN p_surface = 'Grass' THEN GREATEST(0, grass_matches - 1) ELSE grass_matches END,
        hard_win_rate = CASE WHEN p_surface = 'Hard' THEN loser_surface_win_rate ELSE hard_win_rate END,
        clay_win_rate = CASE WHEN p_surface = 'Clay' THEN loser_surface_win_rate ELSE clay_win_rate END,
        grass_win_rate = CASE WHEN p_surface = 'Grass' THEN loser_surface_win_rate ELSE grass_win_rate END,
        updated_at = NOW()
    WHERE id = p_previous_loser_id;

    RAISE NOTICE 'Reversed player stats: Previous winner % (-1 win, last5, streak), Previous loser % (-1 loss, last5, streak)', p_previous_winner_id, p_previous_loser_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Update trigger to derive winner from set scores when winner_id is null
CREATE OR REPLACE FUNCTION public.trigger_update_player_stats_on_insert()
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
    sets_won_by_a INTEGER := 0;
    sets_won_by_b INTEGER := 0;
    set_score TEXT;
    part_a INTEGER;
    part_b INTEGER;
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

        RAISE LOG 'Updating doubles stats for match_id: %, winner_team: %, players: a1=%, a2=%, b1=%, b2=%', 
            NEW.match_id, winner_team, player_a1_id, player_a2_id, player_b1_id, player_b2_id;

        -- Update partnerships for both teams
        BEGIN
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

        -- Update doubles-specific player stats
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
        -- Handle singles matches
        -- If winner_id is null, derive from set scores (format "X-Y" or "X-Y(Z)" = playerA-playerB games)
        IF winner_id IS NULL AND (NEW.set1_score IS NOT NULL OR NEW.set2_score IS NOT NULL OR NEW.set3_score IS NOT NULL) THEN
            IF NEW.set1_score IS NOT NULL AND NEW.set1_score ~ '^[0-9]+-[0-9]+' THEN
                set_score := NEW.set1_score;
                part_a := (regexp_match(set_score, '^([0-9]+)'))[1]::INTEGER;
                part_b := (regexp_match(set_score, '-([0-9]+)'))[1]::INTEGER;
                IF part_a > part_b THEN sets_won_by_a := sets_won_by_a + 1; ELSIF part_b > part_a THEN sets_won_by_b := sets_won_by_b + 1; END IF;
            END IF;
            IF NEW.set2_score IS NOT NULL AND NEW.set2_score ~ '^[0-9]+-[0-9]+' THEN
                set_score := NEW.set2_score;
                part_a := (regexp_match(set_score, '^([0-9]+)'))[1]::INTEGER;
                part_b := (regexp_match(set_score, '-([0-9]+)'))[1]::INTEGER;
                IF part_a > part_b THEN sets_won_by_a := sets_won_by_a + 1; ELSIF part_b > part_a THEN sets_won_by_b := sets_won_by_b + 1; END IF;
            END IF;
            IF NEW.set3_score IS NOT NULL AND NEW.set3_score ~ '^[0-9]+-[0-9]+' THEN
                set_score := NEW.set3_score;
                part_a := (regexp_match(set_score, '^([0-9]+)'))[1]::INTEGER;
                part_b := (regexp_match(set_score, '-([0-9]+)'))[1]::INTEGER;
                IF part_a > part_b THEN sets_won_by_a := sets_won_by_a + 1; ELSIF part_b > part_a THEN sets_won_by_b := sets_won_by_b + 1; END IF;
            END IF;
            IF sets_won_by_a > sets_won_by_b THEN
                winner_id := player_a_id;
            ELSIF sets_won_by_b > sets_won_by_a THEN
                winner_id := player_b_id;
            END IF;
            IF winner_id IS NOT NULL THEN
                RAISE LOG 'Derived winner from set scores for match_id %: player A won % sets, player B won % sets -> winner_id %', NEW.match_id, sets_won_by_a, sets_won_by_b, winner_id;
            END IF;
        END IF;

        IF winner_id IS NOT NULL THEN
            -- Determine loser
            IF winner_id = player_a_id THEN
                loser_id := player_b_id;
            ELSE
                loser_id := player_a_id;
            END IF;

            -- Update player stats with surface information (including last5, streak)
            PERFORM public.update_player_stats(winner_id, loser_id, NEW.created_at, surface);

            -- Update head-to-head record
            PERFORM public.update_head_to_head_record(player_a_id, player_b_id, winner_id, NEW.created_at);
        ELSE
            RAISE LOG 'Skipping singles stats update for match_id %: winner_id is null and could not derive from set scores', NEW.match_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Update the UPDATE trigger to skip reverse when old_winner_id is null (nothing was previously applied)
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
    SELECT m.player_a_id, m.player_b_id, m.player_a1_id, m.player_a2_id, m.player_b1_id, m.player_b2_id,
           m.match_type, t.surface
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

    IF match_type_value = 'doubles' THEN
        IF old_winner_team IS DISTINCT FROM new_winner_team THEN
            IF old_winner_team IS NOT NULL THEN
                PERFORM public.reverse_partnership_record(player_a1_id, player_a2_id, CASE WHEN old_winner_team = 'team_a' THEN player_a1_id ELSE player_b1_id END);
                PERFORM public.reverse_partnership_record(player_b1_id, player_b2_id, CASE WHEN old_winner_team = 'team_b' THEN player_b1_id ELSE player_a1_id END);
                PERFORM public.reverse_doubles_h2h_record(player_a1_id, player_a2_id, player_b1_id, player_b2_id, old_winner_team);
                IF old_winner_team = 'team_a' THEN
                    PERFORM public.reverse_doubles_player_stats(player_a1_id, player_a2_id, player_b1_id, player_b2_id, surface);
                ELSE
                    PERFORM public.reverse_doubles_player_stats(player_b1_id, player_b2_id, player_a1_id, player_a2_id, surface);
                END IF;
            END IF;
            IF new_winner_team IS NOT NULL THEN
                PERFORM public.update_partnership_record(player_a1_id, player_a2_id, CASE WHEN new_winner_team = 'team_a' THEN player_a1_id ELSE player_b1_id END, NEW.updated_at);
                PERFORM public.update_partnership_record(player_b1_id, player_b2_id, CASE WHEN new_winner_team = 'team_b' THEN player_b1_id ELSE player_a1_id END, NEW.updated_at);
                PERFORM public.update_doubles_h2h_record(player_a1_id, player_a2_id, player_b1_id, player_b2_id, new_winner_team, NEW.updated_at);
                IF new_winner_team = 'team_a' THEN
                    PERFORM public.update_doubles_player_stats(player_a1_id, player_a2_id, player_b1_id, player_b2_id, NEW.updated_at, surface);
                ELSE
                    PERFORM public.update_doubles_player_stats(player_b1_id, player_b2_id, player_a1_id, player_a2_id, NEW.updated_at, surface);
                END IF;
            END IF;
        END IF;
    ELSE
        IF old_winner_id IS DISTINCT FROM new_winner_id AND new_winner_id IS NOT NULL THEN
            IF old_winner_id IS NOT NULL THEN
                IF old_winner_id = player_a_id THEN old_loser_id := player_b_id; ELSE old_loser_id := player_a_id; END IF;
                PERFORM public.reverse_player_stats(old_winner_id, old_loser_id, surface);
            END IF;
            IF new_winner_id = player_a_id THEN new_loser_id := player_b_id; ELSE new_loser_id := player_a_id; END IF;
            PERFORM public.update_player_stats(new_winner_id, new_loser_id, NEW.updated_at, surface);
            PERFORM public.update_head_to_head_record(player_a_id, player_b_id, new_winner_id, NEW.updated_at);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.update_player_stats(UUID, UUID, TIMESTAMPTZ, TEXT) IS 'Updates player wins, losses, last5, streak, and surface stats when match results are added. Used for singles.';
COMMENT ON FUNCTION public.reverse_player_stats(UUID, UUID, TEXT) IS 'Reverses player stats when match results are deleted/changed.';
COMMENT ON FUNCTION public.trigger_update_player_stats_on_insert() IS 'Updates player stats when match results are inserted. Derives winner from set scores when winner_id is null. For singles: updates last5, streak, surface stats.';
