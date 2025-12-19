-- Fix trigger_update_player_stats_on_delete to handle match deletion
-- When a match is deleted, match_results are deleted via CASCADE, and the trigger
-- tries to look up the match which no longer exists. This fix allows bulk deletion
-- of matches regardless of their status by gracefully handling missing matches.

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
            -- Skip if incomplete doubles data
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

        -- Reverse doubles player stats
        IF winner_team = 'team_a' THEN
            PERFORM public.reverse_doubles_player_stats(
                player_a1_id,
                player_a2_id,
                player_b1_id,
                player_b2_id
            );
        ELSE
            PERFORM public.reverse_doubles_player_stats(
                player_b1_id,
                player_b2_id,
                player_a1_id,
                player_a2_id
            );
        END IF;

    ELSE
        -- Handle singles matches
        IF winner_id IS NULL THEN
            -- Skip if no winner (match result was incomplete)
            RETURN OLD;
        END IF;

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

COMMENT ON FUNCTION public.trigger_update_player_stats_on_delete() IS 
'Trigger function to reverse player stats when match results are deleted. Now handles cases where match is already deleted (e.g., during bulk deletion).';
