-- Implement surname-first matching strategy
-- This migration creates functions to match players by surname first, then handle first name variations

-- Create a function to find players by surname only
CREATE OR REPLACE FUNCTION find_players_by_surname(search_surname TEXT)
RETURNS TABLE (
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
        (
            -- Direct surname match
            LOWER(p.last_name) = LOWER(search_surname)
            OR
            -- Greeklish to Greek transliteration match
            LOWER(p.last_name) = LOWER(transliterate_greeklish_to_greek(search_surname))
            OR
            -- Reverse: Greek to Greeklish match
            LOWER(transliterate_greeklish_to_greek(p.last_name)) = LOWER(search_surname)
        )
        AND (p.is_hidden = true OR p.is_hidden IS NULL)
        AND p.claimed_by_user_id IS NULL
        AND (p.is_demo_player = false OR p.is_demo_player IS NULL)
    ORDER BY p.first_name, p.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to find exact name matches (for when we have multiple surname matches)
CREATE OR REPLACE FUNCTION find_exact_name_matches(
    search_name TEXT,
    search_surname TEXT
)
RETURNS TABLE (
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
        (
            -- Direct match
            (LOWER(p.first_name) = LOWER(search_name) AND LOWER(p.last_name) = LOWER(search_surname))
            OR
            -- Greeklish to Greek transliteration match
            (LOWER(p.first_name) = LOWER(transliterate_greeklish_to_greek(search_name)) AND LOWER(p.last_name) = LOWER(transliterate_greeklish_to_greek(search_surname)))
            OR
            -- Reverse: Greek to Greeklish match
            (LOWER(transliterate_greeklish_to_greek(p.first_name)) = LOWER(search_name) AND LOWER(transliterate_greeklish_to_greek(p.last_name)) = LOWER(search_surname))
            OR
            -- Normalized name matching (handles nicknames and variations)
            (normalize_greek_name(p.first_name) = normalize_greek_name(search_name) AND normalize_greek_name(p.last_name) = normalize_greek_name(search_surname))
            OR
            -- Normalized transliterated name matching
            (normalize_greek_name(p.first_name) = normalize_greek_name(transliterate_greeklish_to_greek(search_name)) AND normalize_greek_name(p.last_name) = normalize_greek_name(transliterate_greeklish_to_greek(search_surname)))
        )
        AND (p.is_hidden = true OR p.is_hidden IS NULL)
        AND p.claimed_by_user_id IS NULL
        AND (p.is_demo_player = false OR p.is_demo_player IS NULL)
    ORDER BY p.first_name, p.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the main find_matching_players function to use surname-first strategy
CREATE OR REPLACE FUNCTION find_matching_players(
    search_name TEXT,
    search_surname TEXT
)
RETURNS TABLE (
    id UUID,
    first_name TEXT,
    last_name TEXT,
    is_hidden BOOLEAN,
    is_active BOOLEAN,
    claimed_by_user_id UUID,
    is_demo_player BOOLEAN
) AS $$
DECLARE
    surname_matches_count INTEGER;
    exact_matches_count INTEGER;
BEGIN
    -- First, try exact name matching
    SELECT COUNT(*) INTO exact_matches_count FROM find_exact_name_matches(search_name, search_surname);
    
    IF exact_matches_count > 0 THEN
        -- Return exact matches
        RETURN QUERY SELECT * FROM find_exact_name_matches(search_name, search_surname);
    ELSE
        -- If no exact matches, try surname-only matching
        SELECT COUNT(*) INTO surname_matches_count FROM find_players_by_surname(search_surname);
        
        IF surname_matches_count > 0 THEN
            -- Return surname matches for user to choose from
            RETURN QUERY SELECT * FROM find_players_by_surname(search_surname);
        ELSE
            -- No matches found
            RETURN;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments to document these functions
COMMENT ON FUNCTION find_players_by_surname(TEXT) IS 'Finds players by surname only for surname-first matching strategy';
COMMENT ON FUNCTION find_exact_name_matches(TEXT, TEXT) IS 'Finds exact name matches for precise matching';
COMMENT ON FUNCTION find_matching_players(TEXT, TEXT) IS 'Enhanced player matching with surname-first strategy';
