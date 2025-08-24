-- Fix infinite recursion issue in profiles table policies
-- The issue is that we're querying the profiles table from within a profiles table policy
-- This creates a circular reference and infinite recursion

-- Drop the problematic policies that cause recursion
DROP POLICY
IF EXISTS "Profiles access policy" ON public.profiles;
DROP POLICY
IF EXISTS "Profiles update policy" ON public.profiles;

-- Create simple policies that don't cause recursion
-- For SELECT: Users can view their own profile, admins can view all (handled by separate admin policy)
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR
SELECT USING ((SELECT auth.uid()) = id);

-- For UPDATE: Users can update their own profile, admins can update all (handled by separate admin policy)
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR
UPDATE USING ((SELECT auth.uid()
) = id)
    WITH CHECK
((SELECT auth.uid())
= id);

-- For INSERT: Users can insert their own profile (already exists)
-- Keep the existing insert policy

-- Create a separate admin policy that uses a different approach
-- We'll use a function or check the auth.role() instead of querying profiles table
CREATE POLICY "Admins can manage profiles" ON public.profiles
    FOR ALL USING
(
        (SELECT auth.role())
= 'service_role'
        OR
        EXISTS
(
            SELECT 1
FROM auth.users
WHERE auth.users.id = (SELECT auth.uid())
    AND auth.users.raw_user_meta_data->>'is_admin' = 'true'
        )
)
    WITH CHECK
(
        (SELECT auth.role())
= 'service_role'
        OR
        EXISTS
(
            SELECT 1
FROM auth.users
WHERE auth.users.id = (SELECT auth.uid())
    AND auth.users.raw_user_meta_data->>'is_admin' = 'true'
        )
);
