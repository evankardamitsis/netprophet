-- Fix admin email notification system
-- Issues to fix:
-- 1. Profile claim trigger uses wrong column name (user_id instead of claimed_by_user_id)
-- 2. User registration trigger on profiles is redundant (handle_new_user already handles it)
-- 3. Need to ensure admin email template exists
-- 4. Make sure send_admin_alert_email uses correct JSON function

-- 1. Drop the redundant triggers on profiles table
DROP TRIGGER IF EXISTS admin_user_registration_email_trigger ON profiles;
DROP FUNCTION IF EXISTS trigger_admin_user_registration_email();

-- 2. Fix the profile claim trigger function to use correct column name
CREATE OR REPLACE FUNCTION trigger_admin_profile_claim_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only send email if this is a player claim (claimed_by_user_id changed from NULL to a user)
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

-- 3. Recreate the profile claim trigger
DROP TRIGGER IF EXISTS admin_profile_claim_email_trigger ON players;
CREATE TRIGGER admin_profile_claim_email_trigger
    AFTER INSERT OR UPDATE ON players
    FOR EACH ROW
    EXECUTE FUNCTION trigger_admin_profile_claim_email();

-- 4. Ensure send_admin_alert_email uses jsonb_build_object (not json_build_object)
-- This is already correct in the consolidated migration, just ensure it's consistent

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION trigger_admin_profile_claim_email() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_admin_profile_claim_email() TO service_role;

-- 6. Add comment
COMMENT ON FUNCTION trigger_admin_profile_claim_email() IS 'Sends admin email when a user claims a player profile';
