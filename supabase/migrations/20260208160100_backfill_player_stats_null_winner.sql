-- Backfill player stats for match_results where winner_id is null
-- These matches were never counted because the old trigger skipped them.
-- Derives winner from set scores and calls update_player_stats.
-- Run in chronological order (oldest first) so cumulative stats are correct.

DO $$
DECLARE
    r RECORD;
    v_winner_id UUID;
    v_loser_id UUID;
    sets_won_by_a INTEGER;
    sets_won_by_b INTEGER;
    set_score TEXT;
    part_a INTEGER;
    part_b INTEGER;
    surface TEXT;
BEGIN
    FOR r IN (
        SELECT mr.id, mr.match_id, mr.winner_id, mr.set1_score, mr.set2_score, mr.set3_score, mr.created_at,
               m.player_a_id, m.player_b_id, m.match_type, t.surface
        FROM public.match_results mr
        JOIN public.matches m ON m.id = mr.match_id
        JOIN public.tournaments t ON t.id = m.tournament_id
        WHERE mr.winner_id IS NULL
          AND m.match_type IS DISTINCT FROM 'doubles'
          AND m.player_a_id IS NOT NULL
          AND m.player_b_id IS NOT NULL
        ORDER BY mr.created_at ASC
    )
    LOOP
        v_winner_id := NULL;
        sets_won_by_a := 0;
        sets_won_by_b := 0;

        IF r.set1_score IS NOT NULL AND r.set1_score ~ '^[0-9]+-[0-9]+' THEN
            part_a := (regexp_match(r.set1_score, '^([0-9]+)'))[1]::INTEGER;
            part_b := (regexp_match(r.set1_score, '-([0-9]+)'))[1]::INTEGER;
            IF part_a > part_b THEN sets_won_by_a := sets_won_by_a + 1; ELSIF part_b > part_a THEN sets_won_by_b := sets_won_by_b + 1; END IF;
        END IF;
        IF r.set2_score IS NOT NULL AND r.set2_score ~ '^[0-9]+-[0-9]+' THEN
            part_a := (regexp_match(r.set2_score, '^([0-9]+)'))[1]::INTEGER;
            part_b := (regexp_match(r.set2_score, '-([0-9]+)'))[1]::INTEGER;
            IF part_a > part_b THEN sets_won_by_a := sets_won_by_a + 1; ELSIF part_b > part_a THEN sets_won_by_b := sets_won_by_b + 1; END IF;
        END IF;
        IF r.set3_score IS NOT NULL AND r.set3_score ~ '^[0-9]+-[0-9]+' THEN
            part_a := (regexp_match(r.set3_score, '^([0-9]+)'))[1]::INTEGER;
            part_b := (regexp_match(r.set3_score, '-([0-9]+)'))[1]::INTEGER;
            IF part_a > part_b THEN sets_won_by_a := sets_won_by_a + 1; ELSIF part_b > part_a THEN sets_won_by_b := sets_won_by_b + 1; END IF;
        END IF;

        IF sets_won_by_a > sets_won_by_b THEN
            v_winner_id := r.player_a_id;
            v_loser_id := r.player_b_id;
        ELSIF sets_won_by_b > sets_won_by_a THEN
            v_winner_id := r.player_b_id;
            v_loser_id := r.player_a_id;
        END IF;

        IF v_winner_id IS NOT NULL THEN
            surface := COALESCE(r.surface, 'Hard');
            PERFORM public.update_player_stats(v_winner_id, v_loser_id, r.created_at, surface);
            RAISE NOTICE 'Backfilled match_result % (match %): winner %, loser %', r.id, r.match_id, v_winner_id, v_loser_id;
        ELSE
            RAISE NOTICE 'Skipped match_result % (match %): could not derive winner from set scores', r.id, r.match_id;
        END IF;
    END LOOP;
END;
$$;
