-- Fix admin access to all tournament-related tables - ensure admins have full access
-- This covers tournaments, tournament_categories, and tournament_participants

-- Fix tournament_categories table
DROP POLICY
IF EXISTS "Admins can manage tournament categories" ON public.tournament_categories;
DROP POLICY
IF EXISTS "Everyone can view tournament categories" ON public.tournament_categories;
DROP POLICY
IF EXISTS "Tournament categories access policy" ON public.tournament_categories;

CREATE POLICY "Admins can manage tournament categories" ON public.tournament_categories
    FOR ALL USING
(
        EXISTS
(
            SELECT 1
FROM public.profiles
WHERE profiles.id = (SELECT auth.uid())
    AND profiles.is_admin = true
        )
) WITH CHECK
(
        EXISTS
(
            SELECT 1
FROM public.profiles
WHERE profiles.id = (SELECT auth.uid())
    AND profiles.is_admin = true
        )
);

CREATE POLICY "Everyone can view tournament categories" ON public.tournament_categories
    FOR
SELECT USING (true);

-- Fix tournament_participants table
DROP POLICY
IF EXISTS "Admins can manage tournament participants" ON public.tournament_participants;
DROP POLICY
IF EXISTS "Everyone can view tournament participants" ON public.tournament_participants;
DROP POLICY
IF EXISTS "Tournament participants access policy" ON public.tournament_participants;

CREATE POLICY "Admins can manage tournament participants" ON public.tournament_participants
    FOR ALL USING
(
        EXISTS
(
            SELECT 1
FROM public.profiles
WHERE profiles.id = (SELECT auth.uid())
    AND profiles.is_admin = true
        )
) WITH CHECK
(
        EXISTS
(
            SELECT 1
FROM public.profiles
WHERE profiles.id = (SELECT auth.uid())
    AND profiles.is_admin = true
        )
);

CREATE POLICY "Everyone can view tournament participants" ON public.tournament_participants
    FOR
SELECT USING (true);
