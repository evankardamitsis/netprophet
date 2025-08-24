-- Fix multiple permissive policies issue for INSERT on profiles table
-- Remove the problematic FOR ALL admin policy

-- Drop the existing problematic admin policy that uses FOR ALL
DROP POLICY
IF EXISTS "Admins can do anything" ON public.profiles;
