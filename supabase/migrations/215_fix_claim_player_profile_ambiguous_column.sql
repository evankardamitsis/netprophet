-- Fix ambiguous column reference in claim_player_profile function
-- This migration fixes the is_demo_player column reference ambiguity

CREATE OR REPLACE FUNCTION claim_player_profile
(
    player_id UUID,
    user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    player_exists BOOLEAN;
BEGIN
    -- Check if player exists, is not already claimed, and is not a demo player
    -- Use explicit table alias to avoid ambiguity
    SELECT EXISTS
    (
        SELECT 1
    FROM players p
    WHERE p.id = player_id
        AND p.is_hidden = true
        AND p.claimed_by_user_id IS NULL
        AND p.is_demo_player = false
    )
    INTO player_exists;

IF NOT player_exists THEN
RETURN false;
END
IF;
    
    -- Update player to be claimed and active
    UPDATE players 
    SET 
        is_hidden = false,
        is_active = true,
        claimed_by_user_id = user_id,
        claimed_at = NOW()
    WHERE id = player_id;

RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment to document the fix
COMMENT ON FUNCTION claim_player_profile
(UUID, UUID) IS 'Fixed ambiguous column reference by using explicit table alias';
