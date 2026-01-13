-- Ensure all authenticated users can view players and their images
-- This allows any authenticated user to see athlete photos, not just the uploader

-- Drop any existing restrictive policies that might limit access
DROP POLICY IF EXISTS "Allow select for admins only" ON public.players;
DROP POLICY IF EXISTS "Players access policy" ON public.players;
DROP POLICY IF EXISTS "players_admin_policy" ON public.players;
DROP POLICY IF EXISTS "Allow select for authenticated" ON public.players;
DROP POLICY IF EXISTS "Everyone can view players" ON public.players;

-- Create a policy that allows all authenticated users to view players
-- This ensures athlete images are visible to all authenticated users
CREATE POLICY "All authenticated users can view players" ON public.players
    FOR SELECT TO authenticated
    USING (true);

-- Create admin-only policies for INSERT, UPDATE, DELETE operations
DROP POLICY IF EXISTS "Admins can insert players" ON public.players;
CREATE POLICY "Admins can insert players" ON public.players
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid())
            AND is_admin = true
        )
    );

DROP POLICY IF EXISTS "Admins can update players" ON public.players;
CREATE POLICY "Admins can update players" ON public.players
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid())
            AND is_admin = true
        )
    );

DROP POLICY IF EXISTS "Admins can delete players" ON public.players;
CREATE POLICY "Admins can delete players" ON public.players
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid())
            AND is_admin = true
        )
    );

COMMENT ON POLICY "All authenticated users can view players" ON public.players IS 
'Allows all authenticated users to view players and their photos. This ensures athlete images are visible to everyone who is signed in, not just the uploader.';
