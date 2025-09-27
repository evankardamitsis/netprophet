-- Fix UPDATE statements in tournament participant functions
-- This migration corrects UPDATE statements that were missing WHERE clauses in the functions

-- Drop and recreate the sync function with proper WHERE clauses
DROP FUNCTION IF EXISTS sync_existing_tournament_participants();

CREATE OR REPLACE FUNCTION sync_existing_tournament_participants()
RETURNS void AS $$
BEGIN
    -- Insert all unique players from existing tournament matches
    INSERT INTO tournament_participants
        (tournament_id, player_id, registration_date)
    SELECT DISTINCT
        m.tournament_id,
        m.player_a_id,
        NOW()
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
        (tournament_id, player_id, registration_date)
    SELECT DISTINCT
        m.tournament_id,
        m.player_b_id,
        NOW()
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
    )
    WHERE EXISTS (
        SELECT 1 FROM tournament_participants WHERE tournament_id = tournaments.id
    );
END;
$$ LANGUAGE plpgsql;

-- Drop triggers that depend on the functions first
DROP TRIGGER IF EXISTS trigger_auto_remove_tournament_participants_delete ON matches;
DROP TRIGGER IF EXISTS trigger_auto_remove_tournament_participants_update ON matches;

-- Drop and recreate the auto-remove function with proper WHERE clauses
DROP FUNCTION IF EXISTS auto_remove_tournament_participants();

CREATE OR REPLACE FUNCTION auto_remove_tournament_participants()
RETURNS TRIGGER AS $$
DECLARE
    tournament_exists BOOLEAN;
BEGIN
    -- Only proceed if this was a tournament match
    IF OLD.tournament_id IS NULL THEN
        RETURN OLD;
    END IF;

    -- Check if tournament still exists
    SELECT EXISTS(SELECT 1 FROM tournaments WHERE id = OLD.tournament_id) INTO tournament_exists;
    IF NOT tournament_exists THEN
        RETURN OLD;
    END IF;

    -- Remove player_a if no longer in any tournament matches
    IF OLD.player_a_id IS NOT NULL THEN
        DELETE FROM tournament_participants 
        WHERE tournament_id = OLD.tournament_id 
            AND player_id = OLD.player_a_id
            AND NOT EXISTS (
                SELECT 1 FROM matches 
                WHERE tournament_id = OLD.tournament_id 
                    AND (player_a_id = OLD.player_a_id OR player_b_id = OLD.player_a_id)
            );
    END IF;

    -- Remove player_b if no longer in any tournament matches
    IF OLD.player_b_id IS NOT NULL THEN
        DELETE FROM tournament_participants 
        WHERE tournament_id = OLD.tournament_id 
            AND player_id = OLD.player_b_id
            AND NOT EXISTS (
                SELECT 1 FROM matches 
                WHERE tournament_id = OLD.tournament_id 
                    AND (player_a_id = OLD.player_b_id OR player_b_id = OLD.player_b_id)
            );
    END IF;

    -- Update tournament participant counts
    UPDATE tournaments 
    SET current_participants = (
        SELECT COUNT(DISTINCT player_id)
        FROM tournament_participants
        WHERE tournament_id = OLD.tournament_id
    )
    WHERE id = OLD.tournament_id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Recreate the triggers
CREATE TRIGGER trigger_auto_remove_tournament_participants_delete
    AFTER DELETE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION auto_remove_tournament_participants();

CREATE TRIGGER trigger_auto_remove_tournament_participants_update
    AFTER UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION auto_remove_tournament_participants();
