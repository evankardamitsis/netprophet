-- Add 'skipped' status to profile_claim_status constraint
-- This migration allows users to skip the profile claim process

-- Drop the existing constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_profile_claim_status_check;

-- Add the new constraint with 'skipped' included
ALTER TABLE profiles ADD CONSTRAINT profiles_profile_claim_status_check 
CHECK (profile_claim_status IN ('pending', 'claimed', 'creation_requested', 'completed', 'skipped'));

-- Add comment to document the new status
COMMENT ON COLUMN profiles.profile_claim_status IS 'Status of profile claim process: pending, claimed, creation_requested, completed, or skipped';
