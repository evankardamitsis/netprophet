-- Fix RLS performance issues on bets table
-- Replace auth.uid() with (SELECT auth.uid()) to avoid re-evaluation per row

-- Drop the existing problematic policies
DROP POLICY
IF EXISTS "Users can view their own bets" ON public.bets;
DROP POLICY
IF EXISTS "Users can insert their own bets" ON public.bets;
DROP POLICY
IF EXISTS "Users can update their own bets" ON public.bets;
DROP POLICY
IF EXISTS "Admins can view all bets" ON public.bets;

-- Recreate the policies with optimized auth.uid() usage
CREATE POLICY "Users can view their own bets" ON public.bets
    FOR
SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own bets" ON public.bets
    FOR
INSERT WITH CHECK
    ((SELECT auth.uid()
)
= user_id);

CREATE POLICY "Users can update their own bets" ON public.bets
    FOR
UPDATE USING ((SELECT auth.uid()
) = user_id);

CREATE POLICY "Admins can view all bets" ON public.bets
    FOR ALL USING
(
        EXISTS
(
            SELECT 1
FROM public.profiles
WHERE id = (SELECT auth.uid())
    AND is_admin = true
        )
);
