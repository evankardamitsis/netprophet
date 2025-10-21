-- Fix multiple permissive policies issue for SELECT on tournament_categories table
-- Consolidate policies to avoid overlap for anon role

-- Drop the existing problematic policies
DROP POLICY
IF EXISTS "Admins can manage tournament categories" ON public.tournament_categories;
DROP POLICY
IF EXISTS "Everyone can view tournament categories" ON public.tournament_categories;

-- Create a unified policy that handles both admin and general access
CREATE POLICY "Tournament categories access policy" ON public.tournament_categories
    FOR
SELECT USING (
        -- Admins can view all tournament categories
        EXISTS (
            SELECT 1
        FROM public.profiles
        WHERE id = (SELECT auth.uid())
            AND is_admin = true
        )
        OR
        -- Everyone can view tournament categories (including anon users)
        true
    );
