-- Production-ready RLS policies for profiles table
-- First, enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY
IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY
IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY
IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY
IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY
IF EXISTS "Admins can insert profiles" ON profiles;

-- Create secure policies
-- Users can view their own profile
CREATE POLICY "Users can view their own profile" ON profiles
    FOR
SELECT USING (auth.uid() = id);

-- Users can update their own profile (except is_admin field)
CREATE POLICY "Users can update their own profile" ON profiles
    FOR
UPDATE USING (auth.uid()
= id)
    WITH CHECK
(auth.uid
() = id);

-- Admins can view all profiles (using a function to avoid circular dependency)
CREATE OR REPLACE FUNCTION is_admin_user
()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS
    (
        SELECT 1
    FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR
SELECT USING (is_admin_user());

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles" ON profiles
    FOR
UPDATE USING (is_admin_user()
)
    WITH CHECK
(is_admin_user
());

-- Admins can insert profiles
CREATE POLICY "Admins can insert profiles" ON profiles
    FOR
INSERT WITH CHECK (is_admin_user())
;

-- Allow users to insert their own profile during signup
CREATE POLICY "Users can insert own profile" ON profiles
    FOR
INSERT WITH CHECK (auth.uid() =
id); 