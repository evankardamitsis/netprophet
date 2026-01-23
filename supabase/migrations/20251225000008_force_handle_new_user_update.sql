-- Force update handle_new_user to use explicit casts and ensure function resolution
-- This migration ensures the function calls are properly typed

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_first_name TEXT;
    user_last_name TEXT;
    full_name TEXT;
    name_parts TEXT[];
    email_local_part TEXT;
    email_parts TEXT[];
    alert_type_text TEXT;
    message_text TEXT;
    user_email_text TEXT;
    user_name_text TEXT;
BEGIN
    -- Extract names: email/password (firstName, lastName)
    user_first_name := COALESCE(NEW.raw_user_meta_data->>'firstName', '');
    user_last_name := COALESCE(NEW.raw_user_meta_data->>'lastName', '');
    
    -- OAuth / fallback: name, full_name, given_name/family_name, or from email
    IF user_first_name = '' OR user_last_name = '' THEN
        full_name := COALESCE(NEW.raw_user_meta_data->>'name', '');
        IF full_name != '' THEN
            name_parts := string_to_array(trim(full_name), ' ');
            IF array_length(name_parts, 1) >= 2 THEN
                user_first_name := name_parts[1];
                user_last_name := name_parts[array_length(name_parts, 1)];
            END IF;
        END IF;
        
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
        
        IF user_first_name = '' OR user_last_name = '' THEN
            user_first_name := COALESCE(NULLIF(user_first_name, ''), NEW.raw_user_meta_data->>'given_name', '');
            user_last_name := COALESCE(NULLIF(user_last_name, ''), NEW.raw_user_meta_data->>'family_name', '');
        END IF;
        
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
    END IF;
    
    -- Insert profile
    INSERT INTO public.profiles (
        id, email, first_name, last_name, balance, daily_login_streak,
        has_received_welcome_bonus, mfa_required, created_at, updated_at
    )
    VALUES (
        NEW.id, NEW.email, user_first_name, user_last_name, 0, 0,
        false, true, NEW.created_at, NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
        first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), profiles.first_name),
        last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), profiles.last_name),
        updated_at = EXCLUDED.updated_at;
    
    -- Admin email: send_admin_alert_email (logs to email_logs; webhook/cron sends via Resend)
    -- Use variables to ensure proper type resolution
    BEGIN
        alert_type_text := 'New User Registration';
        message_text := 'A new user has registered on NetProphet: ' || NEW.email;
        
        PERFORM public.send_admin_alert_email(
            alert_type_text,
            message_text,
            jsonb_build_object(
                'user_email', NEW.email,
                'user_name', COALESCE(NULLIF(trim(user_first_name || ' ' || user_last_name), ''), 'Not provided'),
                'registration_time', NEW.created_at,
                'user_id', NEW.id,
                'registration_type', CASE 
                    WHEN NEW.raw_user_meta_data->>'firstName' IS NOT NULL THEN 'email_password'
                    ELSE 'oauth'
                END
            )
        );
        RAISE LOG '[handle_new_user] Admin email logged for: %', NEW.email;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG '[handle_new_user] Admin email failed for %: %', NEW.email, SQLERRM;
    END;
    
    -- In-app notification for admins (use public. so trigger context resolves correctly)
    BEGIN
        PERFORM public.create_admin_notification(
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
        RAISE LOG '[handle_new_user] In-app notification created for: %', NEW.email;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG '[handle_new_user] In-app notification failed for %: %', NEW.email, SQLERRM;
    END;
    
    -- Welcome email to the new user
    -- Use variables to ensure proper type resolution
    BEGIN
        user_email_text := NEW.email::TEXT;
        user_name_text := COALESCE(NULLIF(trim(user_first_name || ' ' || user_last_name), ''), 'New User');
        
        PERFORM public.send_welcome_email_to_user(
            user_email_text,
            NEW.id,
            user_name_text
        );
        RAISE LOG '[handle_new_user] Welcome email logged for: %', NEW.email;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG '[handle_new_user] Welcome email failed for %: %', NEW.email, SQLERRM;
    END;
    
    -- Add user to MailerLite for newsletter/marketing (non-blocking)
    BEGIN
        PERFORM public.add_user_to_mailerlite(
            NEW.id,
            NEW.email,
            COALESCE(NULLIF(trim(user_first_name || ' ' || user_last_name), ''), NULL),
            ARRAY[]::TEXT[] -- Default groups, can be configured via MAILERLITE_GROUP_ID env var
        );
        RAISE LOG '[handle_new_user] Queued user % for MailerLite subscription', NEW.email;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG '[handle_new_user] MailerLite queue failed for %: %', NEW.email, SQLERRM;
    END;
    
    -- Auto-claim functionality removed - users should claim profiles manually via the notification flow
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG '[handle_new_user] Error for %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

COMMENT ON FUNCTION public.handle_new_user() IS
'Creates profile, sends admin email (email_logs), creates in-app notification (public.create_admin_notification), welcome email, and queues user for MailerLite subscription. Auto-claim removed. Uses explicit TEXT variables for function calls to ensure proper type resolution.';
