-- Fix the recursive admin function that's causing stack depth errors
-- Drop the problematic function and recreate it properly

DROP FUNCTION IF EXISTS is_admin_user();

-- Create a simpler admin check function that doesn't cause recursion
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
    -- Direct check without recursion
    RETURN EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = auth.uid() 
        AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alternative: Create a more efficient admin check
CREATE OR REPLACE FUNCTION check_admin_status()
RETURNS BOOLEAN AS $$
DECLARE
    admin_status BOOLEAN;
BEGIN
    SELECT is_admin INTO admin_status
    FROM public.profiles
    WHERE id = auth.uid();
    
    RETURN COALESCE(admin_status, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the RLS policies to use the new function
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;

-- Recreate policies with the fixed function
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (check_admin_status());

CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE USING (check_admin_status())
    WITH CHECK (check_admin_status());

CREATE POLICY "Admins can insert profiles" ON profiles
    FOR INSERT WITH CHECK (check_admin_status());

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_admin_status() TO authenticated; 