-- Fix admin access to match_results table - ensure admins have full access
-- Drop any existing policies that might conflict
DROP POLICY
IF EXISTS "Admins can manage match results" ON public.match_results;
DROP POLICY
IF EXISTS "Users can view match results" ON public.match_results;
DROP POLICY
IF EXISTS "Match results access policy" ON public.match_results;
DROP POLICY
IF EXISTS "Match results insert policy" ON public.match_results;

-- Create comprehensive admin policy for ALL operations
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
) WITH CHECK
(
        EXISTS
(
            SELECT 1
FROM public.profiles
WHERE profiles.id = (SELECT auth.uid())
    AND profiles.is_admin = true
        )
);

-- Create user view policy for SELECT only
CREATE POLICY "Users can view match results" ON public.match_results
    FOR
SELECT USING ((SELECT auth.role()) = 'authenticated');
