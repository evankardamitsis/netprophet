-- Fix RLS policies for transactions table
-- Drop existing policies if they exist and recreate them

DROP POLICY
IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY
IF EXISTS "Service role can insert transactions" ON transactions;
DROP POLICY
IF EXISTS "Service role can update transactions" ON transactions;

-- Recreate policies
CREATE POLICY "Users can view their own transactions" ON transactions
    FOR
SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert transactions" ON transactions
    FOR
INSERT WITH CHECK
    (true)
;

CREATE POLICY "Service role can update transactions" ON transactions
    FOR
UPDATE USING (true);
