-- Restore the profile claim trigger as a backup mechanism
-- This ensures admin emails are sent even if the function call fails
-- The trigger will detect duplicate emails and won't send if one was already logged

CREATE OR REPLACE FUNCTION trigger_admin_profile_claim_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    existing_email_count INTEGER;
BEGIN
    -- Only send email if this is a player claim (claimed_by_user_id changed from NULL to a user)
    IF NEW.claimed_by_user_id IS NOT NULL AND 
       (OLD IS NULL OR OLD.claimed_by_user_id IS NULL OR OLD.claimed_by_user_id != NEW.claimed_by_user_id) THEN
        
        -- Check if an admin email for this claim was already sent in the last 5 seconds
        -- This prevents duplicates if handle_player_claim already sent one
        SELECT COUNT(*) INTO existing_email_count
        FROM email_logs
        WHERE type = 'admin'
          AND template = 'admin_alert'
          AND variables->>'player_id' = NEW.id::text
          AND created_at > NOW() - INTERVAL '5 seconds';
        
        -- Only send if no recent email was found
        IF existing_email_count = 0 THEN
            PERFORM send_admin_alert_email(
                'Player Profile Claimed',
                'User has claimed a player profile: ' || NEW.first_name || ' ' || NEW.last_name,
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
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the player claim
        RAISE LOG 'Error sending admin profile claim email for player %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS admin_profile_claim_email_trigger ON players;
CREATE TRIGGER admin_profile_claim_email_trigger
    AFTER INSERT OR UPDATE ON players
    FOR EACH ROW
    EXECUTE FUNCTION trigger_admin_profile_claim_email();

COMMENT ON FUNCTION trigger_admin_profile_claim_email() IS 'Backup trigger to send admin email for profile claims (with duplicate detection)';

