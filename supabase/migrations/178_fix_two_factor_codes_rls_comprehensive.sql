-- Comprehensive fix for two_factor_codes RLS policies
-- This migration ensures 2FA codes can be created during the authentication flow

-- First, drop ALL existing policies to start fresh
DROP POLICY
IF EXISTS "Users can view their own 2FA codes" ON two_factor_codes;
DROP POLICY
IF EXISTS "Users can create their own 2FA codes" ON two_factor_codes;
DROP POLICY
IF EXISTS "Users can update their own 2FA codes" ON two_factor_codes;
DROP POLICY
IF EXISTS "Service role can access all 2FA codes" ON two_factor_codes;
DROP POLICY
IF EXISTS "Authenticated users can create 2FA codes" ON two_factor_codes;
DROP POLICY
IF EXISTS "Anonymous users can create 2FA codes during sign-in" ON two_factor_codes;

-- Create comprehensive policies that allow 2FA code creation during authentication
-- 1. Allow anyone to create 2FA codes (needed during sign-in flow)
CREATE POLICY "Allow 2FA code creation during authentication" ON two_factor_codes
    FOR
INSERT WITH CHECK
    (true)
;

-- 2. Allow users to view their own 2FA codes
CREATE POLICY "Users can view their own 2FA codes" ON two_factor_codes
    FOR
SELECT USING (auth.uid() = user_id);

-- 3. Allow users to update their own 2FA codes (for marking as used)
CREATE POLICY "Users can update their own 2FA codes" ON two_factor_codes
    FOR
UPDATE USING (auth.uid()
= user_id);

-- 4. Service role can access all codes (for cleanup and admin operations)
CREATE POLICY "Service role can access all 2FA codes" ON two_factor_codes
    FOR ALL USING
(auth.role
() = 'service_role');

-- 5. Allow authenticated users to view all codes (for debugging - can be removed in production)
CREATE POLICY "Authenticated users can view 2FA codes" ON two_factor_codes
    FOR
SELECT USING (auth.role() = 'authenticated');
