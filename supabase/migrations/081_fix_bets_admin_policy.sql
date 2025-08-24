-- Fix multiple permissive policies issue on bets table
-- Remove the problematic FOR ALL admin policy and create specific ones

-- Drop the existing problematic admin policy that uses FOR ALL
DROP POLICY
IF EXISTS "Admins can view all bets" ON public.bets;

-- Create a specific admin policy for SELECT only
CREATE POLICY "Admins can view all bets" ON public.bets
    FOR
SELECT USING (
        EXISTS (
            SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
        AND is_admin = true
        )
    );
