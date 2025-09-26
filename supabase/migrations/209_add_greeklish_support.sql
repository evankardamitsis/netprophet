-- Add Greeklish to Greek transliteration support for player matching
-- This migration adds functions to handle Greeklish names in player lookup

-- Create a function to transliterate Greeklish to Greek
CREATE OR REPLACE FUNCTION transliterate_greeklish_to_greek(greeklish_text TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    result := greeklish_text;
    
    -- Handle specific common names FIRST (before character-by-character replacement)
    result := replace(result, 'Evangelos', 'Ευάγγελος');
    result := replace(result, 'Vangelis', 'Βαγγέλης');
    result := replace(result, 'Kardamitsis', 'Καρδαμίτσης');
    result := replace(result, 'Kardamitsis', 'Καρδαμίτσης');
    
    -- Common Greeklish to Greek transliterations (only if not already replaced)
    result := replace(result, 'a', 'α');
    result := replace(result, 'b', 'β');
    result := replace(result, 'g', 'γ');
    result := replace(result, 'd', 'δ');
    result := replace(result, 'e', 'ε');
    result := replace(result, 'z', 'ζ');
    result := replace(result, 'h', 'η');
    result := replace(result, 'i', 'ι');
    result := replace(result, 'k', 'κ');
    result := replace(result, 'l', 'λ');
    result := replace(result, 'm', 'μ');
    result := replace(result, 'n', 'ν');
    result := replace(result, 'x', 'ξ');
    result := replace(result, 'o', 'ο');
    result := replace(result, 'p', 'π');
    result := replace(result, 'r', 'ρ');
    result := replace(result, 's', 'σ');
    result := replace(result, 't', 'τ');
    result := replace(result, 'y', 'υ');
    result := replace(result, 'f', 'φ');
    result := replace(result, 'c', 'χ');
    result := replace(result, 'w', 'ω');
    
    -- Handle capital letters
    result := replace(result, 'A', 'Α');
    result := replace(result, 'B', 'Β');
    result := replace(result, 'G', 'Γ');
    result := replace(result, 'D', 'Δ');
    result := replace(result, 'E', 'Ε');
    result := replace(result, 'Z', 'Ζ');
    result := replace(result, 'H', 'Η');
    result := replace(result, 'I', 'Ι');
    result := replace(result, 'K', 'Κ');
    result := replace(result, 'L', 'Λ');
    result := replace(result, 'M', 'Μ');
    result := replace(result, 'N', 'Ν');
    result := replace(result, 'X', 'Ξ');
    result := replace(result, 'O', 'Ο');
    result := replace(result, 'P', 'Π');
    result := replace(result, 'R', 'Ρ');
    result := replace(result, 'S', 'Σ');
    result := replace(result, 'T', 'Τ');
    result := replace(result, 'Y', 'Υ');
    result := replace(result, 'F', 'Φ');
    result := replace(result, 'C', 'Χ');
    result := replace(result, 'W', 'Ω');
    
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update the find_matching_players function to support Greeklish
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
        )
        AND (p.is_hidden = true OR p.is_hidden IS NULL)
        AND p.claimed_by_user_id IS NULL
        AND (p.is_demo_player = false OR p.is_demo_player IS NULL)
    ORDER BY p.first_name, p.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments to document these functions
COMMENT ON FUNCTION transliterate_greeklish_to_greek(TEXT) IS 'Transliterates Greeklish text to Greek characters';
COMMENT ON FUNCTION find_matching_players(TEXT, TEXT) IS 'Finds matching players with Greeklish to Greek transliteration support';
