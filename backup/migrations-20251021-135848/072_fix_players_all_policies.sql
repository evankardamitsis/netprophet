-- Fix any remaining RLS performance issues on players table
-- This migration addresses policies that might have been created outside of our migration files

-- Drop any existing policies that might be causing performance issues
DROP POLICY
IF EXISTS "Admins can do anything on players" ON public.players;
DROP POLICY
IF EXISTS "players_admin_policy" ON public.players;
DROP POLICY
IF EXISTS "players_select_policy" ON public.players;
DROP POLICY
IF EXISTS "players_insert_policy" ON public.players;
DROP POLICY
IF EXISTS "players_update_policy" ON public.players;
DROP POLICY
IF EXISTS "players_delete_policy" ON public.players;

-- Recreate a comprehensive admin policy with optimized auth.uid() usage
CREATE POLICY "players_admin_policy" ON public.players
    FOR ALL
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
)
    WITH CHECK
(
        EXISTS
(
            SELECT 1
FROM public.profiles
WHERE profiles.id = (SELECT auth.uid())
    AND profiles.is_admin = true
        )
);
