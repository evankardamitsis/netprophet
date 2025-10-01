-- Fix handle_profile_creation_request to use send_admin_alert_email instead of send_admin_notification
-- The admin_notifications table was removed in favor of the email-based system

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

-- Send admin alert email (replaces send_admin_notification)
PERFORM send_admin_alert_email
(
            'Profile Creation Requested',
            'User ' || user_info.email || ' has requested profile creation for: ' || user_first_name || ' ' || user_last_name,
            jsonb_build_object
(
                'requested_first_name', user_first_name,
                'requested_last_name', user_last_name,
                'user_email', user_info.email,
                'user_id', user_id,
                'user_name', COALESCE
(user_info.first_name || ' ' || user_info.last_name, 'Not provided')
            )
        );
        
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
(UUID, TEXT, TEXT) IS 'Handles profile creation requests with admin and user email notifications';

