-- Fix handle_player_claim function to update terms_accepted when claiming profile
-- This migration ensures that terms_accepted is set to true when a player profile is claimed

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

    -- Get player information using first_name and last_name
    SELECT first_name, last_name
    FROM players
    WHERE id = player_id
    INTO player_info;

-- Send admin notification
PERFORM send_admin_notification
(
            'player_claimed',
            'Player Profile Claimed',
            'User ' ||
(SELECT email
FROM profiles
WHERE id = user_id)
|| ' has claimed player profile: ' || player_info.first_name || ' ' || player_info.last_name,
            user_id,
            player_id,
            jsonb_build_object
(
                'player_first_name', player_info.first_name,
                'player_last_name', player_info.last_name,
                'user_email',
(SELECT email
FROM profiles
WHERE id = user_id)
)
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

-- Add comment to document the fix
COMMENT ON FUNCTION handle_player_claim
(UUID, UUID) IS 'Updated to set terms_accepted = true when claiming player profile';
