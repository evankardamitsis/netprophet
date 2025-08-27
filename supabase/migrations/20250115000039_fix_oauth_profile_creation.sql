-- Migration: Fix OAuth profile creation by updating RLS policies
-- The issue is that during OAuth signup, auth.uid() might not be available when the trigger runs

-- Drop the problematic policy that requires auth.uid() = id
DROP POLICY
IF EXISTS "Users can insert own profile" ON profiles;

-- Create a new policy that allows profile creation during signup
-- This policy allows insertion if the user is authenticated OR if it's a trigger function
CREATE POLICY "Allow profile creation during signup" ON profiles
    FOR
INSERT WITH CHECK (
        auth.uid() = id OR 
        current_setting('role') = 'service_role' OR
current_setting('role')
= 'postgres'
    );

-- Also ensure the trigger function can bypass RLS
CREATE POLICY "Allow trigger function to insert profiles" ON profiles
    FOR
INSERT WITH CHECK
    (true)
;
