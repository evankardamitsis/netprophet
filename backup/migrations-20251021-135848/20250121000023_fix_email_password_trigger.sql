-- Fix trigger for email/password registrations
-- This migration ensures the trigger works for both OAuth and email/password registrations

-- 1. Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Create the updated handle_new_user function that works for both registration types
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_first_name TEXT;
    user_last_name TEXT;
    matching_players_count INTEGER;
    matching_player_id UUID;
BEGIN
    -- Extract names from different sources (OAuth and email/password)
    -- Try email/password registration first (firstName, lastName)
    user_first_name := COALESCE(NEW.raw_user_meta_data->>'firstName', '');
    user_last_name := COALESCE(NEW.raw_user_meta_data->>'lastName', '');
    
    -- If no custom names, try OAuth metadata
    IF user_first_name = '' OR user_last_name = '' THEN
        -- Try 'name' field (Google OAuth)
        DECLARE
            full_name TEXT;
            name_parts TEXT[];
        BEGIN
            full_name := COALESCE(NEW.raw_user_meta_data->>'name', '');
            IF full_name != '' THEN
                -- Split full name into parts
                name_parts := string_to_array(trim(full_name), ' ');
                IF array_length(name_parts, 1) >= 2 THEN
                    user_first_name := name_parts[1];
                    user_last_name := name_parts[array_length(name_parts, 1)];
                END IF;
            END IF;
            
            -- Try 'full_name' field as fallback
            IF user_first_name = '' OR user_last_name = '' THEN
                full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
                IF full_name != '' THEN
                    name_parts := string_to_array(trim(full_name), ' ');
                    IF array_length(name_parts, 1) >= 2 THEN
                        user_first_name := name_parts[1];
                        user_last_name := name_parts[array_length(name_parts, 1)];
                    END IF;
                END IF;
            END IF;
        END;
    END IF;
    
    -- Insert profile with extracted names
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
            'user_id', NEW.id,
            'registration_type', CASE 
                WHEN NEW.raw_user_meta_data->>'firstName' IS NOT NULL THEN 'email_password'
                ELSE 'oauth'
            END
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

-- 5. Add comment to document this change
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates profile and sends emails for new users (both OAuth and email/password registrations)';
