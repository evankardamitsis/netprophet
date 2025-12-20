-- Integrate in-app notifications for profile creation requests
-- Add notification creation to handle_profile_creation_request function

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
    user_email TEXT;
    user_metadata JSONB;
    date_of_birth TEXT;
    playing_hand TEXT;
    age_value INTEGER;
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

    -- Get user email and metadata from auth.users (source of truth)
    SELECT
        email,
        raw_user_meta_data
    INTO 
            user_email
    ,
            user_metadata
        FROM auth.users
        WHERE id = user_id;

-- Get user name from profiles (may be null for new users)
SELECT first_name, last_name
FROM profiles
WHERE id = user_id
INTO user_info;

        -- Extract form data from user_metadata (stored by frontend)
        date_of_birth := COALESCE
(
            user_metadata->>'date_of_birth',
            user_metadata->>'dateOfBirth',
            'Not provided'
        );
        playing_hand := COALESCE
(
            user_metadata->>'playing_hand',
            user_metadata->>'playingHand',
            'Not provided'
        );
        age_value := COALESCE
(
            (user_metadata->>'age')::INTEGER,
            NULL
        );

        -- Send admin email using profile_creation_request template with all form data
        PERFORM send_profile_creation_request_admin_email
(
            user_id,
            COALESCE
(user_email, 'unknown'),
            user_first_name,
            user_last_name,
            date_of_birth,
            playing_hand,
            COALESCE
(age_value::TEXT, 'Not calculated')
        );

        -- Create in-app notification for profile creation request
        PERFORM create_admin_notification
(
            'profile_creation_request',
            'Profile Creation Request',
            user_first_name || ' ' || user_last_name || ' (' || COALESCE
(user_email, 'unknown') || ') has requested a new athlete profile',
            'warning',
            jsonb_build_object
(
                'user_id', user_id,
                'email', COALESCE
(user_email, 'unknown'),
                'first_name', user_first_name,
                'last_name', user_last_name,
                'date_of_birth', date_of_birth,
                'playing_hand', playing_hand,
                'age', COALESCE
(age_value::TEXT, 'Not calculated')
            )
        );

-- Send confirmation email to user (use email from auth.users)
IF user_email IS NOT NULL THEN
            PERFORM send_profile_creation_confirmation_email
(
                user_email,
                user_id,
                COALESCE
(user_info.first_name || ' ' || user_info.last_name, 'User'),
                user_first_name,
                user_last_name
            );
END
IF;
        
        result := jsonb_build_object
(
            'success', true,
            'message', 'Profile creation request submitted successfully'
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
(UUID, TEXT, TEXT) IS 
'Handles profile creation requests, sends admin alert emails, creates in-app notifications, and sends user confirmation emails';
