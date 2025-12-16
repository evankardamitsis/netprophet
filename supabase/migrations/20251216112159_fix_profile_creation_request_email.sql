-- Fix handle_profile_creation_request to get email from auth.users instead of profiles
-- The profiles table may not have email or may have stale data
-- auth.users is the source of truth for user emails

CREATE OR REPLACE FUNCTION handle_profile_creation_request(
    user_id UUID,
    user_first_name TEXT,
    user_last_name TEXT
)
RETURNS JSONB AS $$
DECLARE
    request_success BOOLEAN;
    user_info RECORD;
    user_email TEXT;
    result JSONB;
BEGIN
    -- Request profile creation
    SELECT request_profile_creation(user_id, user_first_name, user_last_name) INTO request_success;
    
    IF request_success THEN
        -- Update user profile
        UPDATE profiles 
        SET 
            profile_claim_status = 'creation_requested',
            profile_claim_completed_at = NOW(),
            updated_at = NOW()
        WHERE id = user_id;
        
        -- Get user email from auth.users (source of truth)
        SELECT email INTO user_email
        FROM auth.users
        WHERE id = user_id;
        
        -- Get user name from profiles (may be null for new users)
        SELECT first_name, last_name
        FROM profiles
        WHERE id = user_id
        INTO user_info;
        
        -- Send admin notification with correct user email
        PERFORM send_admin_notification(
            'profile_creation_requested',
            'Profile Creation Requested',
            'User ' || COALESCE(user_email, 'unknown') || ' has requested profile creation for: ' || user_first_name || ' ' || user_last_name,
            user_id,
            NULL,
            jsonb_build_object(
                'requested_first_name', user_first_name,
                'requested_last_name', user_last_name,
                'user_email', COALESCE(user_email, 'unknown')
            )
        );
        
        -- Send confirmation email to user (use email from auth.users)
        IF user_email IS NOT NULL THEN
            PERFORM send_profile_creation_confirmation_email(
                user_email,
                user_id,
                COALESCE(user_info.first_name || ' ' || user_info.last_name, 'User'),
                user_first_name,
                user_last_name
            );
        END IF;
        
        result := jsonb_build_object(
            'success', true,
            'message', 'Profile creation request submitted successfully'
        );
    ELSE
        result := jsonb_build_object(
            'success', false,
            'message', 'Failed to submit profile creation request'
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
