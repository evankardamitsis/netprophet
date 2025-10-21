-- Fix multiple permissive policies issue for SELECT on tournament_participants table
-- Consolidate policies to avoid overlap for anon role

-- Drop the existing problematic policies
DROP POLICY
IF EXISTS "Admins can manage tournament participants" ON public.tournament_participants;
DROP POLICY
IF EXISTS "Everyone can view tournament participants" ON public.tournament_participants;

-- Create a unified policy that handles both admin and general access
CREATE POLICY "Tournament participants access policy" ON public.tournament_participants
    FOR
SELECT USING (
        -- Admins can view all tournament participants
        EXISTS (
            SELECT 1
        FROM public.profiles
        WHERE id = (SELECT auth.uid())
            AND is_admin = true
        )
        OR
        -- Everyone can view tournament participants (including anon users)
        true
    );
