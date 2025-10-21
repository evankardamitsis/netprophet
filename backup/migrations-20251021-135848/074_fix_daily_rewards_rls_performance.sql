-- Fix RLS performance issues on daily_rewards table
-- Replace auth.uid() with (SELECT auth.uid()) to avoid re-evaluation per row

-- Drop the existing problematic policies
DROP POLICY
IF EXISTS "Users can view their own daily rewards" ON public.daily_rewards;
DROP POLICY
IF EXISTS "Users can insert their own daily rewards" ON public.daily_rewards;

-- Recreate the policies with optimized auth.uid() usage
CREATE POLICY "Users can view their own daily rewards" ON public.daily_rewards
    FOR
SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own daily rewards" ON public.daily_rewards
    FOR
INSERT WITH CHECK
    ((SELECT auth.uid()
)
= user_id);
