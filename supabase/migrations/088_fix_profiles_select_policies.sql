-- Fix multiple permissive policies issue for SELECT on profiles table
-- Consolidate policies to avoid overlap for anon role

-- Drop the existing problematic policies
DROP POLICY
IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY
IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY
IF EXISTS "Users can view their own safe bet tokens" ON public.profiles;

-- Create a unified policy that handles both admin and user access
CREATE POLICY "Profiles access policy" ON public.profiles
    FOR
SELECT USING (
        -- Admins can view all profiles
        EXISTS (
            SELECT 1
        FROM public.profiles
        WHERE id = (SELECT auth.uid())
            AND is_admin = true
        )
        OR
        -- Users can view their own profile
        ((SELECT auth.uid()) = id)
    );
