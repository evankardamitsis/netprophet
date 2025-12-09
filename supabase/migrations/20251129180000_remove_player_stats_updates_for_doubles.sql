-- Remove individual player stats updates for doubles matches
-- Doubles stats should be tracked separately (partnerships and doubles H2H only)
-- Individual player stats (wins, losses, last5, streaks) should only be updated for singles matches

-- Step 1: Update trigger function for match result inserts - remove player stats updates for doubles
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
    winner_id := NEW.winner_id;
    winner_team := NEW.match_winner_team;

    -- Handle doubles matches
    IF match_type_value = 'doubles' THEN
        -- Validate doubles match data
        IF player_a1_id IS NULL OR player_a2_id IS NULL OR 
           player_b1_id IS NULL OR player_b2_id IS NULL THEN
            RAISE EXCEPTION 'Incomplete doubles match data for match_id: %', NEW.match_id;
        END IF;

        IF winner_team IS NULL THEN
            RAISE EXCEPTION 'match_winner_team is required for doubles matches';
        END IF;

        -- Update partnerships for both teams
        -- Team A partnership: if team_a won, pass a1 (partnership won), else pass b1 (partnership lost)
        PERFORM public.update_partnership_record(
            player_a1_id,
            player_a2_id,
            CASE WHEN winner_team = 'team_a' THEN player_a1_id ELSE player_b1_id END,
            NEW.created_at
        );

        -- Team B partnership: if team_b won, pass b1 (partnership won), else pass a1 (partnership lost)
        PERFORM public.update_partnership_record(
            player_b1_id,
            player_b2_id,
            CASE WHEN winner_team = 'team_b' THEN player_b1_id ELSE player_a1_id END,
            NEW.created_at
        );

        -- Update doubles H2H record
        PERFORM public.update_doubles_h2h_record(
            player_a1_id,
            player_a2_id,
            player_b1_id,
            player_b2_id,
            winner_team,
            NEW.created_at
        );

        -- Note: Individual player stats (wins, losses, last5, streaks) are NOT updated for doubles matches
        -- Doubles stats are tracked separately via partnerships and doubles H2H records

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

-- Step 2: Update trigger function for match result updates - remove player stats updates for doubles
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

                -- Note: Individual player stats are NOT reversed for doubles matches
                -- Doubles stats are tracked separately via partnerships and doubles H2H records
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

                -- Note: Individual player stats are NOT updated for doubles matches
                -- Doubles stats are tracked separately via partnerships and doubles H2H records
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

-- Step 3: Update trigger function for match result deletions - remove player stats updates for doubles
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

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Match not found for match_id: %', OLD.match_id;
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
            RAISE EXCEPTION 'Incomplete doubles match data for match_id: %', OLD.match_id;
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

        -- Note: Individual player stats are NOT reversed for doubles matches
        -- Doubles stats are tracked separately via partnerships and doubles H2H records

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

