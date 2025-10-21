-- Fix RLS performance issues on transactions table
-- Replace auth.uid() with (SELECT auth.uid()) to avoid re-evaluation per row

-- Drop the existing problematic policies
DROP POLICY
IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY
IF EXISTS "Users can insert their own transactions" ON public.transactions;

-- Recreate the policies with optimized auth.uid() usage
CREATE POLICY "Users can view their own transactions" ON public.transactions
    FOR
SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own transactions" ON public.transactions
    FOR
INSERT WITH CHECK
    ((SELECT auth.uid()
)
= user_id);
