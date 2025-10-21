-- Function to automatically add players to tournament participants when added to matches
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
            INSERT INTO tournament_participants (tournament_id, category_id, player_id, status)
            VALUES (NEW.tournament_id, NEW.category_id, NEW.player_a_id, 'registered')
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
            INSERT INTO tournament_participants (tournament_id, category_id, player_id, status)
            VALUES (NEW.tournament_id, NEW.category_id, NEW.player_b_id, 'registered')
            ON CONFLICT (tournament_id, player_id) DO NOTHING;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT operations
DROP TRIGGER IF EXISTS trigger_auto_add_tournament_participants_insert ON matches;
CREATE TRIGGER trigger_auto_add_tournament_participants_insert
    AFTER INSERT ON matches
    FOR EACH ROW
    EXECUTE FUNCTION auto_add_tournament_participants();

-- Create trigger for UPDATE operations (when players change)
DROP TRIGGER IF EXISTS trigger_auto_add_tournament_participants_update ON matches;
CREATE TRIGGER trigger_auto_add_tournament_participants_update
    AFTER UPDATE ON matches
    FOR EACH ROW
    WHEN (OLD.player_a_id IS DISTINCT FROM NEW.player_a_id OR OLD.player_b_id IS DISTINCT FROM NEW.player_b_id)
    EXECUTE FUNCTION auto_add_tournament_participants();

-- Function to update tournament participant counts
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

    -- Update category participant count if category exists
    IF NEW.category_id IS NOT NULL THEN
        UPDATE tournament_categories 
        SET current_participants = (
            SELECT COUNT(DISTINCT player_id) 
            FROM tournament_participants 
            WHERE tournament_id = NEW.tournament_id AND category_id = NEW.category_id
        )
        WHERE id = NEW.category_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update counts when participants are added
DROP TRIGGER IF EXISTS trigger_update_tournament_participant_counts ON tournament_participants;
CREATE TRIGGER trigger_update_tournament_participant_counts
    AFTER INSERT OR DELETE ON tournament_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_tournament_participant_counts();
