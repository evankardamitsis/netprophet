-- Fix admin access to tournaments table - ensure admins have full access
-- Drop any existing policies that might conflict
DROP POLICY
IF EXISTS "Admins can manage tournaments" ON public.tournaments;
DROP POLICY
IF EXISTS "Everyone can view tournaments" ON public.tournaments;
DROP POLICY
IF EXISTS "Tournaments access policy" ON public.tournaments;

-- Create comprehensive admin policy for ALL operations
CREATE POLICY "Admins can manage tournaments" ON public.tournaments
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

-- Create public view policy for SELECT only
CREATE POLICY "Everyone can view tournaments" ON public.tournaments
    FOR
SELECT USING (true);
