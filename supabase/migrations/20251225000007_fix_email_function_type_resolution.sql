-- Fix email function type resolution issues
-- The trigger is calling functions with types that don't match the function signatures
-- This migration ensures all type variations are properly handled

-- 1. Drop existing functions to recreate them with proper schema qualification
-- Drop all possible signatures to avoid conflicts
DROP FUNCTION IF EXISTS public.send_admin_alert_email(TEXT, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.send_admin_alert_email(VARCHAR, VARCHAR, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.send_admin_alert_email(CHARACTER VARYING, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.send_admin_alert_email(CHARACTER VARYING, CHARACTER VARYING, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.send_welcome_email_to_user(TEXT, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.send_welcome_email_to_user(VARCHAR, UUID, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS public.send_welcome_email_to_user(VARCHAR, UUID, TEXT) CASCADE;
-- Also drop without schema qualification in case they exist
DROP FUNCTION IF EXISTS send_admin_alert_email(TEXT, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS send_admin_alert_email(VARCHAR, VARCHAR, JSONB) CASCADE;
DROP FUNCTION IF EXISTS send_welcome_email_to_user(TEXT, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS send_welcome_email_to_user(VARCHAR, UUID, VARCHAR) CASCADE;

-- 2. Recreate send_admin_alert_email with explicit public schema
CREATE OR REPLACE FUNCTION public.send_admin_alert_email
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
        'alert_type', alert_type::TEXT,
        'message', message::TEXT,
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
        FROM public.profiles p
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
    
    RAISE LOG 'Admin alert emails logged for % admin users', (SELECT COUNT(*) FROM public.profiles WHERE is_admin = true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recreate send_welcome_email_to_user with explicit public schema
CREATE OR REPLACE FUNCTION public.send_welcome_email_to_user
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
        FROM public.profiles
        WHERE id = user_id;
    EXCEPTION WHEN OTHERS THEN
        user_language := 'el';
    END;

    -- If no language found, default to 'el' (Greek)
    IF user_language IS NULL THEN
        user_language := 'el';
    END IF;

    -- Prepare template variables for welcome email
    -- welcome_bonus_pass should be the number 1 (same type as welcome_bonus_coins)
    -- so it displays with the same formatting in the Resend template
    template_variables := jsonb_build_object(
        'user_email', user_email::TEXT,
        'user_id', user_id,
        'user_name', COALESCE(user_name, 'New User')::TEXT,
        'welcome_bonus_coins', 100,
        'welcome_bonus_pass', 1,  -- Number 1 (not string) for consistent formatting
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
        user_email::TEXT,
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
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create overloads for VARCHAR/CHARACTER VARYING (for auth.users.email which is VARCHAR)
CREATE OR REPLACE FUNCTION public.send_welcome_email_to_user(
    user_email VARCHAR,
    user_id UUID,
    user_name VARCHAR
)
RETURNS void AS $$
BEGIN
    PERFORM public.send_welcome_email_to_user($1::TEXT, $2, $3::TEXT);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Overload for VARCHAR email with NULL user_name
CREATE OR REPLACE FUNCTION public.send_welcome_email_to_user(
    user_email VARCHAR,
    user_id UUID,
    user_name TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    PERFORM public.send_welcome_email_to_user($1::TEXT, $2, $3);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create overloads for send_admin_alert_email to handle VARCHAR and unknown types
CREATE OR REPLACE FUNCTION public.send_admin_alert_email(
    alert_type VARCHAR,
    message VARCHAR,
    details JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    PERFORM public.send_admin_alert_email($1::TEXT, $2::TEXT, $3);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Overload for CHARACTER VARYING (same as VARCHAR but explicit)
CREATE OR REPLACE FUNCTION public.send_admin_alert_email(
    alert_type CHARACTER VARYING,
    message TEXT,
    details JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    PERFORM public.send_admin_alert_email($1::TEXT, $2, $3);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Overload for both parameters as CHARACTER VARYING
CREATE OR REPLACE FUNCTION public.send_admin_alert_email(
    alert_type CHARACTER VARYING,
    message CHARACTER VARYING,
    details JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    PERFORM public.send_admin_alert_email($1::TEXT, $2::TEXT, $3);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant permissions on all function signatures
GRANT EXECUTE ON FUNCTION public.send_admin_alert_email(TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.send_admin_alert_email(TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_admin_alert_email(VARCHAR, VARCHAR, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.send_admin_alert_email(VARCHAR, VARCHAR, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_admin_alert_email(CHARACTER VARYING, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.send_admin_alert_email(CHARACTER VARYING, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_admin_alert_email(CHARACTER VARYING, CHARACTER VARYING, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.send_admin_alert_email(CHARACTER VARYING, CHARACTER VARYING, JSONB) TO authenticated;

GRANT EXECUTE ON FUNCTION public.send_welcome_email_to_user(TEXT, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.send_welcome_email_to_user(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_welcome_email_to_user(VARCHAR, UUID, VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.send_welcome_email_to_user(VARCHAR, UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_welcome_email_to_user(VARCHAR, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.send_welcome_email_to_user(VARCHAR, UUID, TEXT) TO authenticated;

-- 7. Add comments
COMMENT ON FUNCTION public.send_admin_alert_email(TEXT, TEXT, JSONB) IS 
'Main function to send admin alert emails. Accepts TEXT parameters. Creates email_logs entries for all admin users.';

COMMENT ON FUNCTION public.send_welcome_email_to_user(TEXT, UUID, TEXT) IS 
'Main function to send welcome emails to new users. Accepts TEXT parameters. Creates email_logs entry with language detection.';
