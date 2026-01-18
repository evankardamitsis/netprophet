-- Fix doubles stats update error handling
-- Add better error handling and logging to identify why stats might not be updating

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

        RAISE LOG 'Updating doubles stats for match_id: %, winner_team: %, players: a1=%, a2=%, b1=%, b2=%', 
            NEW.match_id, winner_team, player_a1_id, player_a2_id, player_b1_id, player_b2_id;

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

-- Update comment
COMMENT ON FUNCTION public.trigger_update_player_stats_on_insert() IS 'Updates player stats when match results are inserted. For doubles matches, updates doubles_wins, doubles_losses, and related stats. Includes error logging for debugging.';
