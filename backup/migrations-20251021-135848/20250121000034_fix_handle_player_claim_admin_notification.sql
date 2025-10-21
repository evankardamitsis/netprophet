-- Fix handle_player_claim function to use send_admin_alert_email instead of send_admin_notification
-- The admin_notifications table was dropped, so we need to use the new email-based system

CREATE OR REPLACE FUNCTION handle_player_claim
(
    user_id UUID,
    player_id UUID
)
RETURNS JSONB AS $$
DECLARE
    claim_success BOOLEAN;
    player_info RECORD;
    result JSONB;
BEGIN
    -- Attempt to claim the player profile
    SELECT claim_player_profile(player_id, user_id)
    INTO claim_success;

    IF claim_success THEN
    -- Update user profile
    UPDATE profiles 
        SET 
            profile_claim_status = 'claimed',
            claimed_player_id = player_id,
            profile_claim_completed_at = NOW(),
            updated_at = NOW()
        WHERE id = user_id;

    -- Get player information (using correct column names)
    SELECT first_name, last_name
    FROM players
    WHERE id = player_id
    INTO player_info;

-- Send admin alert email instead of using admin_notifications table
PERFORM send_admin_alert_email
(
            'Player Profile Claimed',
            'User ' ||
(SELECT email
FROM profiles
WHERE id = user_id)
|| ' has claimed player profile: ' || player_info.first_name || ' ' || player_info.last_name,
            jsonb_build_object
(
                'player_name', player_info.first_name,
                'player_surname', player_info.last_name,
                'user_email',
(SELECT email
FROM profiles
WHERE id = user_id)
,
                'user_id', user_id,
                'player_id', player_id,
                'claim_time', NOW
()
            )
        );
        
        result := jsonb_build_object
(
            'success', true,
            'message', 'Player profile claimed successfully',
            'player_name', player_info.first_name,
            'player_surname', player_info.last_name
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
