-- Fix in-app user_registration notifications when create_admin_notification is called
-- from the auth.users trigger. Check 8 = yes but Check 5 = 0 means the call exists
-- but the INSERT inside create_admin_notification fails in the trigger context.
--
-- 1. Ensure the function owner has INSERT on the table (in case it differs from table owner)
-- 2. Set search_path on create_admin_notification so the INSERT always sees public
-- 3. Use public.create_admin_notification in handle_new_user so the trigger resolves the right function

-- 1. Grant INSERT to the owner of create_admin_notification (no-op if they already have it)
DO $$
DECLARE
  fn_owner name;
BEGIN
  SELECT rolname INTO fn_owner
  FROM pg_roles r
  JOIN pg_proc p ON p.proowner = r.oid
  WHERE p.proname = 'create_admin_notification'
  LIMIT 1;
  IF fn_owner IS NOT NULL THEN
    EXECUTE format('GRANT INSERT ON public.admin_in_app_notifications TO %I', fn_owner);
    RAISE LOG '[fix_in_app_notification] Granted INSERT on admin_in_app_notifications to %', fn_owner;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG '[fix_in_app_notification] GRANT INSERT failed: %', SQLERRM;
END $$;

-- 2. Ensure create_admin_notification uses public when resolving names
ALTER FUNCTION public.create_admin_notification(TEXT, TEXT, TEXT, TEXT, JSONB)
  SET search_path = public;

-- 3. Update handle_new_user to call public.create_admin_notification explicitly
--    (avoids search_path / schema resolution in the auth trigger context)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_first_name TEXT;
    user_last_name TEXT;
    matching_players_count INTEGER;
    matching_player_id UUID;
    full_name TEXT;
    name_parts TEXT[];
    email_local_part TEXT;
    email_parts TEXT[];
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
    BEGIN
        PERFORM send_admin_alert_email(
            'New User Registration',
            'A new user has registered on NetProphet: ' || NEW.email,
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
    BEGIN
        PERFORM send_welcome_email_to_user(
            NEW.email,
            NEW.id,
            COALESCE(NULLIF(trim(user_first_name || ' ' || user_last_name), ''), 'New User')
        );
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG '[handle_new_user] Welcome email failed for %: %', NEW.email, SQLERRM;
    END;
    
    -- Auto-claim player if exactly one match
    IF user_first_name != '' AND user_last_name != '' THEN
        BEGIN
            SELECT COUNT(*) INTO matching_players_count
            FROM find_matching_players(user_first_name, user_last_name);
            IF matching_players_count = 1 THEN
                SELECT id INTO matching_player_id
                FROM find_matching_players(user_first_name, user_last_name)
                LIMIT 1;
                PERFORM claim_player_profile(matching_player_id, NEW.id);
                UPDATE profiles
                SET profile_claim_status = 'claimed', claimed_player_id = matching_player_id, profile_claim_completed_at = NOW()
                WHERE id = NEW.id;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE LOG '[handle_new_user] Auto-claim failed for %: %', NEW.email, SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG '[handle_new_user] Error for %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

COMMENT ON FUNCTION public.handle_new_user() IS
'Creates profile, sends admin email (email_logs), creates in-app notification (public.create_admin_notification), and welcome email.';
