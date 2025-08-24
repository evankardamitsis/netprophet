-- Fix any remaining RLS performance issues on matches table
-- This migration addresses policies that might have been created outside of our migration files

-- Drop any existing policies that might be causing performance issues
DROP POLICY IF EXISTS "Matches are viewable by authenticated users" ON public.matches;
DROP POLICY IF EXISTS "matches_select_policy" ON public.matches;
DROP POLICY IF EXISTS "matches_view_policy" ON public.matches;

-- Recreate a clean, performant SELECT policy for matches
CREATE POLICY "matches_select_policy" ON public.matches
    FOR SELECT USING (true);

-- Ensure the admin policy is also optimized (in case it was recreated)
DROP POLICY IF EXISTS "Admins can manage matches" ON public.matches;

CREATE POLICY "Admins can manage matches" ON public.matches
    FOR ALL USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = (SELECT auth.uid())
            AND is_admin = true
        )
    );
