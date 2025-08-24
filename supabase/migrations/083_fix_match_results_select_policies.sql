-- Fix multiple permissive policies issue for SELECT on match_results table
-- Consolidate policies to avoid overlap for anon role

-- Drop the existing problematic policies
DROP POLICY
IF EXISTS "Admins can manage match results" ON public.match_results;
DROP POLICY
IF EXISTS "Users can view match results" ON public.match_results;

-- Create a unified policy that handles both admin and user access
CREATE POLICY "Match results access policy" ON public.match_results
    FOR
SELECT USING (
        -- Admins can view all match results
        EXISTS (
            SELECT 1
        FROM public.profiles
        WHERE id = (SELECT auth.uid())
            AND is_admin = true
        )
        OR
        -- Authenticated users can view match results
        ((SELECT auth.role()) = 'authenticated')
    ); 
