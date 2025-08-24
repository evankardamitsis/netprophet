-- Fix RLS performance issue on players table
-- Replace auth.uid() with (SELECT auth.uid()) to avoid re-evaluation per row

-- Drop the existing problematic policy
DROP POLICY
IF EXISTS "Allow select for admins only" ON public.players;

-- Recreate the policy with optimized auth.uid() usage
CREATE POLICY "Allow select for admins only"
    ON public.players
    FOR
SELECT
    TO authenticated
USING
(
        EXISTS
(
            SELECT 1
FROM public.profiles
WHERE profiles.id = (SELECT auth.uid())
    AND profiles.is_admin = true
        )
);
