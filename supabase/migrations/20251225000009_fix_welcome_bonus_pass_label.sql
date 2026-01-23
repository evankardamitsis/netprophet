-- Fix welcome_bonus_pass to be the number 1 (not string) so it can be used as a variable in Resend template
-- The Resend template should use {{WELCOME_BONUS_PASS}} instead of hardcoded "1"
-- This ensures consistent formatting with welcome_bonus_coins (both are numbers)

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

-- Update the overloads as well to ensure consistency
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

COMMENT ON FUNCTION public.send_welcome_email_to_user(TEXT, UUID, TEXT) IS 
'Sends welcome emails to new users. welcome_bonus_pass is set to 1 (number) for consistent formatting with welcome_bonus_coins in Resend template.';
