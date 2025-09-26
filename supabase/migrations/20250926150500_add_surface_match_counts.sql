-- Add surface match count columns to players table
-- This allows tracking total matches played on each surface for better win rate context

-- Add columns for total matches played on each surface
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS hard_matches INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS clay_matches INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS grass_matches INTEGER DEFAULT 0;

-- Add comments for the new columns
COMMENT ON COLUMN public.players.hard_matches IS 'Total number of matches played on hard court';
COMMENT ON COLUMN public.players.clay_matches IS 'Total number of matches played on clay court';
COMMENT ON COLUMN public.players.grass_matches IS 'Total number of matches played on grass court';

-- Update the player stats function to include surface match counts
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
           END as surface_losses,
           CASE 
               WHEN p_surface = 'Hard' THEN hard_matches
               WHEN p_surface = 'Clay' THEN clay_matches
               WHEN p_surface = 'Grass' THEN grass_matches
               ELSE 0
           END as surface_matches
    INTO winner_wins, winner_losses, winner_surface_wins, winner_surface_losses, winner_surface_matches
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
           END as surface_losses,
           CASE 
               WHEN p_surface = 'Hard' THEN hard_matches
               WHEN p_surface = 'Clay' THEN clay_matches
               WHEN p_surface = 'Grass' THEN grass_matches
               ELSE 0
           END as surface_matches
    INTO loser_wins, loser_losses, loser_surface_wins, loser_surface_losses, loser_surface_matches
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
        hard_matches = CASE WHEN p_surface = 'Hard' THEN hard_matches + 1 ELSE hard_matches END,
        clay_matches = CASE WHEN p_surface = 'Clay' THEN clay_matches + 1 ELSE clay_matches END,
        grass_matches = CASE WHEN p_surface = 'Grass' THEN grass_matches + 1 ELSE grass_matches END,
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
        hard_matches = CASE WHEN p_surface = 'Hard' THEN hard_matches + 1 ELSE hard_matches END,
        clay_matches = CASE WHEN p_surface = 'Clay' THEN clay_matches + 1 ELSE clay_matches END,
        grass_matches = CASE WHEN p_surface = 'Grass' THEN grass_matches + 1 ELSE grass_matches END,
        hard_win_rate = CASE WHEN p_surface = 'Hard' THEN loser_surface_win_rate ELSE hard_win_rate END,
        clay_win_rate = CASE WHEN p_surface = 'Clay' THEN loser_surface_win_rate ELSE clay_win_rate END,
        grass_win_rate = CASE WHEN p_surface = 'Grass' THEN loser_surface_win_rate ELSE grass_win_rate END,
        updated_at = NOW()
    WHERE id = p_loser_id;

    RAISE NOTICE 'Updated player stats: Winner % (+1 win), Loser % (+1 loss)', p_winner_id, p_loser_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the reverse function to handle surface match counts
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

    -- Reverse winner's stats (subtract 1 win and 1 match)
    UPDATE public.players
    SET 
        wins = GREATEST(0, wins - 1),
        win_rate = winner_win_rate,
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

    -- Reverse loser's stats (subtract 1 loss and 1 match)
    UPDATE public.players
    SET 
        losses = GREATEST(0, losses - 1),
        win_rate = loser_win_rate,
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

    RAISE NOTICE 'Reversed player stats: Previous winner % (-1 win), Previous loser % (-1 loss)', p_previous_winner_id, p_previous_loser_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
