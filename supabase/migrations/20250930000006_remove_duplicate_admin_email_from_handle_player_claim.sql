-- Remove duplicate admin email from handle_player_claim function
-- The trigger_admin_profile_claim_email trigger already sends the email,
-- so we don't need to send it again from handle_player_claim

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

-- NOTE: Admin email is sent automatically by trigger_admin_profile_claim_email trigger
-- No need to send it here to avoid duplicates

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

COMMENT ON FUNCTION handle_player_claim IS 'Claims a player profile for a user. Admin notification is sent via trigger_admin_profile_claim_email trigger.';
