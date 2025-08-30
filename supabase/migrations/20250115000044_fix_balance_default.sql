-- Fix the default balance for new users - should be 0, not 1000
-- This ensures new users start with 0 balance and must claim their welcome bonus

-- Change the default value for the balance column
ALTER TABLE profiles ALTER COLUMN balance
SET
DEFAULT 0;

-- Update any existing users who have the old default balance but haven't claimed welcome bonus
UPDATE profiles 
SET balance = 0 
WHERE balance = 1000
    AND has_received_welcome_bonus = false;

-- Add a comment to document the change
COMMENT ON COLUMN profiles.balance IS 'User balance in coins. New users start with 0 and must claim welcome bonus.';
