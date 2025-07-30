-- 011_players_rls_admins.sql
-- Allow only admins (profiles.is_admin = true) to select from players

DROP POLICY
IF EXISTS "Allow select for authenticated" ON players;
DROP POLICY
IF EXISTS "Allow select for admins only" ON players;

CREATE POLICY "Allow select for admins only"
  ON players
  FOR
SELECT
    TO authenticated
USING
(
    EXISTS
(
      SELECT 1
FROM profiles
WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
    )
); 