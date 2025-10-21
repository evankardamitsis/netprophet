-- Improve player matching with accent-insensitive and better surname-first matching
-- This migration enhances the find_matching_players function to handle Greek accents properly

-- Drop existing functions that we'll recreate with new signatures
DROP FUNCTION IF EXISTS find_matching_players(TEXT, TEXT);
DROP FUNCTION IF EXISTS find_exact_name_matches(TEXT, TEXT);
DROP FUNCTION IF EXISTS find_players_by_surname(TEXT);

-- Create a function to remove accents from Greek text
CREATE OR REPLACE FUNCTION remove_greek_accents(text_input TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    result := text_input;
    
    -- Remove Greek accents (tonos and dialytika)
    -- Lowercase vowels with accents
    result := translate(result, 'άέήίόύώΐΰ', 'αεηιουωιυ');
    
    -- Uppercase vowels with accents
    result := translate(result, 'ΆΈΉΊΌΎΏΪΫ', 'ΑΕΗΙΟΥΩΙΥ');
    
    -- Also normalize using NFD and remove combining diacritical marks
    result := regexp_replace(
        normalize(result, NFD),
        '[\u0300-\u036f]',
        '',
        'g'
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update the surname search function to be accent-insensitive
CREATE OR REPLACE FUNCTION find_players_by_surname(search_surname TEXT)
RETURNS TABLE (
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
        -- Calculate match score (higher is better)
        CASE 
            -- Exact match (case-insensitive, with accents)
            WHEN LOWER(p.last_name) = LOWER(search_surname) THEN 100
            -- Accent-insensitive match
            WHEN LOWER(remove_greek_accents(p.last_name)) = LOWER(remove_greek_accents(search_surname)) THEN 90
            -- Greeklish to Greek transliteration match
            WHEN LOWER(remove_greek_accents(p.last_name)) = LOWER(remove_greek_accents(transliterate_greeklish_to_greek(search_surname))) THEN 80
            -- Reverse: Greek to Greeklish match
            WHEN LOWER(remove_greek_accents(transliterate_greeklish_to_greek(p.last_name))) = LOWER(remove_greek_accents(search_surname)) THEN 70
            ELSE 50
        END as match_score
    FROM players p
    WHERE 
        (
            -- Direct surname match (accent-insensitive)
            LOWER(remove_greek_accents(p.last_name)) = LOWER(remove_greek_accents(search_surname))
            OR
            -- Greeklish to Greek transliteration match (accent-insensitive)
            LOWER(remove_greek_accents(p.last_name)) = LOWER(remove_greek_accents(transliterate_greeklish_to_greek(search_surname)))
            OR
            -- Reverse: Greek to Greeklish match (accent-insensitive)
            LOWER(remove_greek_accents(transliterate_greeklish_to_greek(p.last_name))) = LOWER(remove_greek_accents(search_surname))
        )
        AND (p.is_hidden = true OR p.is_hidden IS NULL)
        AND p.claimed_by_user_id IS NULL
        AND (p.is_demo_player = false OR p.is_demo_player IS NULL)
    ORDER BY match_score DESC, p.first_name, p.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update exact name matching function to be accent-insensitive
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
        -- Calculate match score (higher is better)
        CASE 
            -- Perfect exact match
            WHEN LOWER(p.first_name) = LOWER(search_name) AND LOWER(p.last_name) = LOWER(search_surname) THEN 100
            -- Accent-insensitive match
            WHEN LOWER(remove_greek_accents(p.first_name)) = LOWER(remove_greek_accents(search_name)) 
                AND LOWER(remove_greek_accents(p.last_name)) = LOWER(remove_greek_accents(search_surname)) THEN 95
            -- Greeklish to Greek transliteration match
            WHEN LOWER(remove_greek_accents(p.first_name)) = LOWER(remove_greek_accents(transliterate_greeklish_to_greek(search_name))) 
                AND LOWER(remove_greek_accents(p.last_name)) = LOWER(remove_greek_accents(transliterate_greeklish_to_greek(search_surname))) THEN 90
            -- Reverse: Greek to Greeklish match
            WHEN LOWER(remove_greek_accents(transliterate_greeklish_to_greek(p.first_name))) = LOWER(remove_greek_accents(search_name)) 
                AND LOWER(remove_greek_accents(transliterate_greeklish_to_greek(p.last_name))) = LOWER(remove_greek_accents(search_surname)) THEN 85
            -- Normalized name matching (handles nicknames and variations)
            WHEN normalize_greek_name(remove_greek_accents(p.first_name)) = normalize_greek_name(remove_greek_accents(search_name)) 
                AND normalize_greek_name(remove_greek_accents(p.last_name)) = normalize_greek_name(remove_greek_accents(search_surname)) THEN 80
            -- Normalized transliterated name matching
            WHEN normalize_greek_name(remove_greek_accents(p.first_name)) = normalize_greek_name(remove_greek_accents(transliterate_greeklish_to_greek(search_name))) 
                AND normalize_greek_name(remove_greek_accents(p.last_name)) = normalize_greek_name(remove_greek_accents(transliterate_greeklish_to_greek(search_surname))) THEN 75
            ELSE 50
        END as match_score
    FROM players p
    WHERE 
        (
            -- Direct match (accent-insensitive)
            (LOWER(remove_greek_accents(p.first_name)) = LOWER(remove_greek_accents(search_name)) 
                AND LOWER(remove_greek_accents(p.last_name)) = LOWER(remove_greek_accents(search_surname)))
            OR
            -- Greeklish to Greek transliteration match (accent-insensitive)
            (LOWER(remove_greek_accents(p.first_name)) = LOWER(remove_greek_accents(transliterate_greeklish_to_greek(search_name))) 
                AND LOWER(remove_greek_accents(p.last_name)) = LOWER(remove_greek_accents(transliterate_greeklish_to_greek(search_surname))))
            OR
            -- Reverse: Greek to Greeklish match (accent-insensitive)
            (LOWER(remove_greek_accents(transliterate_greeklish_to_greek(p.first_name))) = LOWER(remove_greek_accents(search_name)) 
                AND LOWER(remove_greek_accents(transliterate_greeklish_to_greek(p.last_name))) = LOWER(remove_greek_accents(search_surname)))
            OR
            -- Normalized name matching (handles nicknames and variations, accent-insensitive)
            (normalize_greek_name(remove_greek_accents(p.first_name)) = normalize_greek_name(remove_greek_accents(search_name)) 
                AND normalize_greek_name(remove_greek_accents(p.last_name)) = normalize_greek_name(remove_greek_accents(search_surname)))
            OR
            -- Normalized transliterated name matching (accent-insensitive)
            (normalize_greek_name(remove_greek_accents(p.first_name)) = normalize_greek_name(remove_greek_accents(transliterate_greeklish_to_greek(search_name))) 
                AND normalize_greek_name(remove_greek_accents(p.last_name)) = normalize_greek_name(remove_greek_accents(transliterate_greeklish_to_greek(search_surname))))
        )
        AND (p.is_hidden = true OR p.is_hidden IS NULL)
        AND p.claimed_by_user_id IS NULL
        AND (p.is_demo_player = false OR p.is_demo_player IS NULL)
    ORDER BY match_score DESC, p.first_name, p.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the main find_matching_players function to return ALL matches with scores
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
    is_demo_player BOOLEAN,
    match_score INTEGER
) AS $$
DECLARE
    surname_matches_count INTEGER;
    exact_matches_count INTEGER;
BEGIN
    -- First, try exact name matching
    SELECT COUNT(*) INTO exact_matches_count FROM find_exact_name_matches(search_name, search_surname);
    
    IF exact_matches_count > 0 THEN
        -- Return ALL exact matches sorted by score
        RETURN QUERY SELECT * FROM find_exact_name_matches(search_name, search_surname);
    ELSE
        -- If no exact matches, try surname-only matching
        SELECT COUNT(*) INTO surname_matches_count FROM find_players_by_surname(search_surname);
        
        IF surname_matches_count > 0 THEN
            -- Return ALL surname matches for user to choose from
            RETURN QUERY SELECT * FROM find_players_by_surname(search_surname);
        ELSE
            -- No matches found
            RETURN;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments to document these functions
COMMENT ON FUNCTION remove_greek_accents(TEXT) IS 'Removes Greek accents and diacritical marks for accent-insensitive matching';
COMMENT ON FUNCTION find_players_by_surname(TEXT) IS 'Finds ALL players by surname only with match scoring, accent-insensitive';
COMMENT ON FUNCTION find_exact_name_matches(TEXT, TEXT) IS 'Finds ALL exact name matches with match scoring, accent-insensitive';
COMMENT ON FUNCTION find_matching_players(TEXT, TEXT) IS 'Enhanced player matching returning ALL matches with surname-first strategy, accent-insensitive';

