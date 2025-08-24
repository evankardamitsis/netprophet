-- Fix multiple permissive policies issue for INSERT on profiles table
-- Remove one of the overlapping policies to eliminate the issue

-- Drop one of the overlapping policies
DROP POLICY
IF EXISTS "Admins can insert profiles" ON public.profiles;
