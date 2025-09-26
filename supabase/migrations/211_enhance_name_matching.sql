-- Enhance name matching to handle Greek name variations and nicknames
-- This migration improves the find_matching_players function to handle common Greek name variations

-- Create a function to normalize Greek names for better matching
CREATE OR REPLACE FUNCTION normalize_greek_name(name_text TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    result := LOWER(TRIM(name_text));
    
    -- Handle common Greek name variations and nicknames
    -- Full names to nicknames
    result := replace(result, 'ευάγγελος', 'βαγγέλης');
    result := replace(result, 'evangelos', 'βαγγέλης');
    result := replace(result, 'vangelis', 'βαγγέλης');
    
    result := replace(result, 'δημήτριος', 'δημήτρης');
    result := replace(result, 'dimitrios', 'δημήτρης');
    result := replace(result, 'dimitris', 'δημήτρης');
    
    result := replace(result, 'κωνσταντίνος', 'κώστας');
    result := replace(result, 'konstantinos', 'κώστας');
    result := replace(result, 'kostas', 'κώστας');
    
    result := replace(result, 'ιωάννης', 'γιάννης');
    result := replace(result, 'ioannis', 'γιάννης');
    result := replace(result, 'giannis', 'γιάννης');
    
    result := replace(result, 'νικόλαος', 'νίκος');
    result := replace(result, 'nikolaos', 'νίκος');
    result := replace(result, 'nikos', 'νίκος');
    
    result := replace(result, 'παναγιώτης', 'πάνος');
    result := replace(result, 'panagiotis', 'πάνος');
    result := replace(result, 'panos', 'πάνος');
    
    result := replace(result, 'στέλιος', 'στέλιος');
    result := replace(result, 'stelios', 'στέλιος');
    
    result := replace(result, 'χρήστος', 'χρήστος');
    result := replace(result, 'christos', 'χρήστος');
    
    -- Handle surnames
    result := replace(result, 'καρδαμίτσης', 'καρδαμίτσης');
    result := replace(result, 'kardamitsis', 'καρδαμίτσης');
    
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update the find_matching_players function to use normalized names
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

-- Add comments to document these functions
COMMENT ON FUNCTION normalize_greek_name(TEXT) IS 'Normalizes Greek names to handle variations and nicknames for better matching';
COMMENT ON FUNCTION find_matching_players(TEXT, TEXT) IS 'Enhanced player matching with Greek name variations and transliteration support';
