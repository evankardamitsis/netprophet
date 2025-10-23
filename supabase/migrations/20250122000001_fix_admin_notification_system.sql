-- Fix admin notification system
-- This migration addresses the issues found in the admin notification system

-- 1. Add missing error_message column to email_logs table
ALTER TABLE email_logs 
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 2. Create or replace the send_admin_alert_email function with proper error handling
CREATE OR REPLACE FUNCTION send_admin_alert_email(
    alert_type TEXT,
    message TEXT,
    details JSONB DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    template_variables JSONB;
    admin_record RECORD;
BEGIN
    -- Prepare template variables
    template_variables := jsonb_build_object(
        'alert_type', alert_type,
        'message', message,
        'details', COALESCE(details::text, ''),
        'timestamp', NOW()::text
    );

    -- Log emails for each admin user with 'pending' status for processing
    FOR admin_record IN
    SELECT p.email, p.id as user_id
    FROM profiles p
    WHERE p.is_admin = true
    LOOP
        INSERT INTO public.email_logs (
            user_id,
            to_email,
            template,
            type,
            language,
            variables,
            status,
            sent_at
        )
        VALUES (
            admin_record.user_id,
            admin_record.email,
            'admin_alert',
            'admin',
            'en',
            template_variables,
            'pending',
            NOW()  -- Set sent_at to trigger webhook immediately
        );
    END LOOP;
    
    RAISE LOG 'Admin alert emails logged for % admin users',
        (SELECT COUNT(*) FROM profiles WHERE is_admin = true);
END;
$$ LANGUAGE plpgsql;

-- 3. Create or replace the trigger function for new user registrations
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

-- 4. Create or replace the trigger function for profile claims
CREATE OR REPLACE FUNCTION trigger_admin_profile_claim_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only send email if this is a new player record (profile claim)
    -- and the claimed_by_user_id is not null (indicating a real user claim)
    IF NEW.claimed_by_user_id IS NOT NULL AND 
       (OLD IS NULL OR OLD.claimed_by_user_id IS NULL OR OLD.claimed_by_user_id != NEW.claimed_by_user_id) THEN
        -- Send admin alert email for profile claim
        PERFORM send_admin_alert_email(
            'Player Profile Claimed',
            'A user has claimed a player profile: ' || NEW.first_name || ' ' || NEW.last_name,
            jsonb_build_object(
                'player_name', NEW.first_name || ' ' || NEW.last_name,
                'player_id', NEW.id,
                'user_id', NEW.claimed_by_user_id,
                'claim_time', NOW(),
                'player_rating', NEW.ntrp_rating,
                'player_age', NEW.age
            )
        );
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the player update
        RAISE LOG 'Error sending admin profile claim email for player %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- 5. Create trigger function for athlete profile creation requests
CREATE OR REPLACE FUNCTION trigger_admin_athlete_profile_creation_request_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only send email if profile_claim_status changed to 'creation_requested'
    -- This happens when a user requests a NEW athlete profile to be created
    IF NEW.profile_claim_status = 'creation_requested' AND 
       (OLD IS NULL OR OLD.profile_claim_status != 'creation_requested') THEN
        -- Send admin alert email for athlete profile creation request
        PERFORM send_admin_alert_email(
            'Athlete Profile Creation Requested',
            'A user has requested a new athlete profile to be created: ' || NEW.email,
            jsonb_build_object(
                'user_email', NEW.email,
                'user_id', NEW.id,
                'user_name', COALESCE(NEW.first_name || ' ' || NEW.last_name, 'Not provided'),
                'request_time', NOW()
            )
        );
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the profile update
        RAISE LOG 'Error sending admin athlete profile creation request email for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- 6. Create or replace triggers
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

DROP TRIGGER IF EXISTS admin_athlete_profile_creation_request_email_trigger ON profiles;
CREATE TRIGGER admin_athlete_profile_creation_request_email_trigger
    AFTER UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_admin_athlete_profile_creation_request_email();

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION send_admin_alert_email(TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION send_admin_alert_email(TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION trigger_admin_user_registration_email() TO service_role;
GRANT EXECUTE ON FUNCTION trigger_admin_profile_claim_email() TO service_role;
GRANT EXECUTE ON FUNCTION trigger_admin_athlete_profile_creation_request_email() TO service_role;

-- 8. Add comments
COMMENT ON FUNCTION send_admin_alert_email IS 'Sends admin alert emails to all administrators with proper error handling';
COMMENT ON FUNCTION trigger_admin_user_registration_email IS 'Triggers admin notification when a new user registers';
COMMENT ON FUNCTION trigger_admin_profile_claim_email IS 'Triggers admin notification when a user claims a player profile';
COMMENT ON FUNCTION trigger_admin_athlete_profile_creation_request_email IS 'Triggers admin notification when a user requests a new athlete profile to be created';
