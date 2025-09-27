-- Simplify admin email sending to just log emails for processing
-- The actual sending will be handled by the admin app or cron job

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

    -- Log emails for each admin user with 'pending' status for processing
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION send_admin_alert_email
(TEXT, TEXT, JSONB) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION send_admin_alert_email IS 'Logs admin alert emails for processing - simplified approach';
