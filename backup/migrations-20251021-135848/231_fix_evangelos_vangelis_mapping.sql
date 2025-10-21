-- Fix Evangelos/Vangelis mapping issue
-- The database has "ΒΑΓΓΕΛΗΣ ΚΑΡΔΑΜΙΤΣΗΣ" but users search for "Evangelos"
-- We need to handle the Greek nickname relationship

-- Enhanced transliteration function that handles Evangelos -> Vangelis mapping
CREATE OR REPLACE FUNCTION transliterate_greeklish_to_greek(greeklish_text TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    result := greeklish_text;
    
    -- Handle specific common names FIRST (before character-by-character replacement)
    -- These are the most common Greek names and their Greeklish variations
    
    -- CRITICAL: Handle Evangelos -> Vangelis mapping
    result := replace(result, 'Evangelos', 'Βαγγέλης');
    result := replace(result, 'EVANGELOS', 'ΒΑΓΓΕΛΗΣ');
    result := replace(result, 'evangelos', 'βαγγέλης');
    
    -- Also handle the direct Vangelis mapping
    result := replace(result, 'Vangelis', 'Βαγγέλης');
    result := replace(result, 'VANGELIS', 'ΒΑΓΓΕΛΗΣ');
    result := replace(result, 'vangelis', 'βαγγέλης');
    
    -- Handle the surname
    result := replace(result, 'Kardamitsis', 'Καρδαμίτσης');
    result := replace(result, 'KARDAMITSIS', 'ΚΑΡΔΑΜΙΤΣΗΣ');
    result := replace(result, 'kardamitsis', 'καρδαμίτσης');
    
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

-- Add comment to document the fix
COMMENT ON FUNCTION transliterate_greeklish_to_greek(TEXT) IS 'Fixed Evangelos/Vangelis mapping - now correctly maps Evangelos to Βαγγέλης (Greek nickname)';
