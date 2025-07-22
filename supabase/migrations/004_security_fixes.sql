-- 004_security_fixes.sql
-- Security fixes for exposed views and RLS

-- 1. Drop the app_users view if it exists
DROP VIEW IF EXISTS app_users;

-- 2. Recreate the app_users view (replace with your actual columns as needed)
CREATE VIEW app_users
AS
    SELECT *
    FROM auth.users;

-- 3. Enable RLS on players
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- 4. Add a basic select policy for authenticated users
CREATE POLICY "Allow select for authenticated"
    ON players
    FOR
SELECT
    TO authenticated
USING
(true); 