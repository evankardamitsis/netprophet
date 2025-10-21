-- Fix multiple permissive policies issue for SELECT on matches table
-- Consolidate policies to avoid overlap for anon role

-- Drop the existing problematic policies
DROP POLICY IF EXISTS "Admins can manage matches" ON public.matches;
DROP POLICY IF EXISTS "Everyone can view matches" ON public.matches;
DROP POLICY IF EXISTS "matches_select_policy" ON public.matches;

-- Create a unified policy that handles both admin and general access
CREATE POLICY "Matches access policy" ON public.matches
    FOR SELECT USING (
        -- Admins can view all matches
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid())
            AND is_admin = true
        )
        OR
        -- Everyone can view matches (including anon users)
        true
    );

-- Create separate admin policies for INSERT, UPDATE, DELETE operations
CREATE POLICY "Admins can insert matches" ON public.matches
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid())
            AND is_admin = true
        )
    );

CREATE POLICY "Admins can update matches" ON public.matches
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid())
            AND is_admin = true
        )
    );

CREATE POLICY "Admins can delete matches" ON public.matches
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid())
            AND is_admin = true
        )
    );
