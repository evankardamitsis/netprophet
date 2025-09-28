-- Add welcome email system for new users
-- This sends a welcome email with bonus information when users register

-- 1. Create function to send welcome email to new users
CREATE OR REPLACE FUNCTION send_welcome_email_to_user(
    user_email TEXT,
    user_id UUID,
    user_name TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    template_variables JSONB;
BEGIN
    -- Prepare template variables for welcome email
    template_variables := jsonb_build_object(
        'user_email', user_email,
        'user_id', user_id,
        'user_name', COALESCE(user_name, 'New User'),
        'welcome_bonus_coins', 100,
        'welcome_bonus_pass', 'Tournament Pass',
        'app_url', 'https://netprophet.app',
        'timestamp', NOW()::text
    );

    -- Insert welcome email into email_logs for processing
    INSERT INTO public.email_logs
        (
            user_id,
            to_email,
            template,
            type,
            language,
            variables,
            status
        )
    VALUES
        (
            user_id,
            user_email,
            'welcome_email',
            'user',
            'en', -- Default to English, can be customized later
            template_variables,
            'pending'  -- Mark as pending for processing
        );
    
    RAISE LOG 'Welcome email logged for user: %', user_email;
END;
$$ LANGUAGE plpgsql;

-- 2. Update the handle_new_user function to send welcome email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_first_name TEXT;
    user_last_name TEXT;
    matching_players_count INTEGER;
    matching_player_id UUID;
    full_user_name TEXT;
BEGIN
    -- Extract firstName and lastName from user metadata
    user_first_name := COALESCE(NEW.raw_user_meta_data->>'firstName', NEW.raw_user_meta_data->>'first_name', '');
    user_last_name := COALESCE(NEW.raw_user_meta_data->>'lastName', NEW.raw_user_meta_data->>'last_name', '');
    full_user_name := COALESCE(user_first_name || ' ' || user_last_name, 'New User');
    
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
            two_factor_enabled,
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
        'A new user has registered on NetProphet: ' || NEW.email,
        jsonb_build_object(
            'user_email', NEW.email,
            'user_id', NEW.id,
            'registration_time', NEW.created_at,
            'user_name', full_user_name
        )
    );
    
    -- Send welcome email to the new user
    PERFORM send_welcome_email_to_user(
        NEW.email,
        NEW.id,
        full_user_name
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
            SET 
                profile_claim_status = 'completed',
                updated_at = NOW()
            WHERE id = NEW.id;
        ELSE
            -- Multiple or no matches - set status to pending
            UPDATE profiles 
            SET 
                profile_claim_status = 'pending',
                updated_at = NOW()
            WHERE id = NEW.id;
        END IF;
    ELSE
        -- No name provided (e.g., Google OAuth) - set status to pending
        UPDATE profiles 
        SET 
            profile_claim_status = 'pending',
            updated_at = NOW()
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE LOG 'Error in handle_new_user for user %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant necessary permissions
GRANT EXECUTE ON FUNCTION send_welcome_email_to_user(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION send_welcome_email_to_user(TEXT, UUID, TEXT) TO anon;

-- 4. Add comment for documentation
COMMENT ON FUNCTION send_welcome_email_to_user IS 'Sends welcome email to new users with bonus information';
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates profile for new users with automatic player matching, admin notifications, and welcome emails';
