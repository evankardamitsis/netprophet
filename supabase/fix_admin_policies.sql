-- Drop existing admin policies that have circular dependency
DROP POLICY
IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY
IF EXISTS "Admins can update all profiles" ON profiles;

-- Create simpler admin policies
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR
SELECT USING (
        auth.uid() = id OR
        (SELECT is_admin
        FROM profiles
        WHERE id = auth.uid())
    );

CREATE POLICY "Admins can update all profiles" ON profiles
    FOR
UPDATE USING (
        auth.uid()
= id OR
(SELECT is_admin
FROM profiles
WHERE id = auth.uid())
);

-- Also add INSERT policy for admins
CREATE POLICY "Admins can insert profiles" ON profiles
    FOR
INSERT WITH CHECK (
        auth.uid() =
id
OR
(SELECT is_admin
FROM profiles
WHERE id = auth.uid())
); 