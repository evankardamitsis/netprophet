-- Fix RLS policies for two_factor_codes table
-- The current policies are too restrictive for the 2FA flow

-- Drop existing restrictive policies
DROP POLICY
IF EXISTS "Users can view their own 2FA codes" ON two_factor_codes;
DROP POLICY
IF EXISTS "Users can create their own 2FA codes" ON two_factor_codes;
DROP POLICY
IF EXISTS "Users can update their own 2FA codes" ON two_factor_codes;
DROP POLICY
IF EXISTS "Service role can access all 2FA codes" ON two_factor_codes;

-- Create more permissive policies for 2FA flow
-- Allow authenticated users to create 2FA codes (needed during sign-in flow)
CREATE POLICY "Authenticated users can create 2FA codes" ON two_factor_codes
    FOR
INSERT WITH CHECK (auth.role() = 'authenticated')
;

-- Allow users to view their own 2FA codes
CREATE POLICY "Users can view their own 2FA codes" ON two_factor_codes
    FOR
SELECT USING (auth.uid() = user_id);

-- Allow users to update their own 2FA codes (for marking as used)
CREATE POLICY "Users can update their own 2FA codes" ON two_factor_codes
    FOR
UPDATE USING (auth.uid()
= user_id);

-- Service role can access all codes (for cleanup and admin operations)
CREATE POLICY "Service role can access all 2FA codes" ON two_factor_codes
    FOR ALL USING
(auth.role
() = 'service_role');

-- Allow anonymous users to create 2FA codes during the sign-in process
-- This is needed because the user might not be fully authenticated yet
CREATE POLICY "Anonymous users can create 2FA codes during sign-in" ON two_factor_codes
    FOR
INSERT WITH CHECK (auth.role() = 'anon')
;