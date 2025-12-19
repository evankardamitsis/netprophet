-- Update profile creation request system to include all form data
-- 1. Create function to send admin email using profile_creation_request template
-- 2. Update handle_profile_creation_request to use this function
-- 3. The template will be updated via SQL script

CREATE OR REPLACE FUNCTION send_profile_creation_request_admin_email
(
    user_id UUID,
    user_email TEXT,
    requested_first_name TEXT,
    requested_last_name TEXT,
    date_of_birth TEXT,
    playing_hand TEXT,
    age TEXT
)
RETURNS void AS $$
DECLARE
    template_variables JSONB;
    admin_record RECORD;
BEGIN
    -- Prepare template variables with all athlete registration form data
    template_variables := jsonb_build_object(
        'user_email', COALESCE(user_email, 'unknown'),
        'user_id', user_id,
        'requested_first_name', requested_first_name,
        'requested_last_name', requested_last_name,
        'date_of_birth', COALESCE(date_of_birth, 'Not provided'),
        'playing_hand', COALESCE(playing_hand, 'Not provided'),
        'age', COALESCE(age, 'Not calculated'),
        'timestamp', NOW()::text
    );

    -- Log emails for each admin user with 'pending' status for processing
    -- Use the existing 'profile_creation_request' template
    FOR admin_record IN
        SELECT p.email, p.id as admin_user_id
        FROM profiles p
        WHERE p.is_admin = true
    LOOP
        INSERT INTO public.email_logs (
            user_id,
            to_email,
            template,
            type,
            language,
            variables,
            status
        )
        VALUES (
            admin_record.admin_user_id,
            admin_record.email,
            'profile_creation_request',  -- Use existing template
            'admin',
            'en',
            template_variables,
            'pending'  -- Mark as pending for processing
        );
    END LOOP;
    
    RAISE LOG 'Profile creation request admin emails logged for % admin users',
        (SELECT COUNT(*) FROM profiles WHERE is_admin = true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION send_profile_creation_request_admin_email(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) IS 
'Sends admin alert emails for athlete profile creation requests using profile_creation_request template with all form data';

GRANT EXECUTE ON FUNCTION send_profile_creation_request_admin_email(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION send_profile_creation_request_admin_email(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- Update handle_profile_creation_request to use the new function
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
            user_email,
            user_metadata
        FROM auth.users
        WHERE id = user_id;

        -- Get user name from profiles (may be null for new users)
        SELECT first_name, last_name
        FROM profiles
        WHERE id = user_id
        INTO user_info;

        -- Extract form data from user_metadata (stored by frontend)
        date_of_birth := COALESCE(
            user_metadata->>'date_of_birth',
            user_metadata->>'dateOfBirth',
            'Not provided'
        );
        playing_hand := COALESCE(
            user_metadata->>'playing_hand',
            user_metadata->>'playingHand',
            'Not provided'
        );
        age_value := COALESCE(
            (user_metadata->>'age')::INTEGER,
            NULL
        );

        -- Send admin email using profile_creation_request template with all form data
        PERFORM send_profile_creation_request_admin_email(
            user_id,
            COALESCE(user_email, 'unknown'),
            user_first_name,
            user_last_name,
            date_of_birth,
            playing_hand,
            COALESCE(age_value::TEXT, 'Not calculated')
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

COMMENT ON FUNCTION handle_profile_creation_request(UUID, TEXT, TEXT) IS 
'Handles profile creation requests, sends admin alert emails using profile_creation_request template and user confirmation emails';
