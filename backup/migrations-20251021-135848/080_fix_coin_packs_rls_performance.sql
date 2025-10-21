-- Fix RLS performance issue on coin_packs table
-- Replace auth.uid() with (SELECT auth.uid()) to avoid re-evaluation per row

-- Drop the existing problematic policy
DROP POLICY
IF EXISTS "Admins can manage coin packs" ON public.coin_packs;

-- Recreate the policy with optimized auth.uid() usage
CREATE POLICY "Admins can manage coin packs" ON public.coin_packs
    FOR ALL USING
(
        EXISTS
(
            SELECT 1
FROM public.profiles
WHERE profiles.id = (SELECT auth.uid())
    AND profiles.is_admin = true
        )
);
