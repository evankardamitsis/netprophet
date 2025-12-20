-- Integrate in-app notifications for profile activation
-- Create trigger to detect when a player profile is activated and linked to a user

CREATE OR REPLACE FUNCTION notify_profile_activation
()
RETURNS TRIGGER AS $$
DECLARE
    player_name TEXT;
    user_email TEXT;
BEGIN
    -- Only trigger if:
    -- 1. Player is being activated (is_active changed from false to true)
    -- 2. Player has a claimed_by_user_id (linked to a user)
    -- 3. This is an UPDATE operation (not INSERT)
    IF TG_OP = 'UPDATE'
        AND NEW.is_active = TRUE
        AND OLD.is_active = FALSE
        AND NEW.claimed_by_user_id IS NOT NULL THEN
        
        -- Get player name
        player_name := COALESCE
    (NEW.first_name || ' ' || NEW.last_name, 'Unknown Player');

-- Get user email if available
SELECT email
INTO user_email
FROM auth.users
WHERE id = NEW.claimed_by_user_id;

-- Create in-app notification
PERFORM create_admin_notification
(
            'profile_activated',
            'Profile Activated',
            'Athlete profile activated for ' || player_name || COALESCE
(' (' || user_email || ')', ''),
            'success',
            jsonb_build_object
(
                'user_id', NEW.claimed_by_user_id,
                'player_id', NEW.id,
                'player_name', player_name,
                'user_email', COALESCE
(user_email, 'unknown')
            )
        );
END
IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on players table
-- Note: DROP TRIGGER IF EXISTS will show a notice if trigger doesn't exist - this is expected on first run
DROP TRIGGER IF EXISTS trigger_notify_profile_activation
ON public.players;
CREATE TRIGGER trigger_notify_profile_activation
    AFTER
UPDATE ON public.players
    FOR EACH ROW
WHEN
(OLD.is_active IS DISTINCT FROM NEW.is_active OR OLD.claimed_by_user_id IS DISTINCT FROM NEW.claimed_by_user_id)
EXECUTE FUNCTION notify_profile_activation
();

COMMENT ON FUNCTION notify_profile_activation
() IS 'Creates in-app notification when a player profile is activated and linked to a user';
COMMENT ON TRIGGER trigger_notify_profile_activation ON public.players IS 'Triggers notification when player is activated and linked to user';
