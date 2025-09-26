-- Fix Greeklish transliteration to handle specific name cases
-- This migration improves the transliteration function to handle common Greek names

-- Create an improved function to transliterate Greeklish to Greek
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
    result := replace(result, 'Stelios', 'Στέλιος');
    result := replace(result, 'Christos', 'Χρήστος');
    result := replace(result, 'Maria', 'Μαρία');
    result := replace(result, 'Eleni', 'Ελένη');
    result := replace(result, 'Katerina', 'Κατερίνα');
    result := replace(result, 'Sofia', 'Σοφία');
    result := replace(result, 'Anna', 'Άννα');
    result := replace(result, 'Despina', 'Δέσποινα');
    
    -- Now handle character-by-character transliteration for remaining text
    -- Common Greeklish to Greek transliterations
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

-- Add comment to document the improvement
COMMENT ON FUNCTION transliterate_greeklish_to_greek(TEXT) IS 'Improved transliteration function that handles specific Greek names before character-by-character replacement';
