-- Enhance send_admin_alert_email to extract individual fields from details JSONB
-- This allows the email template to display form data in a structured way

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
    requested_first_name TEXT;
    requested_last_name TEXT;
    date_of_birth TEXT;
    playing_hand TEXT;
    age TEXT;
BEGIN
    -- Extract individual fields from details JSONB if they exist
    -- This allows the template to display them separately
    user_email := COALESCE
(details->>'user_email', '');
    requested_first_name := COALESCE
(details->>'requested_first_name', '');
    requested_last_name := COALESCE
(details->>'requested_last_name', '');
    date_of_birth := COALESCE
(details->>'date_of_birth', '');
    playing_hand := COALESCE
(details->>'playing_hand', '');
    age := COALESCE
(details->>'age', '');

    -- Prepare template variables with both individual fields and full JSON
    template_variables := jsonb_build_object
(
        'alert_type', alert_type,
        'message', message,
        'details', COALESCE
(details::text, ''),
        'timestamp', NOW
()::text,
        -- Individual fields for structured display
        'user_email', user_email,
        'requested_first_name', requested_first_name,
        'requested_last_name', requested_last_name,
        'date_of_birth', date_of_birth,
        'playing_hand', playing_hand,
        'age', age,
        -- Formatted summary if available
        'formatted_summary', COALESCE
(details->>'formatted_summary', '')
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

COMMENT ON FUNCTION send_admin_alert_email
(TEXT, TEXT, JSONB) IS 
'Enhanced version that extracts individual fields from details JSONB for better email template display';
