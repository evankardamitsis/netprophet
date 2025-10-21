-- Add function to update player stats when match results are added
-- This ensures player wins/losses are properly tracked

-- Create function to update player statistics
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
BEGIN
    -- Get current stats for winner
    SELECT wins, losses, 
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
    INTO winner_wins, winner_losses, winner_surface_wins, winner_surface_losses
    FROM public.players
    WHERE id = p_winner_id;

    -- Get current stats for loser
    SELECT wins, losses,
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
    INTO loser_wins, loser_losses, loser_surface_wins, loser_surface_losses
    FROM public.players
    WHERE id = p_loser_id;

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

    -- Update winner's stats
    UPDATE public.players
    SET 
        wins = wins + 1,
        win_rate = winner_win_rate,
        hard_wins = CASE WHEN p_surface = 'Hard' THEN hard_wins + 1 ELSE hard_wins END,
        clay_wins = CASE WHEN p_surface = 'Clay' THEN clay_wins + 1 ELSE clay_wins END,
        grass_wins = CASE WHEN p_surface = 'Grass' THEN grass_wins + 1 ELSE grass_wins END,
        hard_win_rate = CASE WHEN p_surface = 'Hard' THEN winner_surface_win_rate ELSE hard_win_rate END,
        clay_win_rate = CASE WHEN p_surface = 'Clay' THEN winner_surface_win_rate ELSE clay_win_rate END,
        grass_win_rate = CASE WHEN p_surface = 'Grass' THEN winner_surface_win_rate ELSE grass_win_rate END,
        updated_at = NOW()
    WHERE id = p_winner_id;

    -- Update loser's stats
    UPDATE public.players
    SET 
        losses = losses + 1,
        win_rate = loser_win_rate,
        hard_losses = CASE WHEN p_surface = 'Hard' THEN hard_losses + 1 ELSE hard_losses END,
        clay_losses = CASE WHEN p_surface = 'Clay' THEN clay_losses + 1 ELSE clay_losses END,
        grass_losses = CASE WHEN p_surface = 'Grass' THEN grass_losses + 1 ELSE grass_losses END,
        hard_win_rate = CASE WHEN p_surface = 'Hard' THEN loser_surface_win_rate ELSE hard_win_rate END,
        clay_win_rate = CASE WHEN p_surface = 'Clay' THEN loser_surface_win_rate ELSE clay_win_rate END,
        grass_win_rate = CASE WHEN p_surface = 'Grass' THEN loser_surface_win_rate ELSE grass_win_rate END,
        updated_at = NOW()
    WHERE id = p_loser_id;

    RAISE NOTICE 'Updated player stats: Winner % (+1 win), Loser % (+1 loss)', p_winner_id, p_loser_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to reverse player stats (for when match results are deleted/changed)
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
BEGIN
    -- Get current stats for winner
    SELECT wins, losses, 
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
    INTO winner_wins, winner_losses, winner_surface_wins, winner_surface_losses
    FROM public.players
    WHERE id = p_previous_winner_id;

    -- Get current stats for loser
    SELECT wins, losses,
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
    INTO loser_wins, loser_losses, loser_surface_wins, loser_surface_losses
    FROM public.players
    WHERE id = p_previous_loser_id;

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

    -- Reverse winner's stats (subtract 1 win)
    UPDATE public.players
    SET 
        wins = GREATEST(0, wins - 1),
        win_rate = winner_win_rate,
        hard_wins = CASE WHEN p_surface = 'Hard' THEN GREATEST(0, hard_wins - 1) ELSE hard_wins END,
        clay_wins = CASE WHEN p_surface = 'Clay' THEN GREATEST(0, clay_wins - 1) ELSE clay_wins END,
        grass_wins = CASE WHEN p_surface = 'Grass' THEN GREATEST(0, grass_wins - 1) ELSE grass_wins END,
        hard_win_rate = CASE WHEN p_surface = 'Hard' THEN winner_surface_win_rate ELSE hard_win_rate END,
        clay_win_rate = CASE WHEN p_surface = 'Clay' THEN winner_surface_win_rate ELSE clay_win_rate END,
        grass_win_rate = CASE WHEN p_surface = 'Grass' THEN winner_surface_win_rate ELSE grass_win_rate END,
        updated_at = NOW()
    WHERE id = p_previous_winner_id;

    -- Reverse loser's stats (subtract 1 loss)
    UPDATE public.players
    SET 
        losses = GREATEST(0, losses - 1),
        win_rate = loser_win_rate,
        hard_losses = CASE WHEN p_surface = 'Hard' THEN GREATEST(0, hard_losses - 1) ELSE hard_losses END,
        clay_losses = CASE WHEN p_surface = 'Clay' THEN GREATEST(0, clay_losses - 1) ELSE clay_losses END,
        grass_losses = CASE WHEN p_surface = 'Grass' THEN GREATEST(0, grass_losses - 1) ELSE grass_losses END,
        hard_win_rate = CASE WHEN p_surface = 'Hard' THEN loser_surface_win_rate ELSE hard_win_rate END,
        clay_win_rate = CASE WHEN p_surface = 'Clay' THEN loser_surface_win_rate ELSE clay_win_rate END,
        grass_win_rate = CASE WHEN p_surface = 'Grass' THEN loser_surface_win_rate ELSE grass_win_rate END,
        updated_at = NOW()
    WHERE id = p_previous_loser_id;

    RAISE NOTICE 'Reversed player stats: Previous winner % (-1 win), Previous loser % (-1 loss)', p_previous_winner_id, p_previous_loser_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to automatically update player stats when match results are inserted
