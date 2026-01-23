-- Fix function signatures to match what the trigger is calling
-- The trigger passes TEXT/VARCHAR, but functions need to accept both

-- 1. Fix send_admin_alert_email - ensure it accepts the exact types the trigger passes
CREATE OR REPLACE FUNCTION send_admin_alert_email
(
    alert_type TEXT,
    message TEXT,
    details JSONB DEFAULT NULL
)
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

    -- Prepare template variables - MUST include alert_type and message for Resend template
    template_variables := jsonb_build_object(
        'alert_type', alert_type::TEXT,  -- Explicit cast
        'message', message::TEXT,  -- Explicit cast
        'details', COALESCE(details::text, ''),
        'timestamp', NOW()::text,
        'user_email', user_email,
        'user_name', user_name,
        'requested_first_name', requested_first_name,
        'requested_last_name', requested_last_name,
        'date_of_birth', date_of_birth,
        'playing_hand', playing_hand,
        'age', age,
        'formatted_summary', COALESCE(details->>'formatted_summary', '')
    );

    -- Log emails for each admin user - ALWAYS include sent_at
    FOR admin_record IN
        SELECT p.email, p.id as user_id
        FROM profiles p
        WHERE p.is_admin = true
    LOOP
        BEGIN
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
                'pending',
                NOW()
            );
        EXCEPTION
            WHEN OTHERS THEN
                RAISE LOG 'ERROR inserting admin email log for %: % (SQLSTATE: %)', admin_record.email, SQLERRM, SQLSTATE;
        END;
    END LOOP;
    
    RAISE LOG 'Admin alert emails logged for % admin users', (SELECT COUNT(*) FROM profiles WHERE is_admin = true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix send_welcome_email_to_user - ensure it accepts the exact types the trigger passes
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
    template_variables := jsonb_build_object(
        'user_email', user_email::TEXT,  -- Explicit cast
        'user_id', user_id,
        'user_name', COALESCE(user_name, 'New User')::TEXT,  -- Explicit cast
        'welcome_bonus_coins', 100,
        'welcome_bonus_pass', '1',  -- String "1" for Resend template
        'app_url', 'https://netprophetapp.com'
    );

    -- Insert email log for processing - ALWAYS include sent_at
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
        user_email::TEXT,  -- Explicit cast
        'welcome_email',
        'user',
        user_language,
        template_variables,
        'pending',
        NOW()
    );

    RAISE LOG 'Welcome email logged for user % in language %', user_email, user_language;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'ERROR in send_welcome_email_to_user for %: % (SQLSTATE: %)', user_email, SQLERRM, SQLSTATE;
        RAISE;  -- Re-raise to see the error
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION send_admin_alert_email(TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION send_admin_alert_email(TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION send_welcome_email_to_user(TEXT, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION send_welcome_email_to_user(TEXT, UUID, TEXT) TO authenticated;

-- 4. Create function overloads to handle VARCHAR/CHARACTER VARYING if needed
-- PostgreSQL should auto-cast, but let's be explicit
CREATE OR REPLACE FUNCTION send_welcome_email_to_user(VARCHAR, UUID, VARCHAR)
RETURNS void AS $$
BEGIN
    PERFORM send_welcome_email_to_user($1::TEXT, $2, $3::TEXT);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION send_admin_alert_email(VARCHAR, VARCHAR, JSONB)
RETURNS void AS $$
BEGIN
    PERFORM send_admin_alert_email($1::TEXT, $2::TEXT, $3);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION send_admin_alert_email(TEXT, TEXT, JSONB) IS 
'Fixed version with sent_at, user_name, alert_type, and message. Accepts TEXT parameters.';
COMMENT ON FUNCTION send_welcome_email_to_user(TEXT, UUID, TEXT) IS 
'Fixed version with sent_at and welcome_bonus_pass as string. Accepts TEXT parameters.';
