-- Add firstName and lastName columns to profiles table
-- This migration adds the necessary columns for user registration

-- Add firstName and lastName columns to profiles table
ALTER TABLE profiles 
ADD COLUMN
IF NOT EXISTS firstName TEXT,
ADD COLUMN
IF NOT EXISTS lastName TEXT;

-- Create indexes for efficient lookups
CREATE INDEX
IF NOT EXISTS idx_profiles_firstName ON profiles
(firstName);
CREATE INDEX
IF NOT EXISTS idx_profiles_lastName ON profiles
(lastName);

-- Add comments for documentation
COMMENT ON COLUMN profiles.firstName IS 'User first name from registration';
COMMENT ON COLUMN profiles.lastName IS 'User last name from registration';
