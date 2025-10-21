-- Fix new user balance - change default from 1000 to 0
-- Users should only get the welcome bonus (100 coins) when they claim it

-- Update the default balance for new profiles
ALTER TABLE profiles ALTER COLUMN balance
SET
DEFAULT 0;

-- Update existing profiles that have exactly 1000 balance and haven't received welcome bonus
-- This targets users who got the old 1000 coin starting balance
UPDATE profiles 
SET balance = 0 
WHERE balance = 1000
    AND has_received_welcome_bonus = false;
