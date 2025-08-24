-- Fix multiple permissive policies issue for SELECT on players table
-- Consolidate policies to avoid overlap for authenticated role

-- Drop the existing problematic policies
DROP POLICY
IF EXISTS "Allow select for admins only" ON public.players;
DROP POLICY
IF EXISTS "players_admin_policy" ON public.players;

-- Create a unified policy that handles admin access
CREATE POLICY "Players access policy" ON public.players
    FOR
SELECT
    TO authenticated
USING
(
        -- Only admins can view players
        EXISTS
(
            SELECT 1
FROM public.profiles
WHERE profiles.id = (SELECT auth.uid())
    AND profiles.is_admin = true
        )
);
