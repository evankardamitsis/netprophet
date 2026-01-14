-- Fix profile creation request to prevent duplicate players
-- Also ensure admin email notifications are sent correctly

-- 1. Fix request_profile_creation to check for existing players before creating
CREATE OR REPLACE FUNCTION request_profile_creation
(
    user_id UUID,
    user_name TEXT,
    user_surname TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    existing_player_count INTEGER;
    normalized_first_name TEXT;
    normalized_last_name TEXT;
BEGIN
    -- Normalize names for comparison (uppercase, trim)
    normalized_first_name := UPPER(TRIM(user_name));
    normalized_last_name := UPPER(TRIM(user_surname));
    
    -- Check if a player with the same name already exists (case-insensitive)
    SELECT COUNT(*)
    INTO existing_player_count
    FROM players
    WHERE UPPER(TRIM(first_name)) = normalized_first_name
      AND UPPER(TRIM(last_name)) = normalized_last_name
      AND is_active = true; -- Only check active players
    
    -- If player already exists, don't create duplicate - just return true
    -- The profile will be marked as creation_requested, but no player will be created
    IF existing_player_count > 0 THEN
        RAISE LOG 'Player % % already exists, skipping duplicate creation for user %', 
            user_name, user_surname, user_id;
        RETURN true;
    END IF;
    
    -- Check if a draft player (hidden, inactive) with this name already exists
    SELECT COUNT(*)
    INTO existing_player_count
    FROM players
    WHERE UPPER(TRIM(first_name)) = normalized_first_name
      AND UPPER(TRIM(last_name)) = normalized_last_name
      AND is_hidden = true
      AND is_active = false
      AND profile_creation_requested = true;
    
    -- If draft already exists, don't create another one
    IF existing_player_count > 0 THEN
        RAISE LOG 'Draft player % % already exists, skipping duplicate creation for user %', 
            user_name, user_surname, user_id;
        RETURN true;
    END IF;
    
    -- No existing player found, create a draft player profile
    INSERT INTO players
        (
        first_name,
        last_name,
        ntrp_rating,
        streak_type,
        surface_preference,
        age,
        hand,
        is_hidden,
        is_active,
        is_demo_player,
        profile_creation_requested,
        profile_creation_requested_by,
        profile_creation_requested_at
        )
    VALUES
        (
            user_name,
            user_surname,
            0.0, -- Placeholder NTRP rating (admins will update)
            'W', -- Placeholder streak type
            'Hard Court', -- Placeholder surface preference
            25, -- Placeholder age (admins will update)
            'right', -- Placeholder hand (admins will update)
            true, -- Hidden until admin activates
            false, -- Inactive until admin approves
            false, -- Not a demo player
            true, -- Mark as creation requested
            user_id, -- Who requested it
            NOW() -- When it was requested
        );

    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in request_profile_creation for user %: %', user_id, SQLERRM;
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION request_profile_creation(UUID, TEXT, TEXT) IS 
'Creates a draft player profile with placeholder data only if no player with the same name exists. Admins will edit with correct tennis information before activation.';

-- 2. Ensure admin email notifications are sent with proper error handling
-- Update handle_new_user to wrap admin email in try-catch with better logging
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_first_name TEXT;
    user_last_name TEXT;
    matching_players_count INTEGER;
    matching_player_id UUID;
    email_logged BOOLEAN := false;
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
    );
    
    -- Send admin email notification with error handling
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
        email_logged := true;
        RAISE LOG 'Admin email notification logged for new user: %', NEW.email;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'ERROR: Failed to log admin email for new user %: %', NEW.email, SQLERRM;
            -- Continue execution even if email logging fails
    END;
    
    -- Create in-app notification for user registration
    BEGIN
        PERFORM create_admin_notification(
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
        );
        RAISE LOG 'In-app notification created for new user: %', NEW.email;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'ERROR: Failed to create in-app notification for user %: %', NEW.email, SQLERRM;
    END;
    
    -- Send welcome email to the new user
    BEGIN
        PERFORM send_welcome_email_to_user(
            NEW.email,
            NEW.id,
            COALESCE(user_first_name || ' ' || user_last_name, 'New User')
        );
        RAISE LOG 'Welcome email logged for new user: %', NEW.email;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'ERROR: Failed to log welcome email for user %: %', NEW.email, SQLERRM;
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

COMMENT ON FUNCTION public.handle_new_user() IS 
'Creates profile, sends admin/welcome emails, and creates in-app notifications for new users. Includes improved error handling and logging.';

-- 3. Add a check to ensure admin emails are logged correctly
COMMENT ON FUNCTION send_admin_alert_email(TEXT, TEXT, JSONB) IS 
'Logs admin alert emails to email_logs table with status pending and template admin_alert. These are processed by the process-admin-notifications edge function or cron job. Ensure the admin_alert template exists in email_templates table.';
