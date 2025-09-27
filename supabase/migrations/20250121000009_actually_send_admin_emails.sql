-- Make admin emails actually send by calling the send-email function
-- This replaces logging with actual email sending

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
    email_response JSONB;
    supabase_url TEXT;
    service_key TEXT;
BEGIN
    -- Get environment variables
    supabase_url := current_setting
('app.supabase_url', true);
    service_key := current_setting
('app.supabase_service_role_key', true);
    
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

    -- Send email to each admin user via the send-email function
    FOR admin_record IN
SELECT p.email, p.id as user_id
FROM profiles p
WHERE p.is_admin = true
LOOP
BEGIN
    -- Call the send-email function to actually send the email
    SELECT net.http_post(
                url
    := supabase_url || '/functions/v1/send-email',
                headers := jsonb_build_object
    (
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || service_key
                ),
                body := jsonb_build_object
    (
                    'to', admin_record.email,
                    'template', 'admin_alert',
                    'type', 'admin',
                    'language', 'en',
                    'variables', template_variables
                )
            ) INTO email_response;

RAISE LOG 'Admin alert email sent to %: %', admin_record.email, email_response;
            
        EXCEPTION
            WHEN OTHERS THEN
                -- If sending fails, log the error but continue
                RAISE LOG 'Failed to send admin alert email to %: %', admin_record.email, SQLERRM;

-- Log the failed attempt
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
        'admin',
        'en',
        template_variables,
        'failed'
                );
END;
END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION send_admin_alert_email
(TEXT, TEXT, JSONB) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION send_admin_alert_email IS 'Actually sends admin alert emails via send-email function';
