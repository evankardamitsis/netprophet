-- One-time backfill: Reset and recompute singles stats from all match_results
-- Fixes players whose stats weren't updated (e.g. due to "Hard Court" vs "Hard" surface mismatch)
-- Must run AFTER 20260208170000_normalize_surface_for_stats.sql

DO $$
DECLARE
    r RECORD;
    v_loser_id UUID;
    v_surface TEXT;
BEGIN
    -- Step 1: Reset singles stats for all players who have singles match_results
    -- (leaves doubles_wins/losses/etc. untouched)
    UPDATE public.players p
    SET 
        wins = 0,
        losses = 0,
        win_rate = 0,
        last5 = ARRAY['','','','',''],
        current_streak = 0,
        streak_type = 'W',
        hard_wins = 0,
        hard_losses = 0,
        hard_matches = 0,
        hard_win_rate = 0,
        clay_wins = 0,
        clay_losses = 0,
        clay_matches = 0,
        clay_win_rate = 0,
        grass_wins = 0,
        grass_losses = 0,
        grass_matches = 0,
        grass_win_rate = 0
    WHERE p.id IN (
        SELECT DISTINCT player_id FROM (
            SELECT m.player_a_id AS player_id FROM match_results mr JOIN matches m ON m.id = mr.match_id
            WHERE (m.match_type IS NULL OR m.match_type != 'doubles') AND m.player_a_id IS NOT NULL
            UNION
            SELECT m.player_b_id FROM match_results mr JOIN matches m ON m.id = mr.match_id
            WHERE (m.match_type IS NULL OR m.match_type != 'doubles') AND m.player_b_id IS NOT NULL
        ) t
    );

    RAISE NOTICE 'Reset singles stats for affected players';

    -- Step 2: Replay all singles match_results in chronological order
    FOR r IN (
        SELECT mr.id, mr.match_id, mr.winner_id, mr.created_at,
               m.player_a_id, m.player_b_id, t.surface
        FROM public.match_results mr
        JOIN public.matches m ON m.id = mr.match_id
        LEFT JOIN public.tournaments t ON t.id = m.tournament_id
        WHERE (m.match_type IS NULL OR m.match_type != 'doubles')
          AND m.player_a_id IS NOT NULL
          AND m.player_b_id IS NOT NULL
          AND mr.winner_id IS NOT NULL
        ORDER BY mr.created_at ASC
    )
    LOOP
        IF r.winner_id = r.player_a_id THEN
            v_loser_id := r.player_b_id;
        ELSE
            v_loser_id := r.player_a_id;
        END IF;

        v_surface := COALESCE(r.surface, 'Hard');
        PERFORM public.update_player_stats(r.winner_id, v_loser_id, r.created_at, v_surface);
        RAISE NOTICE 'Applied match_result % (match %)', r.id, r.match_id;
    END LOOP;

    RAISE NOTICE 'Backfill complete: recomputed singles stats from match history';
END;
$$;
