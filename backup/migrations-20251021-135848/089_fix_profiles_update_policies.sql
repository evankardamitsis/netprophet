-- Fix multiple permissive policies issue for UPDATE on profiles table
-- Consolidate policies to avoid overlap for anon role

-- Drop the existing problematic policies
DROP POLICY
IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY
IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create a unified policy that handles both admin and user update access
CREATE POLICY "Profiles update policy" ON public.profiles
    FOR
UPDATE USING (
        -- Admins can update all profiles
        EXISTS (
            SELECT 1
FROM public.profiles
WHERE id = (SELECT auth.uid())
    AND is_admin = true
        )
OR
-- Users can update their own profile
((SELECT auth.uid())
= id)
    )
    WITH CHECK
(
        -- Admins can update all profiles
        EXISTS
(
            SELECT 1
FROM public.profiles
WHERE id = (SELECT auth.uid())
    AND is_admin = true
        )
OR
-- Users can update their own profile
((SELECT auth.uid())
= id)
    );
