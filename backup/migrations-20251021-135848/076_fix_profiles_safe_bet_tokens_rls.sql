-- Fix RLS performance issue on profiles table for safe bet tokens policy
-- Replace auth.uid() with (SELECT auth.uid()) to avoid re-evaluation per row

-- Drop the existing problematic policy
DROP POLICY
IF EXISTS "Users can view their own safe bet tokens" ON public.profiles;

-- Recreate the policy with optimized auth.uid() usage
CREATE POLICY "Users can view their own safe bet tokens" ON public.profiles
    FOR
SELECT USING ((SELECT auth.uid()) = id);
