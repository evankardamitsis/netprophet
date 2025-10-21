-- Fix INSERT policy for match_results table to allow admin users to insert
-- Drop any existing broken policy first
DROP POLICY
IF EXISTS "Match results insert policy" ON public.match_results;

-- Create a proper INSERT policy for admin users
CREATE POLICY "Match results insert policy" ON public.match_results
    FOR
INSERT WITH CHECK
    (
    EXIS
T 1
    FROM public.
HERE profiles.id = (SELECT auth.uid()
)
    AND profiles.is_admin = true
        )
OR
(SELECT auth.role())
= 'service_role'
    );
