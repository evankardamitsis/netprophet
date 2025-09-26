-- Fix find_matching_players function to remove created_at reference
-- The players table doesn't have a created_at column

-- Drop and recreate the function without created_at
DROP FUNCTION IF EXISTS find_matching_players
(TEXT, TEXT);

CREATE FUNCTION find_matching_players(
    search_name TEXT,
    search_surname TEXT
)
RETURNS TABLE
(
    id UUID,
    first_name TEXT,
    last_name TEXT,
    is_hidden BOOLEAN,
    is_active BOOLEAN,
    claimed_by_user_id UUID,
    is_demo_player BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.first_name,
        p.last_name,
        p.is_hidden,
        p.is_active,
        p.claimed_by_user_id,
        p.is_demo_player
    FROM players p
    WHERE 
        LOWER(p.first_name) = LOWER(search_name)
        AND LOWER(p.last_name) = LOWER(search_surname)
        AND p.is_hidden = true
        AND p.claimed_by_user_id IS NULL
        AND p.is_demo_player = false
    -- Exclude demo players from matching
    ORDER BY p.first_name, p.last_name;
-- Order by name instead of created_at
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
