-- Fix handle_player_claim to use send_admin_alert_email instead of send_admin_notification
-- The admin_notifications table was removed in favor of the email-based system

CREATE OR REPLACE FUNCTION handle_player_claim
(
    user_id UUID,
    player_id UUID
)
RETURNS JSONB AS $$
DECLARE
    claim_success BOOLEAN;
    player_info RECORD;
    user_info RECORD;
    result JSONB;
BEGIN
    -- Attempt to claim the player profile
    SELECT claim_player_profile(player_id, user_id)
    INTO claim_success;

    IF claim_success THEN
    -- Update user profile with terms acceptance
    UPDATE profiles 
        SET 
            profile_claim_status = 'claimed',
            claimed_player_id = player_id,
            profile_claim_completed_at = NOW(),
            terms_accepted = true,
            terms_accepted_at = NOW(),
            updated_at = NOW()
        WHERE id = user_id;

    -- Get player information
    SELECT first_name, last_name
    FROM players
    WHERE id = player_id
    INTO player_info;

-- Get user information
SELECT email, first_name, last_name
FROM profiles
WHERE id = user_id
INTO user_info;

        -- Send admin alert email (replaces send_admin_notification)
        PERFORM send_admin_alert_email
(
            'Player Profile Claimed',
            'User ' || user_info.email || ' has claimed player profile: ' || player_info.first_name || ' ' || player_info.last_name,
            jsonb_build_object
(
                'player_first_name', player_info.first_name,
                'player_last_name', player_info.last_name,
                'user_email', user_info.email,
                'user_id', user_id,
                'player_id', player_id
            )
        );
        
        -- Send confirmation email to user
        PERFORM send_profile_claim_confirmation_email
(
            user_info.email,
            user_id,
            COALESCE
(user_info.first_name || ' ' || user_info.last_name, 'User'),
            player_info.first_name,
            player_info.last_name
        );
        
        result := jsonb_build_object
(
            'success', true,
            'message', 'Player profile claimed successfully',
            'player_first_name', player_info.first_name,
            'player_last_name', player_info.last_name
        );
    ELSE
        result := jsonb_build_object
(
            'success', false,
            'message', 'Failed to claim player profile. Player may already be claimed or not found.'
        );
END
IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_player_claim
(UUID, UUID) IS 'Handles player profile claiming with admin and user email notifications';

