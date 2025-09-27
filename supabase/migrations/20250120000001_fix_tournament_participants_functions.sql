-- Fix tournament participant functions after category_id column removal
-- This migration updates all functions that reference the removed category_id column

-- Drop and recreate the sync function without category_id references
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
DROP TRIGGER IF EXISTS trigger_auto_add_tournament_participants_insert ON matches;
DROP TRIGGER IF EXISTS trigger_auto_add_tournament_participants_update ON matches;
DROP TRIGGER IF EXISTS trigger_auto_remove_tournament_participants_delete ON matches;
DROP TRIGGER IF EXISTS trigger_auto_remove_tournament_participants_update ON matches;

-- Drop and recreate the auto-add function without category_id references
DROP FUNCTION IF EXISTS auto_add_tournament_participants();

CREATE OR REPLACE FUNCTION auto_add_tournament_participants()
RETURNS TRIGGER AS $$
DECLARE
    tournament_exists BOOLEAN;
    participant_exists BOOLEAN;
BEGIN
    -- Only proceed if this is a tournament match
    IF NEW.tournament_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Check if tournament exists
    SELECT EXISTS(SELECT 1 FROM tournaments WHERE id = NEW.tournament_id) INTO tournament_exists;
    IF NOT tournament_exists THEN
        RETURN NEW;
    END IF;

    -- Add player_a if not already a participant
    IF NEW.player_a_id IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM tournament_participants 
            WHERE tournament_id = NEW.tournament_id AND player_id = NEW.player_a_id
        ) INTO participant_exists;
        
        IF NOT participant_exists THEN
            INSERT INTO tournament_participants (tournament_id, player_id, registration_date)
            VALUES (NEW.tournament_id, NEW.player_a_id, NOW())
            ON CONFLICT (tournament_id, player_id) DO NOTHING;
        END IF;
    END IF;

    -- Add player_b if not already a participant
    IF NEW.player_b_id IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM tournament_participants 
            WHERE tournament_id = NEW.tournament_id AND player_id = NEW.player_b_id
        ) INTO participant_exists;
        
        IF NOT participant_exists THEN
            INSERT INTO tournament_participants (tournament_id, player_id, registration_date)
            VALUES (NEW.tournament_id, NEW.player_b_id, NOW())
            ON CONFLICT (tournament_id, player_id) DO NOTHING;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the auto-remove function without category_id references
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

-- Update tournament participant counts for all existing tournaments
UPDATE tournaments 
SET current_participants = (
    SELECT COUNT(DISTINCT player_id)
    FROM tournament_participants
    WHERE tournament_id = tournaments.id
)
WHERE EXISTS (
    SELECT 1 FROM tournament_participants WHERE tournament_id = tournaments.id
);

-- Update tournament category participant counts (if categories still exist)
UPDATE tournament_categories 
SET current_participants = (
    SELECT COUNT(DISTINCT tp.player_id)
    FROM tournament_participants tp
    JOIN matches m ON tp.tournament_id = m.tournament_id AND tp.player_id IN (m.player_a_id, m.player_b_id)
    WHERE m.tournament_id = tournament_categories.tournament_id
        AND m.category_id = tournament_categories.id
)
WHERE EXISTS (
    SELECT 1 FROM matches m 
    WHERE m.tournament_id = tournament_categories.tournament_id
        AND m.category_id = tournament_categories.id
);

-- Recreate the triggers
CREATE TRIGGER trigger_auto_add_tournament_participants_insert
    AFTER INSERT ON matches
    FOR EACH ROW
    EXECUTE FUNCTION auto_add_tournament_participants();

CREATE TRIGGER trigger_auto_add_tournament_participants_update
    AFTER UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION auto_add_tournament_participants();

CREATE TRIGGER trigger_auto_remove_tournament_participants_delete
    AFTER DELETE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION auto_remove_tournament_participants();

CREATE TRIGGER trigger_auto_remove_tournament_participants_update
    AFTER UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION auto_remove_tournament_participants();
