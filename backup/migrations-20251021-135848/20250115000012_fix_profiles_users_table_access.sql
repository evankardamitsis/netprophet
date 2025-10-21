-- Fix permission denied for table users error
-- The current RLS policy is trying to access auth.users table which causes permission issues
-- We'll simplify the policies to avoid this problem

-- Drop the problematic admin policy that accesses auth.users
DROP POLICY
IF EXISTS "Admins have full access to profiles" ON public.profiles;

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow leaderboard access for all authenticated users" ON public.profiles;

-- Create a simpler admin policy that doesn't access auth.users table
-- We'll use a function-based approach that's more reliable
CREATE OR REPLACE FUNCTION check_admin_status
()
RETURNS BOOLEAN AS $$
BEGIN
    -- Service role is always admin
    IF (SELECT auth.role()) = 'service_role' THEN
    RETURN true;
END
IF;
    
    -- Check if user is admin by querying profiles table with SECURITY DEFINER
    -- This bypasses RLS and avoids the auth.users table access issue
    RETURN EXISTS
(
        SELECT 1
FROM public.profiles
WHERE id = auth.uid()
    AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_admin_status
() TO authenticated;

-- Create a simple admin policy that uses the function
CREATE POLICY "Admins have full access to profiles" ON public.profiles
    FOR ALL TO authenticated
    USING
(check_admin_status
())
    WITH CHECK
(check_admin_status
());

-- Ensure we have the basic user policies in place
-- Users can view their own profile (for leaderboard access)
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR
SELECT TO authenticated
USING
((SELECT auth.uid())
= id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR
UPDATE TO authenticated
    USING ((SELECT auth.uid()) = id)
WITH CHECK
((SELECT auth.uid())
= id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR
INSERT TO
authenticated
WITH
CHECK
((SELECT auth.uid())
= id);

-- Allow all authenticated users to view profiles for leaderboard functionality
CREATE POLICY "Allow leaderboard access for all authenticated users" ON public.profiles
    FOR
SELECT TO authenticated
USING
(true);
