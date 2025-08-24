-- Fix the admin function to avoid recursion in profiles table policies
-- We'll use a different approach that doesn't query the profiles table

-- Drop the problematic function that causes recursion
DROP FUNCTION IF EXISTS is_admin_user
();
DROP FUNCTION IF EXISTS check_admin_status
();

-- Create a new admin check function that uses auth.users metadata
-- This avoids the recursion issue since we're not querying the profiles table
CREATE OR REPLACE FUNCTION is_admin_user
()
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user is service role (always admin)
    IF (SELECT auth.role()) = 'service_role' THEN
    RETURN true;
END
IF;
    
    -- Check if user has admin flag in auth.users metadata
    -- This is a safer approach that doesn't cause recursion
    RETURN EXISTS
(
        SELECT 1
FROM auth.users
WHERE auth.users.id = auth.uid()
    AND (
            auth.users.raw_user_meta_data->>'is_admin' = 'true'
    OR auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_admin_user
() TO authenticated;

-- Update the profiles policies to use the fixed function
DROP POLICY
IF EXISTS "Admins can manage profiles" ON public.profiles;

-- Create a simple admin policy that uses the fixed function
CREATE POLICY "Admins can manage profiles" ON public.profiles
    FOR ALL USING
(is_admin_user
())
    WITH CHECK
(is_admin_user
());
