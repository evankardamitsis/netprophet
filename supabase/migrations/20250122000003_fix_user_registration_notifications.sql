-- Fix user registration notifications
-- Ensure both admin emails and in-app notifications are created correctly

-- First, verify the trigger exists and is active
DO $$
BEGIN
    -- Check if trigger exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
    ) THEN
        RAISE EXCEPTION 'Trigger on_auth_user_created does not exist';
    END IF;
    
    RAISE LOG 'Trigger on_auth_user_created verified';
END $$;

-- Ensure create_admin_notification function has correct permissions
GRANT EXECUTE ON FUNCTION public.create_admin_notification(TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_admin_notification(TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- Ensure send_admin_alert_email function has correct permissions
GRANT EXECUTE ON FUNCTION public.send_admin_alert_email(TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.send_admin_alert_email(TEXT, TEXT, JSONB) TO authenticated;

-- Update handle_new_user to ensure notifications are created
-- Add explicit error logging for debugging
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_first_name TEXT;
    user_last_name TEXT;
    matching_players_count INTEGER;
    matching_player_id UUID;
    notification_result UUID;
    email_result BOOLEAN;
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
            email_local_part TEXT;
            email_parts TEXT[];
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
            
            -- Try 'given_name' and 'family_name' fields (Google OAuth)
            IF user_first_name = '' OR user_last_name = '' THEN
                user_first_name := COALESCE(user_first_name, NEW.raw_user_meta_data->>'given_name', '');
                user_last_name := COALESCE(user_last_name, NEW.raw_user_meta_data->>'family_name', '');
            END IF;
            
            -- Last resort: try to extract from email address
            IF user_first_name = '' OR user_last_name = '' THEN
                email_local_part := SPLIT_PART(NEW.email, '@', 1);
                email_local_part := REPLACE(REPLACE(REPLACE(email_local_part, '.', ' '), '_', ' '), '-', ' ');
                email_parts := string_to_array(trim(email_local_part), ' ');
                
                IF array_length(email_parts, 1) >= 2 THEN
                    user_first_name := COALESCE(NULLIF(user_first_name, ''), INITCAP(email_parts[1]));
                    user_last_name := COALESCE(NULLIF(user_last_name, ''), INITCAP(email_parts[array_length(email_parts, 1)]));
                ELSIF array_length(email_parts, 1) = 1 AND email_parts[1] != '' THEN
                    user_first_name := COALESCE(NULLIF(user_first_name, ''), INITCAP(email_parts[1]));
                END IF;
            END IF;
        END;
    END IF;
    
    -- Insert profile with extracted names
    INSERT INTO public.profiles (
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
    VALUES (
        NEW.id,
        NEW.email,
        user_first_name,
        user_last_name,
        0,
        0,
        false,
        true,
        NEW.created_at,
        NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
        first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), profiles.first_name),
        last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), profiles.last_name),
        updated_at = EXCLUDED.updated_at;
    
    -- Send admin email notification (this logs to email_logs table)
    BEGIN
        PERFORM send_admin_alert_email(
            'New User Registration',
            'A new user has registered on NetProphet: ' || NEW.email,
            jsonb_build_object(
                'user_email', NEW.email,
                'user_name', COALESCE(user_first_name || ' ' || user_last_name, 'Not provided'),
                'registration_time', NEW.created_at,
                'user_id', NEW.id,
                'registration_type', CASE 
                    WHEN NEW.raw_user_meta_data->>'firstName' IS NOT NULL THEN 'email_password'
                    ELSE 'oauth'
                END
            )
        );
        RAISE LOG 'Admin email notification logged for user: %', NEW.email;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'ERROR: Failed to send admin email for user %: %', NEW.email, SQLERRM;
    END;
    
    -- Create in-app notification for user registration
    BEGIN
        SELECT create_admin_notification(
            'user_registration',
            'New User Registration',
            'A new user has registered: ' || NEW.email,
            'info',
            jsonb_build_object(
                'user_id', NEW.id,
                'email', NEW.email,
                'first_name', user_first_name,
                'last_name', user_last_name,
                'registration_type', CASE 
                    WHEN NEW.raw_user_meta_data->>'firstName' IS NOT NULL THEN 'email_password'
                    ELSE 'oauth'
                END
            )
        ) INTO notification_result;
        RAISE LOG 'Admin in-app notification created for user: % (notification_id: %)', NEW.email, notification_result;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'ERROR: Failed to create admin notification for user %: %', NEW.email, SQLERRM;
    END;
    
    -- Send welcome email to the new user
    BEGIN
        PERFORM send_welcome_email_to_user(
            NEW.email,
            NEW.id,
            COALESCE(user_first_name || ' ' || user_last_name, 'New User')
        );
        RAISE LOG 'Welcome email sent to user: %', NEW.email;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'ERROR: Failed to send welcome email to user %: %', NEW.email, SQLERRM;
    END;
    
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
            SET profile_claim_status = 'claimed',
                claimed_player_id = matching_player_id,
                profile_claim_completed_at = NOW()
            WHERE id = NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE LOG 'CRITICAL ERROR in handle_new_user for user %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates profile, sends admin/welcome emails, and creates in-app notifications for new users. Includes detailed error logging.';
