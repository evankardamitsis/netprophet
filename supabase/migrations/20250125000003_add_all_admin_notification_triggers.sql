-- Add admin notifications for all system events
-- This migration creates triggers and functions to automatically create notifications
-- for tournaments, players, match results, and other events

-- 1. Tournament Created/Updated Notifications
CREATE OR REPLACE FUNCTION notify_tournament_created()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_admin_notification(
        'tournament_created',
        'Tournament Created',
        'New tournament created: ' || NEW.name,
        'info',
        jsonb_build_object(
            'tournament_id', NEW.id,
            'tournament_name', NEW.name,
            'start_date', NEW.start_date,
            'end_date', NEW.end_date,
            'location', NEW.location,
            'surface', NEW.surface
        )
    );
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error creating tournament_created notification: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION notify_tournament_updated()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify if significant fields changed
    IF (OLD.name IS DISTINCT FROM NEW.name) OR
       (OLD.status IS DISTINCT FROM NEW.status) OR
       (OLD.start_date IS DISTINCT FROM NEW.start_date) OR
       (OLD.end_date IS DISTINCT FROM NEW.end_date) THEN
        PERFORM create_admin_notification(
            'tournament_updated',
            'Tournament Updated',
            'Tournament updated: ' || NEW.name,
            'info',
            jsonb_build_object(
                'tournament_id', NEW.id,
                'tournament_name', NEW.name,
                'changes', jsonb_build_object(
                    'name_changed', OLD.name IS DISTINCT FROM NEW.name,
                    'status_changed', OLD.status IS DISTINCT FROM NEW.status,
                    'start_date_changed', OLD.start_date IS DISTINCT FROM NEW.start_date,
                    'end_date_changed', OLD.end_date IS DISTINCT FROM NEW.end_date
                )
            )
        );
    END IF;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error creating tournament_updated notification: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for tournaments
DROP TRIGGER IF EXISTS tournament_created_notification ON tournaments;
CREATE TRIGGER tournament_created_notification
    AFTER INSERT ON tournaments
    FOR EACH ROW
    EXECUTE FUNCTION notify_tournament_created();

DROP TRIGGER IF EXISTS tournament_updated_notification ON tournaments;
CREATE TRIGGER tournament_updated_notification
    AFTER UPDATE ON tournaments
    FOR EACH ROW
    EXECUTE FUNCTION notify_tournament_updated();

-- 2. Player Created/Updated Notifications
CREATE OR REPLACE FUNCTION notify_player_created()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify for non-demo, non-hidden players created by admins (not from profile requests)
    IF NEW.is_demo_player = false AND NEW.is_hidden = false AND NEW.profile_creation_requested = false THEN
        PERFORM create_admin_notification(
            'player_created',
            'Player Created',
            'New player created: ' || NEW.first_name || ' ' || NEW.last_name,
            'info',
            jsonb_build_object(
                'player_id', NEW.id,
                'player_name', NEW.first_name || ' ' || NEW.last_name,
                'ntrp_rating', NEW.ntrp_rating,
                'age', NEW.age
            )
        );
    END IF;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error creating player_created notification: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION notify_player_updated()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify if significant fields changed (not just stats updates)
    IF (OLD.first_name IS DISTINCT FROM NEW.first_name) OR
       (OLD.last_name IS DISTINCT FROM NEW.last_name) OR
       (OLD.ntrp_rating IS DISTINCT FROM NEW.ntrp_rating) OR
       (OLD.is_active IS DISTINCT FROM NEW.is_active) OR
       (OLD.is_hidden IS DISTINCT FROM NEW.is_hidden) THEN
        PERFORM create_admin_notification(
            'player_updated',
            'Player Updated',
            'Player updated: ' || NEW.first_name || ' ' || NEW.last_name,
            'info',
            jsonb_build_object(
                'player_id', NEW.id,
                'player_name', NEW.first_name || ' ' || NEW.last_name,
                'changes', jsonb_build_object(
                    'name_changed', (OLD.first_name IS DISTINCT FROM NEW.first_name) OR (OLD.last_name IS DISTINCT FROM NEW.last_name),
                    'ntrp_changed', OLD.ntrp_rating IS DISTINCT FROM NEW.ntrp_rating,
                    'status_changed', (OLD.is_active IS DISTINCT FROM NEW.is_active) OR (OLD.is_hidden IS DISTINCT FROM NEW.is_hidden)
                )
            )
        );
    END IF;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error creating player_updated notification: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for players
DROP TRIGGER IF EXISTS player_created_notification ON players;
CREATE TRIGGER player_created_notification
    AFTER INSERT ON players
    FOR EACH ROW
    EXECUTE FUNCTION notify_player_created();

DROP TRIGGER IF EXISTS player_updated_notification ON players;
CREATE TRIGGER player_updated_notification
    AFTER UPDATE ON players
    FOR EACH ROW
    EXECUTE FUNCTION notify_player_updated();

-- 3. Match Result Entered Notification
CREATE OR REPLACE FUNCTION notify_match_result_entered()
RETURNS TRIGGER AS $$
DECLARE
    match_info RECORD;
    tournament_name TEXT;
    player_a_name TEXT;
    player_b_name TEXT;
BEGIN
    -- Get match and tournament info
    SELECT 
        m.id,
        t.name as tournament_name,
        pa.first_name || ' ' || pa.last_name as player_a_name,
        pb.first_name || ' ' || pb.last_name as player_b_name
    INTO match_info
    FROM matches m
    LEFT JOIN tournaments t ON m.tournament_id = t.id
    LEFT JOIN players pa ON m.player_a_id = pa.id
    LEFT JOIN players pb ON m.player_b_id = pb.id
    WHERE m.id = NEW.match_id;

    -- Create notification
    PERFORM create_admin_notification(
        'match_result_entered',
        'Match Result Entered',
        'Match result entered: ' || COALESCE(match_info.player_a_name, 'Player A') || ' vs ' || COALESCE(match_info.player_b_name, 'Player B'),
        'info',
        jsonb_build_object(
            'match_id', NEW.match_id,
            'match_result_id', NEW.id,
            'tournament_name', match_info.tournament_name,
            'match_result', NEW.match_result,
            'winner_id', NEW.winner_id
        )
    );
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error creating match_result_entered notification: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for match results
DROP TRIGGER IF EXISTS match_result_entered_notification ON match_results;
CREATE TRIGGER match_result_entered_notification
    AFTER INSERT ON match_results
    FOR EACH ROW
    EXECUTE FUNCTION notify_match_result_entered();

-- Grant permissions
GRANT EXECUTE ON FUNCTION notify_tournament_created() TO service_role;
GRANT EXECUTE ON FUNCTION notify_tournament_updated() TO service_role;
GRANT EXECUTE ON FUNCTION notify_player_created() TO service_role;
GRANT EXECUTE ON FUNCTION notify_player_updated() TO service_role;
GRANT EXECUTE ON FUNCTION notify_match_result_entered() TO service_role;

COMMENT ON FUNCTION notify_tournament_created() IS 'Creates admin notification when a tournament is created';
COMMENT ON FUNCTION notify_tournament_updated() IS 'Creates admin notification when a tournament is updated';
COMMENT ON FUNCTION notify_player_created() IS 'Creates admin notification when a player is created (excluding demo players and profile requests)';
COMMENT ON FUNCTION notify_player_updated() IS 'Creates admin notification when a player is updated (only for significant changes)';
COMMENT ON FUNCTION notify_match_result_entered() IS 'Creates admin notification when a match result is entered';
