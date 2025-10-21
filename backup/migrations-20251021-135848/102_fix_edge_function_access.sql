-- Fix Edge Function access to all required tables
-- Edge Functions run with service_role and need access to various tables

-- Add service role policy for profiles table (for updating balance and streak)
CREATE POLICY "Service role can access profiles" ON public.profiles
    FOR ALL USING
((SELECT auth.role())
= 'service_role')
    WITH CHECK
((SELECT auth.role())
= 'service_role');

-- Add service role policy for transactions table (for recording daily reward transactions)
CREATE POLICY "Service role can access transactions" ON public.transactions
    FOR ALL USING
((SELECT auth.role())
= 'service_role')
    WITH CHECK
((SELECT auth.role())
= 'service_role');

-- Add service role policy for matches table (in case other functions need it)
CREATE POLICY "Service role can access matches" ON public.matches
    FOR ALL USING
((SELECT auth.role())
= 'service_role')
    WITH CHECK
((SELECT auth.role())
= 'service_role');

-- Add service role policy for bets table (in case other functions need it)
CREATE POLICY "Service role can access bets" ON public.bets
    FOR ALL USING
((SELECT auth.role())
= 'service_role')
    WITH CHECK
((SELECT auth.role())
= 'service_role');

-- Add service role policy for match_results table (in case other functions need it)
CREATE POLICY "Service role can access match_results" ON public.match_results
    FOR ALL USING
((SELECT auth.role())
= 'service_role')
    WITH CHECK
((SELECT auth.role())
= 'service_role');

-- Add service role policy for notifications table (in case other functions need it)
CREATE POLICY "Service role can access notifications" ON public.notifications
    FOR ALL USING
((SELECT auth.role())
= 'service_role')
    WITH CHECK
((SELECT auth.role())
= 'service_role');

-- Add service role policy for players table (in case other functions need it)
CREATE POLICY "Service role can access players" ON public.players
    FOR ALL USING
((SELECT auth.role())
= 'service_role')
    WITH CHECK
((SELECT auth.role())
= 'service_role');
