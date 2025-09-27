-- Simple admin email notifications using existing email infrastructure
-- This replaces the complex notification system with simple transactional emails

-- Drop the complex admin_notifications table and related functions
DROP TABLE IF EXISTS admin_notifications CASCADE;
DROP FUNCTION IF EXISTS trigger_admin_user_registration_notification() CASCADE;
DROP FUNCTION IF EXISTS trigger_admin_profile_claim_notification() CASCADE;
DROP FUNCTION IF EXISTS get_pending_admin_notifications() CASCADE;
DROP FUNCTION IF EXISTS mark_admin_notification_processed(UUID, BOOLEAN, TEXT) CASCADE;

-- Create simple trigger function for new user registrations
CREATE OR REPLACE FUNCTION trigger_admin_user_registration_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Send admin alert email for new user registration
    PERFORM send_admin_alert_email(
        'New User Registration',
        'A new user has registered on NetProphet: ' || NEW.email,
        jsonb_build_object(
            'user_email', NEW.email,
            'user_id', NEW.id,
            'registration_time', NEW.created_at,
            'user_name', COALESCE(NEW.first_name || ' ' || NEW.last_name, 'Not provided')
        )
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE LOG 'Error sending admin registration email for user %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$;

-- Create simple trigger function for profile claims
CREATE OR REPLACE FUNCTION trigger_admin_profile_claim_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only send email if this is a new player record (profile claim)
    -- and the user_id is not null (indicating a real user claim)
    IF NEW.user_id IS NOT NULL AND (OLD IS NULL OR OLD.user_id IS NULL OR OLD.user_id != NEW.user_id) THEN
        -- Send admin alert email for profile claim
        PERFORM send_admin_alert_email(
            'Player Profile Claimed',
            'A user has claimed a player profile: ' || NEW.first_name || ' ' || NEW.last_name,
            jsonb_build_object(
                'player_name', NEW.first_name || ' ' || NEW.last_name,
                'player_id', NEW.id,
                'user_id', NEW.user_id,
                'claim_time', NOW(),
                'player_rating', NEW.ntrp_rating,
                'player_age', NEW.age
            )
        );
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the player creation
        RAISE LOG 'Error sending admin profile claim email for player %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS admin_user_registration_email_trigger ON profiles;
CREATE TRIGGER admin_user_registration_email_trigger
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_admin_user_registration_email();

DROP TRIGGER IF EXISTS admin_profile_claim_email_trigger ON players;
CREATE TRIGGER admin_profile_claim_email_trigger
    AFTER INSERT OR UPDATE ON players
    FOR EACH ROW
    EXECUTE FUNCTION trigger_admin_profile_claim_email();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION trigger_admin_user_registration_email() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_admin_profile_claim_email() TO authenticated;
GRANT EXECUTE ON FUNCTION send_admin_alert_email(TEXT, TEXT, JSONB) TO authenticated;
