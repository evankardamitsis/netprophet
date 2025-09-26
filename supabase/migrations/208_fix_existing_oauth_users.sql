-- Fix existing OAuth users by extracting names from their metadata
-- This migration updates existing users who have OAuth metadata but no names in their profile

-- Update existing OAuth users with extracted names
UPDATE profiles 
SET 
    first_name = CASE 
        WHEN auth.users.raw_user_meta_data->>'name' IS NOT NULL THEN
            split_part(trim(auth.users.raw_user_meta_data->>'name'), ' ', 1)
        WHEN auth.users.raw_user_meta_data->>'full_name' IS NOT NULL THEN
            split_part(trim(auth.users.raw_user_meta_data->>'full_name'), ' ', 1)
        ELSE profiles.first_name
    END,
    last_name = CASE 
        WHEN auth.users.raw_user_meta_data->>'name' IS NOT NULL THEN
            split_part(trim(auth.users.raw_user_meta_data->>'name'), ' ', array_length(string_to_array(trim(auth.users.raw_user_meta_data->>'name'), ' '), 1))
        WHEN auth.users.raw_user_meta_data->>'full_name' IS NOT NULL THEN
            split_part(trim(auth.users.raw_user_meta_data->>'full_name'), ' ', array_length(string_to_array(trim(auth.users.raw_user_meta_data->>'full_name'), ' '), 1))
        ELSE profiles.last_name
    END,
    updated_at = NOW()
FROM auth.users
WHERE profiles.id = auth.users.id
    AND profiles.first_name IS NULL
    AND profiles.last_name IS NULL
    AND (
    auth.users.raw_user_meta_data->>'name' IS NOT NULL
    OR auth.users.raw_user_meta_data->>'full_name' IS NOT NULL
);

-- Add comment to document this change
COMMENT ON TABLE profiles IS 'Updated existing OAuth users with extracted names from their metadata';
