-- Fix admin access to transactions table - allow admins to insert transactions for other users
-- This is needed for bet resolution when match results are created

-- Drop any existing policies that might conflict
DROP POLICY
IF EXISTS "Service role can insert transactions" ON public.transactions;
DROP POLICY
IF EXISTS "Users can insert their own transactions" ON public.transactions;
DROP POLICY
IF EXISTS "Transactions insert policy" ON public.transactions;

-- Create comprehensive admin policy for ALL operations
CREATE POLICY "Admins can manage transactions" ON public.transactions
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
