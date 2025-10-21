-- Fix tournaments RLS policies to use the new admin function
-- Drop existing policies
DROP POLICY
IF EXISTS "Admins can manage tournaments" ON public.tournaments;
DROP POLICY
IF EXISTS "Admins can manage tournament categories" ON public.tournament_categories;
DROP POLICY
IF EXISTS "Admins can manage tournament participants" ON public.tournament_participants;

-- Recreate policies with the fixed admin function
CREATE POLICY "Admins can manage tournaments" ON public.tournaments
    FOR ALL USING
(check_admin_status
());

CREATE POLICY "Admins can manage tournament categories" ON public.tournament_categories
    FOR ALL USING
(check_admin_status
());

CREATE POLICY "Admins can manage tournament participants" ON public.tournament_participants
    FOR ALL USING
(check_admin_status
()); 