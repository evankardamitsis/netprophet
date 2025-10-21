-- Fix user registration trigger to ensure emails are sent
-- This migration ensures the trigger is properly set up for new user registrations

-- 1. Drop any existing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Create the complete handle_new_user function with both admin notifications and welcome emails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_first_name TEXT;
    user_last_name TEXT;
    matching_players_count INTEGER;
    matching_player_id UUID;
BEGIN
    -- Extract firstName and lastName from user metadata
    user_first_name := COALESCE(NEW.raw_user_meta_data->>'firstName', NEW.raw_user_meta_data->>'first_name', '');
    user_last_name := COALESCE(NEW.raw_user_meta_data->>'lastName', NEW.raw_user_meta_data->>'last_name', '');
    
    -- Insert profile with correct column names
    INSERT INTO public.profiles
        (
            id, 
            email, 
            first_name, 
            last_name, 
            balance, 
            daily_login_streak, 
            has_received_welcome_bonus,
            mfa_required,
            created_at, 
            updated_at
        )
    VALUES
        (
            NEW.id,
            NEW.email,
            user_first_name,
            user_last_name,
            0, -- balance starts at 0
            0, -- daily_login_streak starts at 0
            false, -- has_received_welcome_bonus starts false
            true, -- Enable 2FA by default
            NEW.created_at,
            NEW.updated_at
        );
    
    -- Send admin notification for new user registration
    PERFORM send_admin_alert_email(
        'New User Registration',
        'A new user has registered on NetProphet',
        json_build_object(
            'user_email', NEW.email,
            'user_name', COALESCE(user_first_name || ' ' || user_last_name, 'Unknown'),
            'registration_time', NEW.created_at,
            'user_id', NEW.id
        )
    );
    
    -- Send welcome email to the new user
    PERFORM send_welcome_email_to_user(
        NEW.email,
        NEW.id,
        COALESCE(user_first_name || ' ' || user_last_name, 'New User')
    );
    
    -- If we have both first and last name, try to find matching players
    IF user_first_name != '' AND user_last_name != '' THEN
        -- Count matching players
        SELECT COUNT(*)
        INTO matching_players_count
        FROM find_matching_players(user_first_name, user_last_name);
        
        -- If we found exactly one match, automatically claim it
        IF matching_players_count = 1 THEN
            SELECT id
            INTO matching_player_id
            FROM find_matching_players(user_first_name, user_last_name)
            LIMIT 1;
            
            -- Claim the player profile
            PERFORM claim_player_profile(matching_player_id, NEW.id);
            
            -- Update profile status
            UPDATE profiles 
            SET profile_claim_status = 'claimed'
            WHERE id = NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE LOG 'Error in handle_new_user for user %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 4. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.send_admin_alert_email(TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.send_welcome_email_to_user(TEXT, UUID, TEXT) TO service_role;
