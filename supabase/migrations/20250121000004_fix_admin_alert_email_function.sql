-- Fix the ambiguous column reference in send_admin_alert_email function
-- The issue is that both auth.users and profiles tables have an 'email' column

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

    -- Insert email logs for each admin user
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
        'admin',
        'en', -- Admin emails in English
        template_variables,
        'sent'
        );
END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION send_admin_alert_email
(TEXT, TEXT, JSONB) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION send_admin_alert_email IS 'Sends admin alert email to all administrators - fixed ambiguous column reference';
