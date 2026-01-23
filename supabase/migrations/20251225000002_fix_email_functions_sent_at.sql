-- Fix email functions to explicitly set sent_at (required by NOT NULL constraint)
-- This ensures emails can be logged even when status is 'pending'

-- 1. Fix send_admin_alert_email to explicitly set sent_at
-- Use VARIADIC or explicit casting to handle type mismatches
CREATE OR REPLACE FUNCTION send_admin_alert_email
(
    alert_type TEXT,
    message TEXT,
    details JSONB DEFAULT NULL
)
-- Add explicit casts to handle any type mismatches
RETURNS void AS $$
DECLARE
    template_variables JSONB;
    admin_record RECORD;
    user_email TEXT;
    user_name TEXT;
    requested_first_name TEXT;
    requested_last_name TEXT;
    date_of_birth TEXT;
    playing_hand TEXT;
    age TEXT;
BEGIN
    -- Extract individual fields from details JSONB if they exist
    user_email := COALESCE(details->>'user_email', '');
    user_name := COALESCE(
        details->>'user_name',
        NULLIF(trim(COALESCE(details->>'requested_first_name', '') || ' ' || COALESCE(details->>'requested_last_name', '')), ''),
        'Not provided'
    );
    requested_first_name := COALESCE(details->>'requested_first_name', '');
    requested_last_name := COALESCE(details->>'requested_last_name', '');
    date_of_birth := COALESCE(details->>'date_of_birth', '');
    playing_hand := COALESCE(details->>'playing_hand', '');
    age := COALESCE(details->>'age', '');

    -- Prepare template variables with both individual fields and full JSON
    template_variables := jsonb_build_object(
        'alert_type', alert_type,
        'message', message,
        'details', COALESCE(details::text, ''),
        'timestamp', NOW()::text,
        -- Individual fields for structured display
        'user_email', user_email,
        'user_name', user_name,  -- Add user_name for Resend template (required)
        'requested_first_name', requested_first_name,
        'requested_last_name', requested_last_name,
        'date_of_birth', date_of_birth,
        'playing_hand', playing_hand,
        'age', age,
        -- Formatted summary if available
        'formatted_summary', COALESCE(details->>'formatted_summary', '')
    );

    -- Log emails for each admin user with 'pending' status for processing
    -- Note: sent_at has NOT NULL constraint, so we set it explicitly even for pending emails
    FOR admin_record IN
        SELECT p.email, p.id as user_id
        FROM profiles p
        WHERE p.is_admin = true
    LOOP
        INSERT INTO public.email_logs (
            user_id,
            to_email,
            template,
            type,
            language,
            variables,
            status,
            sent_at
        )
        VALUES (
            admin_record.user_id,
            admin_record.email,
            'admin_alert',
            'admin',
            'en',
            template_variables,
            'pending',  -- Mark as pending for processing
            NOW()  -- Set sent_at explicitly (required by NOT NULL constraint)
        );
    END LOOP;
    
    RAISE LOG 'Admin alert emails logged for % admin users',
        (SELECT COUNT(*) FROM profiles WHERE is_admin = true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix send_welcome_email_to_user to explicitly set sent_at
CREATE OR REPLACE FUNCTION send_welcome_email_to_user
(
    user_email TEXT,
    user_id UUID,
    user_name TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    template_variables JSONB;
    user_language TEXT;
BEGIN
    -- Try to detect user language from profiles or default to 'el' (Greek)
    BEGIN
        SELECT COALESCE(preferred_language, 'el')
        INTO user_language
        FROM profiles
        WHERE id = user_id;
    EXCEPTION WHEN OTHERS THEN
        user_language := 'el';
    END;

    -- If no language found, default to 'el' (Greek)
    IF user_language IS NULL THEN
        user_language := 'el';
    END IF;

    -- Prepare template variables for welcome email
    -- Note: welcome_bonus_pass must be a string "1" for Resend template
    template_variables := jsonb_build_object(
        'user_email', user_email,
        'user_id', user_id,
        'user_name', COALESCE(user_name, 'New User'),
        'welcome_bonus_coins', 100,
        'welcome_bonus_pass', '1',  -- String "1" for Resend template (required as string)
        'app_url', 'https://netprophetapp.com'
    );

    -- Insert email log for processing
    -- Note: sent_at has NOT NULL constraint, so we set it explicitly even for pending emails
    INSERT INTO public.email_logs (
        user_id,
        to_email,
        template,
        type,
        language,
        variables,
        status,
        sent_at
    )
    VALUES (
        user_id,
        user_email,
        'welcome_email',
        'user',
        user_language,
        template_variables,
        'pending',
        NOW()  -- Set sent_at explicitly (required by NOT NULL constraint)
    );

    RAISE LOG 'Welcome email logged for user % in language %', user_email, user_language;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant permissions (idempotent)
GRANT EXECUTE ON FUNCTION send_admin_alert_email(TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION send_admin_alert_email(TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION send_welcome_email_to_user(TEXT, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION send_welcome_email_to_user(TEXT, UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION send_admin_alert_email(TEXT, TEXT, JSONB) IS 
'Enhanced version that extracts individual fields from details JSONB. Uses SECURITY DEFINER to ensure INSERT permissions. Explicitly sets sent_at for NOT NULL constraint.';

COMMENT ON FUNCTION send_welcome_email_to_user(TEXT, UUID, TEXT) IS 
'Sends welcome email to new users. Uses SECURITY DEFINER to ensure INSERT permissions. Explicitly sets sent_at for NOT NULL constraint.';
