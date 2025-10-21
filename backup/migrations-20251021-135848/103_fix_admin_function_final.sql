-- Fix the admin function to properly check admin status without recursion
-- We'll use a different approach that bypasses RLS for admin checks

-- Drop the policy first to avoid dependency issues
DROP POLICY
IF EXISTS "Admins can manage profiles" ON public.profiles;

-- Drop the problematic function
DROP FUNCTION IF EXISTS is_admin_user
();

-- Create a new admin check function that uses SECURITY DEFINER to bypass RLS
-- This allows it to query the profiles table without triggering RLS policies
CREATE OR REPLACE FUNCTION is_admin_user
()
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user is service role (always admin)
    IF (SELECT auth.role()) = 'service_role' THEN
    RETURN true;
END
IF;
    
    -- Use SECURITY DEFINER to bypass RLS and check profiles.is_admin directly
    -- This avoids the recursion issue because SECURITY DEFINER runs with elevated privileges
    RETURN EXISTS
(
        SELECT 1
FROM public.profiles
WHERE id = auth.uid()
    AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_admin_user
() TO authenticated;

-- Create a simple admin policy that uses the fixed function
CREATE POLICY "Admins can manage profiles" ON public.profiles
    FOR ALL USING
(is_admin_user
())
    WITH CHECK
(is_admin_user
());
