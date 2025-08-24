-- Fix multiple permissive policies issue for INSERT on transactions table
-- Consolidate policies to avoid overlap for anon role

-- Drop the existing problematic policies
DROP POLICY
IF EXISTS "Service role can insert transactions" ON public.transactions;
DROP POLICY
IF EXISTS "Users can insert their own transactions" ON public.transactions;

-- Create a unified policy that handles both service role and user insert access
CREATE POLICY "Transactions insert policy" ON public.transactions
    FOR
INSERT WITH CHECK
    (
    -- Service role can insert any transaction
    (SELECT auth.role()
)
= 'service_role'
        OR
-- Users can insert their own transactions
((SELECT auth.uid())
= user_id)
    );
