-- Update handle_profile_creation_request to use the specific profile_creation_request template
-- instead of the generic admin_alert template

CREATE OR REPLACE FUNCTION handle_profile_creation_request
(
    user_id UUID,
    user_first_name TEXT,
    user_last_name TEXT
)
RETURNS JSONB AS $$
DECLARE
    request_success BOOLEAN;
    user_info RECORD;
    admin_record RECORD;
    template_variables JSONB;
    result JSONB;
BEGIN
    -- Request profile creation
    SELECT request_profile_creation(user_id, user_first_name, user_last_name)
    INTO request_success;

    IF request_success THEN
    -- Update user profile
    UPDATE profiles 
        SET 
            profile_claim_status = 'creation_requested',
            profile_claim_completed_at = NOW(),
            updated_at = NOW()
        WHERE id = user_id;

    -- Get user information
    SELECT email, first_name, last_name
    FROM profiles
    WHERE id = user_id
    INTO user_info;

-- Prepare template variables
template_variables := jsonb_build_object
(
            'user_email', user_info.email,
            'user_id', user_id::text,
            'requested_first_name', user_first_name,
            'requested_last_name', user_last_name,
            'timestamp', NOW
()::text
        );
        
        -- Send specific profile creation request email to each admin
        FOR admin_record IN
SELECT p.email, p.id as admin_user_id
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
        admin_record.admin_user_id,
        admin_record.email,
        'profile_creation_request', -- Use specific template
        'admin',
        'en',
        template_variables,
        'pending'
            );
END LOOP;
        
        -- Send confirmation email to user
        PERFORM send_profile_creation_confirmation_email
(
            user_info.email,
            user_id,
            COALESCE
(user_info.first_name || ' ' || user_info.last_name, 'User'),
            user_first_name,
            user_last_name
        );
        
        result := jsonb_build_object
(
            'success', true,
            'message', 'Profile creation request submitted successfully',
            'requested_first_name', user_first_name,
            'requested_last_name', user_last_name
        );
    ELSE
        result := jsonb_build_object
(
            'success', false,
            'message', 'Failed to submit profile creation request'
        );
END
IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_profile_creation_request
(UUID, TEXT, TEXT) IS 'Handles profile creation requests with specific admin email template and user confirmation';

