-- Sync profile claim status with actual player claims
-- This fixes the edge case where users have claimed players but their profile status is wrong

-- Update profiles to reflect their actual claimed player status
UPDATE profiles 
SET 
    profile_claim_status = 'claimed',
    claimed_player_id = (
        SELECT p.id
FROM players p
WHERE p.claimed_by_user_id = profiles.id
    AND p.claimed_by_user_id IS NOT NULL
        LIMIT 1
)
WHERE 
    id IN
(
        SELECT DISTINCT claimed_by_user_id
FROM players
WHERE claimed_by_user_id IS NOT NULL
    )
AND
(profile_claim_status != 'claimed' OR claimed_player_id IS NULL);

-- Add comment to document the fix
COMMENT ON TABLE profiles IS 'Synced profile claim status with actual player claims to fix edge case';
