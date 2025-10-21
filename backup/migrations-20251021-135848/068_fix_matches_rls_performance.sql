-- Fix RLS performance issue on matches table
-- Replace auth.uid() with (SELECT auth.uid()) to avoid re-evaluation per row

-- Drop the existing policy
DROP POLICY IF EXISTS "Admins can manage matches" ON public.matches;

-- Recreate the policy with optimized auth.uid() usage
CREATE POLICY "Admins can manage matches" ON public.matches
    FOR ALL USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = (SELECT auth.uid())
            AND is_admin = true
        )
    );
