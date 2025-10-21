-- Fix leaderboard access for all authenticated users
-- The current RLS policies are too restrictive and prevent regular users from accessing leaderboard data

-- Drop existing restrictive policies
DROP POLICY
IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY
IF EXISTS "Admins can manage profiles" ON public.profiles;
DROP POLICY
IF EXISTS "Profiles access policy" ON public.profiles;
DROP POLICY
IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY
IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY
IF EXISTS "Admins have full access to profiles" ON public.profiles;
DROP POLICY
IF EXISTS "Allow leaderboard access for all authenticated users" ON public.profiles;

-- Create a new policy that allows all authenticated users to view leaderboard data
-- This is necessary for the leaderboard functionality to work
CREATE POLICY "Allow leaderboard access for all authenticated users" ON public.profiles
    FOR
SELECT TO authenticated
USING
(
        -- Allow access to leaderboard-related columns for all authenticated users
        -- This enables the leaderboard functionality
        true
    );

-- Create a separate policy for users to update their own profile
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR
UPDATE TO authenticated
    USING ((SELECT auth.uid()) = id)
WITH CHECK
((SELECT auth.uid())
= id);

-- Create a policy for users to insert their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR
INSERT TO
authenticated
WITH
CHECK
((SELECT auth.uid())
= id);

-- Create admin-specific policies for full access
CREATE POLICY "Admins have full access to profiles" ON public.profiles
    FOR ALL TO authenticated
    USING
(
        EXISTS
(
            SELECT 1
FROM public.profiles
WHERE id = (SELECT auth.uid())
    AND is_admin = true
        )
)
    WITH CHECK
(
        EXISTS
(
            SELECT 1
FROM public.profiles
WHERE id = (SELECT auth.uid())
    AND is_admin = true
        )
);
