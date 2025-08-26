-- Fix RLS policies to allow public access to players and coin packs
-- Regular users should be able to view players and coin packs for the web app

-- Fix players table RLS policies
-- Drop the existing admin-only policy
DROP POLICY IF EXISTS "Allow select for admins only" ON public.players;
DROP POLICY IF EXISTS "Players access policy" ON public.players;
DROP POLICY IF EXISTS "players_admin_policy" ON public.players;

-- Create a policy that allows all authenticated users to view players
CREATE POLICY "Everyone can view players" ON public.players
    FOR SELECT TO authenticated
    USING (true);

-- Create admin-only policies for INSERT, UPDATE, DELETE operations
CREATE POLICY "Admins can insert players" ON public.players
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid())
            AND is_admin = true
        )
    );

CREATE POLICY "Admins can update players" ON public.players
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid())
            AND is_admin = true
        )
    );

CREATE POLICY "Admins can delete players" ON public.players
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid())
            AND is_admin = true
        )
    );

-- Fix coin_packs table RLS policies
-- Drop the existing admin-only policy
DROP POLICY IF EXISTS "Admins can manage coin packs" ON public.coin_packs;

-- Create a policy that allows all authenticated users to view coin packs
CREATE POLICY "Everyone can view coin packs" ON public.coin_packs
    FOR SELECT TO authenticated
    USING (true);

-- Create admin-only policies for INSERT, UPDATE, DELETE operations
CREATE POLICY "Admins can insert coin packs" ON public.coin_packs
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid())
            AND is_admin = true
        )
    );

CREATE POLICY "Admins can update coin packs" ON public.coin_packs
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid())
            AND is_admin = true
        )
    );

CREATE POLICY "Admins can delete coin packs" ON public.coin_packs
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid())
            AND is_admin = true
        )
    );
