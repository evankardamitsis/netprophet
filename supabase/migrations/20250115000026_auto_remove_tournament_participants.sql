-- Function to automatically remove players from tournament participants when removed from matches
CREATE OR REPLACE FUNCTION auto_remove_tournament_participants
()
RETURNS TRIGGER AS $$
DECLARE
    player_a_still_in_tournament BOOLEAN;
    player_b_still_in_tournament BOOLEAN;
BEGIN
    -- Only proceed if this is a tournament match
    IF OLD.tournament_id IS NULL THEN
    RETURN OLD;
END
IF;

    -- Check if player_a is still in any other matches in this tournament
    IF OLD.player_a_id IS NOT NULL THEN
SELECT EXISTS
(
            SELECT 1
FROM matches
WHERE tournament_id = OLD.tournament_id
    AND player_a_id = OLD.player_a_id
    AND id != OLD.id
        )
OR EXISTS
(
            SELECT 1
FROM matches
WHERE tournament_id = OLD.tournament_id
    AND player_b_id = OLD.player_a_id
    AND id != OLD.id
        )
INTO player_a_still_in_tournament;

-- Remove player_a if no longer in any matches in this tournament
IF NOT player_a_still_in_tournament THEN
DELETE FROM tournament_participants 
            WHERE tournament_id = OLD.tournament_id AND player_id = OLD.player_a_id;
END
IF;
    END
IF;

    -- Check if player_b is still in any other matches in this tournament
    IF OLD.player_b_id IS NOT NULL THEN
SELECT EXISTS
(
            SELECT 1
FROM matches
WHERE tournament_id = OLD.tournament_id
    AND player_a_id = OLD.player_b_id
    AND id != OLD.id
        )
OR EXISTS
(
            SELECT 1
FROM matches
WHERE tournament_id = OLD.tournament_id
    AND player_b_id = OLD.player_b_id
    AND id != OLD.id
        )
INTO player_b_still_in_tournament;

-- Remove player_b if no longer in any matches in this tournament
IF NOT player_b_still_in_tournament THEN
DELETE FROM tournament_participants 
            WHERE tournament_id = OLD.tournament_id AND player_id = OLD.player_b_id;
END
IF;
    END
IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for DELETE operations
DROP TRIGGER IF EXISTS trigger_auto_remove_tournament_participants_delete
ON matches;
CREATE TRIGGER trigger_auto_remove_tournament_participants_delete
    AFTER
DELETE ON matches
    FOR EACH
ROW
EXECUTE FUNCTION auto_remove_tournament_participants
();

-- Create trigger for UPDATE operations (when players are removed)
DROP TRIGGER IF EXISTS trigger_auto_remove_tournament_participants_update
ON matches;
CREATE TRIGGER trigger_auto_remove_tournament_participants_update
    AFTER
UPDATE ON matches
    FOR EACH ROW
WHEN
(OLD.player_a_id IS DISTINCT FROM NEW.player_a_id OR OLD.player_b_id IS DISTINCT FROM NEW.player_b_id)
EXECUTE FUNCTION auto_remove_tournament_participants
();
