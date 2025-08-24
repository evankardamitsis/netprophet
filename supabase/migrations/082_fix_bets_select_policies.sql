-- Fix multiple permissive policies issue for SELECT on bets table
-- Make policies more specific to avoid overlap for anon role

-- Drop the existing problematic policies
DROP POLICY
IF EXISTS "Admins can view all bets" ON public.bets;
DROP POLICY
IF EXISTS "Users can view their own bets" ON public.bets;

-- Create a unified policy that handles both admin and user access
CREATE POLICY "Bets access policy" ON public.bets
    FOR
SELECT USING (
        -- Admins can view all bets
        EXISTS (
            SELECT 1
        FROM public.profiles
        WHERE id = (SELECT auth.uid())
            AND is_admin = true
        )
        OR
        -- Users can view their own bets
        ((SELECT auth.uid()) = user_id)
    );
