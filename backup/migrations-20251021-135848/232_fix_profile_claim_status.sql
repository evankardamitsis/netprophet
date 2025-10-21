-- Fix profile claim status for users who already have claimed players
-- This ensures users with existing claimed players don't see the claim flow

-- Update profiles that have claimed_player_id but wrong profile_claim_status
UPDATE profiles 
SET profile_claim_status = 'claimed'
WHERE claimed_player_id IS NOT NULL
    AND profile_claim_status != 'claimed';

-- Add comment to document the fix
COMMENT ON TABLE profiles IS 'Updated profile_claim_status for users with existing claimed players';
