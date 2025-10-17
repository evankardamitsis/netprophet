-- Enhance Greeklish lookup with comprehensive transliteration and fuzzy matching
-- This migration improves the player lookup system to handle more Greeklish variations

-- Enhanced transliteration function with more comprehensive mappings
CREATE OR REPLACE FUNCTION transliterate_greeklish_to_greek(greeklish_text TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    result := greeklish_text;
    
    -- Handle specific common names FIRST (before character-by-character replacement)
    -- These are the most common Greek names and their Greeklish variations
    result := replace(result, 'Evangelos', 'Ευάγγελος');
    result := replace(result, 'Vangelis', 'Βαγγέλης');
    result := replace(result, 'Kardamitsis', 'Καρδαμίτσης');
    result := replace(result, 'Kardamitsis', 'Καρδαμίτσης');
    
    -- Handle other common Greek names
    result := replace(result, 'Dimitris', 'Δημήτρης');
    result := replace(result, 'Dimitrios', 'Δημήτριος');
    result := replace(result, 'Kostas', 'Κώστας');
    result := replace(result, 'Konstantinos', 'Κωνσταντίνος');
    result := replace(result, 'Giannis', 'Γιάννης');
    result := replace(result, 'Ioannis', 'Ιωάννης');
    result := replace(result, 'Nikos', 'Νίκος');
    result := replace(result, 'Nikolaos', 'Νικόλαος');
    result := replace(result, 'Panagiotis', 'Παναγιώτης');
    result := replace(result, 'Panos', 'Πάνος');
    result := replace(result, 'Stelios', 'Στέλιος');
    result := replace(result, 'Christos', 'Χρήστος');
    result := replace(result, 'Maria', 'Μαρία');
    result := replace(result, 'Eleni', 'Ελένη');
    result := replace(result, 'Katerina', 'Κατερίνα');
    result := replace(result, 'Sofia', 'Σοφία');
    result := replace(result, 'Anna', 'Άννα');
    result := replace(result, 'Despina', 'Δέσποινα');
    
    -- Handle common surname variations
    result := replace(result, 'Papadopoulos', 'Παπαδόπουλος');
    result := replace(result, 'Papadopoulou', 'Παπαδοπούλου');
    result := replace(result, 'Georgiou', 'Γεωργίου');
    result := replace(result, 'Georgiadis', 'Γεωργιάδης');
    result := replace(result, 'Antoniou', 'Αντωνίου');
    result := replace(result, 'Antoniadis', 'Αντωνιάδης');
    result := replace(result, 'Nikolaou', 'Νικολάου');
    result := replace(result, 'Nikolaidis', 'Νικολαΐδης');
    result := replace(result, 'Kostopoulos', 'Κωστόπουλος');
    result := replace(result, 'Kostopoulou', 'Κωστοπούλου');
    result := replace(result, 'Vasileiou', 'Βασιλείου');
    result := replace(result, 'Vasiliadis', 'Βασιλιάδης');
    result := replace(result, 'Petrou', 'Πέτρου');
    result := replace(result, 'Petridis', 'Πετρίδης');
    result := replace(result, 'Makris', 'Μάκρης');
    result := replace(result, 'Makri', 'Μάκρη');
    result := replace(result, 'Karagiannis', 'Καραγιάννης');
    result := replace(result, 'Karagianni', 'Καραγιάννη');
    result := replace(result, 'Tsipras', 'Τσίπρας');
    result := replace(result, 'Tsipra', 'Τσίπρα');
    result := replace(result, 'Mitsotakis', 'Μητσοτάκης');
    result := replace(result, 'Mitsotaki', 'Μητσοτάκη');
    
    -- Now handle character-by-character transliteration for remaining text
    -- Enhanced Greeklish to Greek transliterations with more variations
    
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

-- Create a function for fuzzy matching based on similarity
CREATE OR REPLACE FUNCTION find_similar_players(
    search_name TEXT,
    search_surname TEXT,
    similarity_threshold REAL DEFAULT 0.6
)
RETURNS TABLE (
    id UUID,
    first_name TEXT,
    last_name TEXT,
    is_hidden BOOLEAN,
    is_active BOOLEAN,
    claimed_by_user_id UUID,
    is_demo_player BOOLEAN,
    match_score INTEGER,
    similarity_score REAL
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
        -- Calculate match score based on similarity
        CASE 
            WHEN similarity(p.first_name, search_name) >= 0.9 AND similarity(p.last_name, search_surname) >= 0.9 THEN 95
            WHEN similarity(p.first_name, search_name) >= 0.8 AND similarity(p.last_name, search_surname) >= 0.8 THEN 85
            WHEN similarity(p.first_name, search_name) >= 0.7 AND similarity(p.last_name, search_surname) >= 0.7 THEN 75
            WHEN similarity(p.first_name, search_name) >= 0.6 AND similarity(p.last_name, search_surname) >= 0.6 THEN 65
            ELSE 50
        END as match_score,
        -- Calculate overall similarity score
        (similarity(p.first_name, search_name) + similarity(p.last_name, search_surname)) / 2 as similarity_score
    FROM players p
    WHERE 
        (
            -- Similarity matching for both names
            (similarity(p.first_name, search_name) >= similarity_threshold 
                AND similarity(p.last_name, search_surname) >= similarity_threshold)
            OR
            -- Similarity matching with transliteration
            (similarity(p.first_name, transliterate_greeklish_to_greek(search_name)) >= similarity_threshold 
                AND similarity(p.last_name, transliterate_greeklish_to_greek(search_surname)) >= similarity_threshold)
            OR
            -- Reverse similarity matching
            (similarity(transliterate_greeklish_to_greek(p.first_name), search_name) >= similarity_threshold 
                AND similarity(transliterate_greeklish_to_greek(p.last_name), search_surname) >= similarity_threshold)
        )
        AND (p.is_hidden = true OR p.is_hidden IS NULL)
        AND p.claimed_by_user_id IS NULL
        AND (p.is_demo_player = false OR p.is_demo_player IS NULL)
    ORDER BY similarity_score DESC, match_score DESC, p.first_name, p.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced main function that includes fuzzy matching as fallback
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
COMMENT ON FUNCTION transliterate_greeklish_to_greek(TEXT) IS 'Enhanced transliteration function with comprehensive Greeklish to Greek mappings including common names and surnames';
COMMENT ON FUNCTION find_similar_players(TEXT, TEXT, REAL) IS 'Finds players using fuzzy matching based on similarity scores';
COMMENT ON FUNCTION find_matching_players(TEXT, TEXT) IS 'Enhanced player matching with exact, surname-first, and fuzzy matching strategies';