CREATE OR REPLACE FUNCTION public.trigger_update_player_stats_on_insert()
RETURNS TRIGGER AS $$
DECLARE
    match_record RECORD;
    tournament_record RECORD;
    player_a_id UUID;
    player_b_id UUID;
    winner_id UUID;
    loser_id UUID;
    surface TEXT;
BEGIN
    -- Get match details to find both players and tournament
    SELECT m.player_a_id, m.player_b_id, t.surface
    INTO match_record
    FROM public.matches m
    JOIN public.tournaments t ON m.tournament_id = t.id
    WHERE m.id = NEW.match_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Match not found for match_id: %', NEW.match_id;
    END IF;

    player_a_id := match_record.player_a_id;
    player_b_id := match_record.player_b_id;
    surface := match_record.surface;
    winner_id := NEW.winner_id;

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

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to handle match result updates
CREATE OR REPLACE FUNCTION public.trigger_update_player_stats_on_update()
RETURNS TRIGGER AS $$
DECLARE
    match_record RECORD;
    player_a_id UUID;
    player_b_id UUID;
    old_winner_id UUID;
    new_winner_id UUID;
    old_loser_id UUID;
    new_loser_id UUID;
    surface TEXT;
BEGIN
    -- Get match details including surface
    SELECT m.player_a_id, m.player_b_id, t.surface
    INTO match_record
    FROM public.matches m
    JOIN public.tournaments t ON m.tournament_id = t.id
    WHERE m.id = NEW.match_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Match not found for match_id: %', NEW.match_id;
    END IF;

    player_a_id := match_record.player_a_id;
    player_b_id := match_record.player_b_id;
    surface := match_record.surface;
    old_winner_id := OLD.winner_id;
    new_winner_id := NEW.winner_id;

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

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to handle match result deletion
CREATE OR REPLACE FUNCTION public.trigger_update_player_stats_on_delete()
RETURNS TRIGGER AS $$
DECLARE
    match_record RECORD;
    player_a_id UUID;
    player_b_id UUID;
    winner_id UUID;
    loser_id UUID;
    surface TEXT;
BEGIN
    -- Get match details including surface
    SELECT m.player_a_id, m.player_b_id, t.surface
    INTO match_record
    FROM public.matches m
    JOIN public.tournaments t ON m.tournament_id = t.id
    WHERE m.id = OLD.match_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Match not found for match_id: %', OLD.match_id;
    END IF;

    player_a_id := match_record.player_a_id;
    player_b_id := match_record.player_b_id;
    surface := match_record.surface;
    winner_id := OLD.winner_id;

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

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_player_stats_insert ON public.match_results;
CREATE TRIGGER trigger_update_player_stats_insert
    AFTER INSERT ON public.match_results
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_update_player_stats_on_insert();

DROP TRIGGER IF EXISTS trigger_update_player_stats_update ON public.match_results;
CREATE TRIGGER trigger_update_player_stats_update
    AFTER UPDATE ON public.match_results
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_update_player_stats_on_update();

DROP TRIGGER IF EXISTS trigger_update_player_stats_delete ON public.match_results;
CREATE TRIGGER trigger_update_player_stats_delete
    AFTER DELETE ON public.match_results
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_update_player_stats_on_delete();

-- Add comments
COMMENT ON FUNCTION public.update_player_stats IS 'Updates player wins/losses when match results are added';
COMMENT ON FUNCTION public.reverse_player_stats IS 'Reverses player wins/losses when match results are deleted/changed';
COMMENT ON FUNCTION public.trigger_update_player_stats_on_insert IS 'Trigger function to update player stats when match results are inserted';
COMMENT ON FUNCTION public.trigger_update_player_stats_on_update IS 'Trigger function to update player stats when match results are updated';
COMMENT ON FUNCTION public.trigger_update_player_stats_on_delete IS 'Trigger function to update player stats when match results are deleted';
