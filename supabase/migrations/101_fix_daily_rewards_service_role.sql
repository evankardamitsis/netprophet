-- Fix daily_rewards table to allow service role access
-- The Edge Function needs to access daily_rewards table but current policies only allow user access

-- Add policy for service role to access daily_rewards table
CREATE POLICY "Service role can access daily rewards" ON public.daily_rewards
    FOR ALL USING
((SELECT auth.role())
= 'service_role')
    WITH CHECK
((SELECT auth.role())
= 'service_role');

-- Also add policy for admins to access daily_rewards table
CREATE POLICY "Admins can access daily rewards" ON public.daily_rewards
    FOR ALL USING
(
        EXISTS
(
            SELECT 1
FROM public.profiles
WHERE id = (SELECT auth.uid())
    AND is_admin = true
        )
)
    WITH CHECK
(
        EXISTS
(
            SELECT 1
FROM public.profiles
WHERE id = (SELECT auth.uid())
    AND is_admin = true
        )
);
