-- Function to sync existing tournament participants from matches
CREATE OR REPLACE FUNCTION sync_existing_tournament_participants
()
RETURNS void AS $$
BEGIN
    -- Insert all unique players from existing tournament matches
    INSERT INTO tournament_participants
        (tournament_id, category_id, player_id, status)
    SELECT DISTINCT
        m.tournament_id,
        m.category_id,
        m.player_a_id,
        'registered'
    FROM matches m
    WHERE m.tournament_id IS NOT NULL
        AND m.player_a_id IS NOT NULL
        AND NOT EXISTS (
        SELECT 1
        FROM tournament_participants tp
        WHERE tp.tournament_id = m.tournament_id
            AND tp.player_id = m.player_a_id
    )
    ON CONFLICT (tournament_id, player_id) DO NOTHING;

    INSERT INTO tournament_participants
        (tournament_id, category_id, player_id, status)
    SELECT DISTINCT
        m.tournament_id,
        m.category_id,
        m.player_b_id,
        'registered'
    FROM matches m
    WHERE m.tournament_id IS NOT NULL
        AND m.player_b_id IS NOT NULL
        AND NOT EXISTS (
        SELECT 1
        FROM tournament_participants tp
        WHERE tp.tournament_id = m.tournament_id
            AND tp.player_id = m.player_b_id
    )
    ON CONFLICT (tournament_id, player_id) DO NOTHING;

    -- Update tournament participant counts
    UPDATE tournaments 
    SET current_participants = (
        SELECT COUNT(DISTINCT player_id)
    FROM tournament_participants
    WHERE tournament_id = tournaments.id
    );

    -- Update category participant counts
    UPDATE tournament_categories 
    SET current_participants = (
        SELECT COUNT(DISTINCT player_id)
    FROM tournament_participants
    WHERE tournament_id = tournament_categories.tournament_id
        AND category_id = tournament_categories.id
    );
END;
$$ LANGUAGE plpgsql;

-- Execute the sync function
SELECT sync_existing_tournament_participants();
