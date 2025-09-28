-- Fix email_logs table constraint to properly separate admin and user emails
-- Admin notifications: go to admins only (type = 'admin')
-- User notifications: go to users only (type = 'user')

-- First, drop the existing constraint
ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_type_check;

-- Add a new constraint that allows both 'admin' and 'user' types
ALTER TABLE email_logs ADD CONSTRAINT email_logs_type_check 
    CHECK (type IN ('admin', 'user'));

-- Update the welcome email function to use 'user' type (goes to users)
CREATE OR REPLACE FUNCTION send_welcome_email_to_user
(
    user_email TEXT,
    user_id UUID,
    user_name TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    template_variables JSONB;
BEGIN
    -- Prepare template variables for welcome email
    template_variables := jsonb_build_object
(
        'user_email', user_email,
        'user_id', user_id,
        'user_name', COALESCE
(user_name, 'New User'),
        'welcome_bonus_coins', 100,
        'welcome_bonus_pass', 'Tournament Pass',
        'app_url', 'https://netprophet.app',
        'timestamp', NOW
()::text
    );

-- Insert welcome email into email_logs for processing
-- This goes to USERS (type = 'user')
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
        'user', -- USER emails go to users
        'en', -- Default to English, can be customized later
        template_variables,
        'pending'  -- Mark as pending for processing
        );

RAISE LOG 'Welcome email logged for user: %', user_email;
END;
$$ LANGUAGE plpgsql;

-- Update the admin alert function to use 'admin' type (goes to admins only)
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
BEGIN
    -- Prepare template variables
    template_variables := jsonb_build_object
(
        'alert_type', alert_type,
        'message', message,
        'details', COALESCE
(details::text, ''),
        'timestamp', NOW
()::text
    );

    -- Log emails for each admin user with 'admin' status for processing
    -- This goes to ADMINS ONLY (type = 'admin')
    FOR admin_record IN
SELECT p.email, p.id as user_id
FROM profiles p
WHERE p.is_admin = true
LOOP
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
        admin_record.user_id,
        admin_record.email,
        'admin_alert',
        'admin', -- ADMIN emails go to admins only
        'en',
        template_variables,
        'pending'  -- Mark as pending for processing
        );
END LOOP;
    
    RAISE LOG 'Admin alert emails logged for % admin users',
(SELECT COUNT(*)
FROM profiles
WHERE is_admin = true);
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION send_welcome_email_to_user
(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION send_welcome_email_to_user
(TEXT, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION send_admin_alert_email
(TEXT, TEXT, JSONB) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION send_welcome_email_to_user IS 'Sends welcome email to new users with bonus information - USER emails';
COMMENT ON FUNCTION send_admin_alert_email IS 'Sends admin alert emails to administrators only - ADMIN emails';
