-- Fix column names in the get_or_create_profile function
-- This migration updates the function to use the correct column names

-- Drop and recreate the function with correct column names
DROP FUNCTION IF EXISTS public.get_or_create_profile
(UUID);

-- Create the updated function with correct column names
CREATE OR REPLACE FUNCTION public.get_or_create_profile
(user_uuid UUID)
RETURNS TABLE
(
    id UUID,
    balance INTEGER,
    has_received_welcome_bonus BOOLEAN
) AS $$
DECLARE
    profile_record RECORD;
BEGIN
    -- Try to get existing profile
    SELECT p.id, p.balance, p.has_received_welcome_bonus
    INTO profile_record
    FROM profiles p
    WHERE p.id = user_uuid;

    -- If profile exists, return it
    IF FOUND THEN
    RETURN QUERY
    SELECT profile_record.id, profile_record.balance, profile_record.has_received_welcome_bonus;
    RETURN;
END
IF;
    
    -- If no profile found, create one with correct column names
    INSERT INTO profiles
    (
    id,
    email,
    first_name,
    last_name,
    balance,
    daily_login_streak,
    has_received_welcome_bonus,
    mfa_required,
    created_at,
    updated_at
    )
SELECT
    user_uuid,
    au.email,
    COALESCE(au.raw_user_meta_data->>'firstName', au.raw_user_meta_data->>'first_name', ''),
    COALESCE(au.raw_user_meta_data->>'lastName', au.raw_user_meta_data->>'last_name', ''),
    0,
    0,
    false,
    true,
    au.created_at,
    au.updated_at
FROM auth.users au
WHERE au.id = user_uuid;

-- Return the newly created profile
SELECT p.id, p.balance, p.has_received_welcome_bonus
INTO profile_record
FROM profiles p
WHERE p.id = user_uuid;

RETURN QUERY
SELECT profile_record.id, profile_record.balance, profile_record.has_received_welcome_bonus;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_or_create_profile
(UUID) TO service_role;
