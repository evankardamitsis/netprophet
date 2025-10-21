-- Fix infinite recursion in profiles table policies
-- The admin policy is causing recursion by querying the profiles table from within a profiles policy

-- Drop the problematic admin policy that causes recursion
DROP POLICY
IF EXISTS "Admins have full access to profiles" ON public.profiles;

-- Create a simpler admin policy that doesn't cause recursion
-- We'll use auth.role() check instead of querying the profiles table
CREATE POLICY "Admins have full access to profiles" ON public.profiles
    FOR ALL TO authenticated
    USING
(
        -- Service role is always admin
        (SELECT auth.role())
= 'service_role'
        OR
        -- Check if user has admin flag in auth metadata (safer approach)
        EXISTS
(
            SELECT 1
FROM auth.users
WHERE auth.users.id = (SELECT auth.uid())
    AND (
                auth.users.raw_user_meta_data->>'is_admin' = 'true'
    OR auth.users.raw_user_meta_data->>'role' = 'admin'
            )
        )
)
    WITH CHECK
(
        -- Service role is always admin
        (SELECT auth.role())
= 'service_role'
        OR
        -- Check if user has admin flag in auth metadata (safer approach)
        EXISTS
(
            SELECT 1
FROM auth.users
WHERE auth.users.id = (SELECT auth.uid())
    AND (
                auth.users.raw_user_meta_data->>'is_admin' = 'true'
    OR auth.users.raw_user_meta_data->>'role' = 'admin'
            )
        )
);
