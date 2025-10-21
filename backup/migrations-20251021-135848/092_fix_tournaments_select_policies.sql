-- Fix multiple permissive policies issue for SELECT on tournaments table
-- Consolidate policies to avoid overlap for anon role

-- Drop the existing problematic policies
DROP POLICY
IF EXISTS "Admins can manage tournaments" ON public.tournaments;
DROP POLICY
IF EXISTS "Everyone can view tournaments" ON public.tournaments;

-- Create a unified policy that handles both admin and general access
CREATE POLICY "Tournaments access policy" ON public.tournaments
    FOR
SELECT USING (
        -- Admins can view all tournaments
        EXISTS (
            SELECT 1
        FROM public.profiles
        WHERE id = (SELECT auth.uid())
            AND is_admin = true
        )
        OR
        -- Everyone can view tournaments (including anon users)
        true
    );
