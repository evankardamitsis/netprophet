-- Fix player lookup case sensitivity and ensure proper Greeklish handling
-- This migration addresses the specific issue where "Evangelos Kardamitsis" doesn't match "ΚΑΡΔΑΜΙΤΣΗΣ ΕΥΑΓΓΕΛΟΣ"

-- First, let's check if we have the enhanced functions from the previous migration
-- If not, we'll recreate them with better case handling

-- Enhanced transliteration function with better case handling
CREATE OR REPLACE FUNCTION transliterate_greeklish_to_greek(greeklish_text TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    result := greeklish_text;
    
    -- Handle specific common names FIRST (before character-by-character replacement)
    -- These are the most common Greek names and their Greeklish variations
    result := replace(result, 'Evangelos', 'Ευάγγελος');
    result := replace(result, 'evangelos', 'ευάγγελος');
    result := replace(result, 'EVANGELOS', 'ΕΥΑΓΓΕΛΟΣ');
    result := replace(result, 'Vangelis', 'Βαγγέλης');
    result := replace(result, 'vangelis', 'βαγγέλης');
    result := replace(result, 'VANGELIS', 'ΒΑΓΓΕΛΗΣ');
    result := replace(result, 'Kardamitsis', 'Καρδαμίτσης');
    result := replace(result, 'kardamitsis', 'καρδαμίτσης');
    result := replace(result, 'KARDAMITSIS', 'ΚΑΡΔΑΜΙΤΣΗΣ');
    
    -- Handle other common Greek names with case variations
    result := replace(result, 'Dimitris', 'Δημήτρης');
    result := replace(result, 'dimitris', 'δημήτρης');
    result := replace(result, 'DIMITRIS', 'ΔΗΜΗΤΡΗΣ');
    result := replace(result, 'Dimitrios', 'Δημήτριος');
    result := replace(result, 'dimitrios', 'δημήτριος');
    result := replace(result, 'DIMITRIOS', 'ΔΗΜΗΤΡΙΟΣ');
    
    result := replace(result, 'Kostas', 'Κώστας');
    result := replace(result, 'kostas', 'κώστας');
    result := replace(result, 'KOSTAS', 'ΚΩΣΤΑΣ');
    result := replace(result, 'Konstantinos', 'Κωνσταντίνος');
    result := replace(result, 'konstantinos', 'κωνσταντίνος');
    result := replace(result, 'KONSTANTINOS', 'ΚΩΝΣΤΑΝΤΙΝΟΣ');
    
    result := replace(result, 'Giannis', 'Γιάννης');
    result := replace(result, 'giannis', 'γιάννης');
    result := replace(result, 'GIANNIS', 'ΓΙΑΝΝΗΣ');
    result := replace(result, 'Ioannis', 'Ιωάννης');
    result := replace(result, 'ioannis', 'ιωάννης');
    result := replace(result, 'IOANNIS', 'ΙΩΑΝΝΗΣ');
    
    result := replace(result, 'Nikos', 'Νίκος');
    result := replace(result, 'nikos', 'νίκος');
    result := replace(result, 'NIKOS', 'ΝΙΚΟΣ');
    result := replace(result, 'Nikolaos', 'Νικόλαος');
    result := replace(result, 'nikolaos', 'νικόλαος');
    result := replace(result, 'NIKOLAOS', 'ΝΙΚΟΛΑΟΣ');
    
    result := replace(result, 'Panagiotis', 'Παναγιώτης');
    result := replace(result, 'panagiotis', 'παναγιώτης');
    result := replace(result, 'PANAGIOTIS', 'ΠΑΝΑΓΙΩΤΗΣ');
    result := replace(result, 'Panos', 'Πάνος');
    result := replace(result, 'panos', 'πάνος');
    result := replace(result, 'PANOS', 'ΠΑΝΟΣ');
    
    result := replace(result, 'Stelios', 'Στέλιος');
    result := replace(result, 'stelios', 'στέλιος');
    result := replace(result, 'STELIOS', 'ΣΤΕΛΙΟΣ');
    
    result := replace(result, 'Christos', 'Χρήστος');
    result := replace(result, 'christos', 'χρήστος');
    result := replace(result, 'CHRISTOS', 'ΧΡΗΣΤΟΣ');
    
    -- Now handle character-by-character transliteration for remaining text
    -- Enhanced Greeklish to Greek transliterations with case handling
    
    -- Basic character mappings (lowercase)
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
    
    -- Handle common Greeklish variations
    result := replace(result, 'th', 'θ');
    result := replace(result, 'Th', 'Θ');
    result := replace(result, 'TH', 'Θ');
    result := replace(result, 'ps', 'ψ');
    result := replace(result, 'Ps', 'Ψ');
    result := replace(result, 'PS', 'Ψ');
    
    -- Handle double consonants that are common in Greeklish
    result := replace(result, 'gg', 'γγ');
    result := replace(result, 'kk', 'κκ');
    result := replace(result, 'll', 'λλ');
    result := replace(result, 'mm', 'μμ');
    result := replace(result, 'nn', 'νν');
    result := replace(result, 'pp', 'ππ');
    result := replace(result, 'rr', 'ρρ');
    result := replace(result, 'ss', 'σσ');
    result := replace(result, 'tt', 'ττ');
    
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Enhanced exact name matching function with better case handling
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
            -- Perfect exact match (case-insensitive)
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
            -- Direct match (case-insensitive)
            (LOWER(p.first_name) = LOWER(search_name) AND LOWER(p.last_name) = LOWER(search_surname))
            OR
            -- Greeklish to Greek transliteration match (case-insensitive)
            (LOWER(remove_greek_accents(p.first_name)) = LOWER(remove_greek_accents(transliterate_greeklish_to_greek(search_name))) 
                AND LOWER(remove_greek_accents(p.last_name)) = LOWER(remove_greek_accents(transliterate_greeklish_to_greek(search_surname))))
            OR
            -- Reverse: Greek to Greeklish match (case-insensitive)
            (LOWER(remove_greek_accents(transliterate_greeklish_to_greek(p.first_name))) = LOWER(remove_greek_accents(search_name)) 
                AND LOWER(remove_greek_accents(transliterate_greeklish_to_greek(p.last_name))) = LOWER(remove_greek_accents(search_surname)))
            OR
            -- Normalized name matching (handles nicknames and variations, case-insensitive)
            (normalize_greek_name(remove_greek_accents(p.first_name)) = normalize_greek_name(remove_greek_accents(search_name)) 
                AND normalize_greek_name(remove_greek_accents(p.last_name)) = normalize_greek_name(remove_greek_accents(search_surname)))
            OR
            -- Normalized transliterated name matching (case-insensitive)
            (normalize_greek_name(remove_greek_accents(p.first_name)) = normalize_greek_name(remove_greek_accents(transliterate_greeklish_to_greek(search_name))) 
                AND normalize_greek_name(remove_greek_accents(p.last_name)) = normalize_greek_name(remove_greek_accents(transliterate_greeklish_to_greek(search_surname))))
        )
        AND (p.is_hidden = true OR p.is_hidden IS NULL)
        AND p.claimed_by_user_id IS NULL
        AND (p.is_demo_player = false OR p.is_demo_player IS NULL)
    ORDER BY match_score DESC, p.first_name, p.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced surname matching function with better case handling
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
            -- Exact match (case-insensitive)
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
            -- Direct surname match (case-insensitive)
            LOWER(remove_greek_accents(p.last_name)) = LOWER(remove_greek_accents(search_surname))
            OR
            -- Greeklish to Greek transliteration match (case-insensitive)
            LOWER(remove_greek_accents(p.last_name)) = LOWER(remove_greek_accents(transliterate_greeklish_to_greek(search_surname)))
            OR
            -- Reverse: Greek to Greeklish match (case-insensitive)
            LOWER(remove_greek_accents(transliterate_greeklish_to_greek(p.last_name))) = LOWER(remove_greek_accents(search_surname))
        )
        AND (p.is_hidden = true OR p.is_hidden IS NULL)
        AND p.claimed_by_user_id IS NULL
        AND (p.is_demo_player = false OR p.is_demo_player IS NULL)
    ORDER BY match_score DESC, p.first_name, p.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the main find_matching_players function to include fuzzy matching
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
    exact_matches_count INTEGER;
    surname_matches_count INTEGER;
    fuzzy_matches_count INTEGER;
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
            -- If no surname matches, try fuzzy matching
            SELECT COUNT(*) INTO fuzzy_matches_count FROM find_similar_players(search_name, search_surname, 0.6);
            
            IF fuzzy_matches_count > 0 THEN
                -- Return fuzzy matches with high similarity
                RETURN QUERY 
                SELECT 
                    id, first_name, last_name, is_hidden, is_active, 
                    claimed_by_user_id, is_demo_player, match_score
                FROM find_similar_players(search_name, search_surname, 0.6)
                WHERE similarity_score >= 0.6;
            ELSE
                -- No matches found
                RETURN;
            END IF;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments to document the enhanced functions
COMMENT ON FUNCTION transliterate_greeklish_to_greek(TEXT) IS 'Enhanced transliteration function with comprehensive case handling for Greeklish to Greek conversion';
COMMENT ON FUNCTION find_exact_name_matches(TEXT, TEXT) IS 'Enhanced exact name matching with case-insensitive Greeklish support';
COMMENT ON FUNCTION find_players_by_surname(TEXT) IS 'Enhanced surname matching with case-insensitive Greeklish support';
COMMENT ON FUNCTION find_matching_players(TEXT, TEXT) IS 'Enhanced player matching with exact, surname-first, and fuzzy matching strategies, case-insensitive';
