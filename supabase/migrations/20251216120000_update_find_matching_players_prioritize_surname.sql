-- The lookup should base results primarily on the user's last name

-- Drop existing function to avoid return type mismatch issues
DROP FUNCTION IF EXISTS find_matching_players
(TEXT, TEXT);

CREATE OR REPLACE FUNCTION find_matching_players
(
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
    is_demo_player BOOLEAN,
    match_score INTEGER
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
        p.is_demo_player,
        NULL
    ::INTEGER AS match_score -- maintain existing column for compatibility
    FROM players p
    WHERE
    -- Prioritize last name matching (surname-first strategy)
    (
            -- Exact last name match (case-insensitive)
            LOWER
    (p.last_name) = LOWER
    (search_surname)
        OR
    -- Normalized last name match (accent-insensitive)
    (p.last_name_normalized IS NOT NULL AND p.last_name_normalized = LOWER
    (unaccent
    (search_surname)))
        )
        -- Then filter by first name if provided (optional secondary filter)
        AND
    (
            search_name IS NULL
        OR search_name = ''
        OR LOWER
    (p.first_name) = LOWER
    (search_name)
        OR
    (p.first_name_normalized IS NOT NULL AND p.first_name_normalized = LOWER
    (unaccent
    (search_name)))
        )
        -- Standard filters
        AND
    (p.is_hidden = false OR p.is_hidden IS NULL)
        AND p.claimed_by_user_id IS NULL
        AND
    (p.is_demo_player = false OR p.is_demo_player IS NULL)
    ORDER BY 
        -- Prioritize exact last name matches
        CASE WHEN LOWER
    (p.last_name) = LOWER
    (search_surname) THEN 1 ELSE 2
END
,
        -- Then by first name match if provided
        CASE 
            WHEN search_name IS NOT NULL AND search_name != '' AND LOWER
(p.first_name) = LOWER
(search_name) THEN 1 
            ELSE 2
END,
        p.first_name,
        p.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION find_matching_players
(TEXT, TEXT) IS 'Finds matching players prioritizing last name (surname) matching, with first name as optional secondary filter';
