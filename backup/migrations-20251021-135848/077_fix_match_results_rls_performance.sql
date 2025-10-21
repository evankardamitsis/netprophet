-- Fix RLS performance issues on match_results table
-- Replace auth.uid() and auth.role() with (SELECT auth.uid()) and (SELECT auth.role()) to avoid re-evaluation per row

-- Drop the existing problematic policies
DROP POLICY
IF EXISTS "Admins can manage match results" ON public.match_results;
DROP POLICY
IF EXISTS "Users can view match results" ON public.match_results;

-- Recreate the policies with optimized auth function usage
CREATE POLICY "Admins can manage match results" ON public.match_results
    FOR ALL USING
(
        EXISTS
(
            SELECT 1
FROM public.profiles
WHERE profiles.id = (SELECT auth.uid())
    AND profiles.is_admin = true
        )
);

CREATE POLICY "Users can view match results" ON public.match_results
    FOR
SELECT USING ((SELECT auth.role()) = 'authenticated');
