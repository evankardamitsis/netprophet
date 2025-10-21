-- Fix all remaining category_id references in functions and triggers
-- This migration addresses any remaining functions that still reference NEW.category_id

-- Drop trigger first, then recreate the function
DROP TRIGGER IF EXISTS trigger_update_tournament_participant_counts ON tournament_participants;

-- Drop and recreate the update_tournament_participant_counts function without category_id references
DROP FUNCTION IF EXISTS update_tournament_participant_counts();

CREATE OR REPLACE FUNCTION update_tournament_participant_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update tournament participant count
    UPDATE tournaments 
    SET current_participants = (
        SELECT COUNT(DISTINCT player_id) 
        FROM tournament_participants 
        WHERE tournament_id = NEW.tournament_id
    )
    WHERE id = NEW.tournament_id;

    -- Note: Removed category_id logic since category_id column was removed from tournament_participants

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure all triggers are using the correct functions
DROP TRIGGER IF EXISTS trigger_update_tournament_participant_counts ON tournament_participants;
CREATE TRIGGER trigger_update_tournament_participant_counts
    AFTER INSERT OR DELETE ON tournament_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_tournament_participant_counts();

-- Double-check that all tournament participant functions are up to date
-- Recreate auto_add_tournament_participants function to ensure it's the latest version
DROP TRIGGER IF EXISTS trigger_auto_add_tournament_participants_insert ON matches;
DROP TRIGGER IF EXISTS trigger_auto_add_tournament_participants_update ON matches;

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

-- Recreate the triggers
CREATE TRIGGER trigger_auto_add_tournament_participants_insert
    AFTER INSERT ON matches
    FOR EACH ROW
    EXECUTE FUNCTION auto_add_tournament_participants();

CREATE TRIGGER trigger_auto_add_tournament_participants_update
    AFTER UPDATE ON matches
    FOR EACH ROW
    WHEN (OLD.player_a_id IS DISTINCT FROM NEW.player_a_id OR OLD.player_b_id IS DISTINCT FROM NEW.player_b_id)
    EXECUTE FUNCTION auto_add_tournament_participants();
