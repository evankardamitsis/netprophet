-- Add preferred_language column to profiles table
-- This allows users to receive emails in their preferred language

-- Add the column with Greek as default
ALTER TABLE profiles 
ADD COLUMN
IF NOT EXISTS preferred_language TEXT DEFAULT 'el' CHECK
(preferred_language IN
('en', 'el'));

-- Add comment
COMMENT ON COLUMN profiles.preferred_language IS 'User preferred language for emails and UI (en or el)';

-- Update the send_welcome_email_to_user function to handle missing column gracefully
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
END
IF;

    -- Prepare template variables for welcome email
    template_variables := jsonb_build_object
(
        'user_email', user_email,
        'user_id', user_id,
        'user_name', COALESCE
(user_name, 'New User'),
        'welcome_bonus_coins', 100,
        'welcome_bonus_pass', 'Tournament Pass',
        'app_url', 'https://netprophetapp.com'
    );

-- Insert email log for processing
INSERT INTO public.email_logs
    (
    user_id,
    to_email,
    template,
    type,
    language,
    variables,
    status
    )
VALUES
    (
        user_id,
        user_email,
        'welcome_email',
        'user',
        user_language,
        template_variables,
        'pending'
    );

RAISE LOG 'Welcome email logged for user % in language %', user_email, user_language;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION send_welcome_email_to_user
(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION send_welcome_email_to_user
(TEXT, UUID, TEXT) TO service_role;

