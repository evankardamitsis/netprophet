-- Fix RLS performance issue on profiles table
-- Replace auth.uid() with (SELECT auth.uid()) to avoid re-evaluation per row

-- Drop the existing problematic policies
DROP POLICY
IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY
IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY
IF EXISTS "Users can insert own profile" ON public.profiles;

-- Recreate the policies with optimized auth.uid() usage
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR
SELECT USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR
UPDATE USING ((SELECT auth.uid()
) = id)
    WITH CHECK
((SELECT auth.uid())
= id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR
INSERT WITH CHECK
    ((SELECT auth.uid()
)
= id);
