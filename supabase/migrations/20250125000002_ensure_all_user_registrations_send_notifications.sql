-- CRITICAL FIX: Ensure ALL new user registrations send admin emails AND create in-app notifications
-- This migration ensures both operations are attempted independently with proper error handling
-- so that one failure doesn't prevent the other from executing

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_first_name TEXT;
    user_last_name TEXT;
    matching_players_count INTEGER;
    matching_player_id UUID;
    email_success BOOLEAN := false;
    notification_success BOOLEAN := false;
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
            
            -- Last resort: try to extract from email address (e.g., john.doe@example.com -> John Doe)
            IF user_first_name = '' OR user_last_name = '' THEN
                -- Extract local part of email (before @)
                email_local_part := SPLIT_PART(NEW.email, '@', 1);
                -- Remove dots and common separators, then split
                email_local_part := REPLACE(REPLACE(REPLACE(email_local_part, '.', ' '), '_', ' '), '-', ' ');
                email_parts := string_to_array(trim(email_local_part), ' ');
                
                -- If we have at least 2 parts, use first as first name and last as last name
                IF array_length(email_parts, 1) >= 2 THEN
                    user_first_name := COALESCE(NULLIF(user_first_name, ''), INITCAP(email_parts[1]));
                    user_last_name := COALESCE(NULLIF(user_last_name, ''), INITCAP(email_parts[array_length(email_parts, 1)]));
                ELSIF array_length(email_parts, 1) = 1 AND email_parts[1] != '' THEN
                    -- If only one part, use it as first name
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
        0, -- balance starts at 0
        0, -- daily_login_streak starts at 0
        false, -- has_received_welcome_bonus starts false
        true, -- Enable 2FA by default
        NEW.created_at,
        NEW.updated_at
    );
    
    -- CRITICAL: Send admin email notification with independent error handling
    -- This MUST execute even if notification creation fails
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
        email_success := true;
        RAISE LOG '[SUCCESS] Admin email notification logged for new user: %', NEW.email;
    EXCEPTION
        WHEN OTHERS THEN
            email_success := false;
            RAISE LOG '[ERROR] Failed to log admin email for new user %: %', NEW.email, SQLERRM;
            RAISE LOG '[ERROR] Stack trace: %', SQLSTATE;
            -- Continue execution - DO NOT fail user registration
    END;
    
    -- CRITICAL: Create in-app notification with independent error handling
    -- This MUST execute even if email sending fails
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
        notification_success := true;
        RAISE LOG '[SUCCESS] In-app notification created for new user: %', NEW.email;
    EXCEPTION
        WHEN OTHERS THEN
            notification_success := false;
            RAISE LOG '[ERROR] Failed to create in-app notification for user %: %', NEW.email, SQLERRM;
            RAISE LOG '[ERROR] Stack trace: %', SQLSTATE;
            -- Continue execution - DO NOT fail user registration
    END;
    
    -- Log final status for monitoring
    IF NOT email_success AND NOT notification_success THEN
        RAISE LOG '[CRITICAL] Both email and notification failed for user % - user created but no admin alerts sent!', NEW.email;
    ELSIF NOT email_success THEN
        RAISE LOG '[WARNING] Email failed but notification succeeded for user %', NEW.email;
    ELSIF NOT notification_success THEN
        RAISE LOG '[WARNING] Notification failed but email succeeded for user %', NEW.email;
    ELSE
        RAISE LOG '[SUCCESS] Both email and notification succeeded for user %', NEW.email;
    END IF;
    
    -- Send welcome email to the new user (non-critical, can fail silently)
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
            -- Continue execution even if welcome email fails
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
        -- CRITICAL: Log the error but NEVER fail user creation
        -- User registration must always succeed, even if notifications fail
        RAISE LOG '[CRITICAL ERROR] Error in handle_new_user for user %: %', NEW.email, SQLERRM;
        RAISE LOG '[CRITICAL ERROR] Stack trace: %', SQLSTATE;
        -- Always return NEW to allow user creation to proceed
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user() IS 
'Creates profile, sends admin/welcome emails, and creates in-app notifications for new users. 
CRITICAL: Both admin email and in-app notification are attempted independently with error handling 
to ensure at least one succeeds. User registration NEVER fails due to notification issues.';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION send_admin_alert_email(TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION create_admin_notification(TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION send_welcome_email_to_user(TEXT, UUID, TEXT) TO service_role;
