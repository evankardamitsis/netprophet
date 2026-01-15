-- Add function to lookup player by slug
-- This function generates a slug from first_name + last_name and matches it
-- This is more efficient than fetching all players client-side

CREATE OR REPLACE FUNCTION get_player_by_slug(slug_param TEXT)
RETURNS SETOF players AS $$
DECLARE
    player_record RECORD;
    player_slug TEXT;
    greek_to_latin_map JSONB;
BEGIN
    -- Greek to Latin transliteration map
    greek_to_latin_map := '{
        "α":"a","β":"v","γ":"g","δ":"d","ε":"e","ζ":"z","η":"i","θ":"th",
        "ι":"i","κ":"k","λ":"l","μ":"m","ν":"n","ξ":"x","ο":"o","π":"p",
        "ρ":"r","σ":"s","ς":"s","τ":"t","υ":"y","φ":"f","χ":"ch","ψ":"ps","ω":"o",
        "Α":"a","Β":"v","Γ":"g","Δ":"d","Ε":"e","Ζ":"z","Η":"i","Θ":"th",
        "Ι":"i","Κ":"k","Λ":"l","Μ":"m","Ν":"n","Ξ":"x","Ο":"o","Π":"p",
        "Ρ":"r","Σ":"s","Τ":"t","Υ":"y","Φ":"f","Χ":"ch","Ψ":"ps","Ω":"o"
    }'::JSONB;

    -- Loop through all players and find matching slug
    FOR player_record IN
        SELECT p.*
        FROM players p
        WHERE p.first_name IS NOT NULL 
        AND p.last_name IS NOT NULL
        AND TRIM(p.first_name) != ''
        AND TRIM(p.last_name) != ''
    LOOP
        -- Generate slug from player name
        player_slug := LOWER(TRIM(player_record.first_name || ' ' || player_record.last_name));
        
        -- Normalize (remove diacritics)
        player_slug := translate(
            player_slug,
            'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ',
            'AAAAAAACEEEEIIIIDNOOOOOOUUUUYTHssaaaaaaaceeeeiiiidnoooooouuuuythy'
        );
        
        -- Convert Greek characters to Latin (basic approach)
        player_slug := REPLACE(player_slug, 'α', 'a');
        player_slug := REPLACE(player_slug, 'β', 'v');
        player_slug := REPLACE(player_slug, 'γ', 'g');
        player_slug := REPLACE(player_slug, 'δ', 'd');
        player_slug := REPLACE(player_slug, 'ε', 'e');
        player_slug := REPLACE(player_slug, 'ζ', 'z');
        player_slug := REPLACE(player_slug, 'η', 'i');
        player_slug := REPLACE(player_slug, 'θ', 'th');
        player_slug := REPLACE(player_slug, 'ι', 'i');
        player_slug := REPLACE(player_slug, 'κ', 'k');
        player_slug := REPLACE(player_slug, 'λ', 'l');
        player_slug := REPLACE(player_slug, 'μ', 'm');
        player_slug := REPLACE(player_slug, 'ν', 'n');
        player_slug := REPLACE(player_slug, 'ξ', 'x');
        player_slug := REPLACE(player_slug, 'ο', 'o');
        player_slug := REPLACE(player_slug, 'π', 'p');
        player_slug := REPLACE(player_slug, 'ρ', 'r');
        player_slug := REPLACE(player_slug, 'σ', 's');
        player_slug := REPLACE(player_slug, 'ς', 's');  -- Final sigma
        player_slug := REPLACE(player_slug, 'τ', 't');
        player_slug := REPLACE(player_slug, 'υ', 'y');
        player_slug := REPLACE(player_slug, 'φ', 'f');
        player_slug := REPLACE(player_slug, 'χ', 'ch');
        player_slug := REPLACE(player_slug, 'ψ', 'ps');
        player_slug := REPLACE(player_slug, 'ω', 'o');
        
        -- Uppercase Greek (convert to lowercase equivalents)
        player_slug := REPLACE(player_slug, 'Α', 'a');
        player_slug := REPLACE(player_slug, 'Β', 'v');
        player_slug := REPLACE(player_slug, 'Γ', 'g');
        player_slug := REPLACE(player_slug, 'Δ', 'd');
        player_slug := REPLACE(player_slug, 'Ε', 'e');
        player_slug := REPLACE(player_slug, 'Ζ', 'z');
        player_slug := REPLACE(player_slug, 'Η', 'i');
        player_slug := REPLACE(player_slug, 'Θ', 'th');
        player_slug := REPLACE(player_slug, 'Ι', 'i');
        player_slug := REPLACE(player_slug, 'Κ', 'k');
        player_slug := REPLACE(player_slug, 'Λ', 'l');
        player_slug := REPLACE(player_slug, 'Μ', 'm');
        player_slug := REPLACE(player_slug, 'Ν', 'n');
        player_slug := REPLACE(player_slug, 'Ξ', 'x');
        player_slug := REPLACE(player_slug, 'Ο', 'o');
        player_slug := REPLACE(player_slug, 'Π', 'p');
        player_slug := REPLACE(player_slug, 'Ρ', 'r');
        player_slug := REPLACE(player_slug, 'Σ', 's');  -- Uppercase sigma (converts to 's')
        player_slug := REPLACE(player_slug, 'Τ', 't');
        player_slug := REPLACE(player_slug, 'Υ', 'y');
        player_slug := REPLACE(player_slug, 'Φ', 'f');
        player_slug := REPLACE(player_slug, 'Χ', 'ch');
        player_slug := REPLACE(player_slug, 'Ψ', 'ps');
        player_slug := REPLACE(player_slug, 'Ω', 'o');
        
        -- Remove non-word characters (keep only word chars, spaces, hyphens)
        player_slug := REGEXP_REPLACE(player_slug, '[^\w\s-]', '', 'g');
        
        -- Convert spaces to hyphens
        player_slug := REGEXP_REPLACE(player_slug, '\s+', '-', 'g');
        
        -- Remove multiple consecutive hyphens
        player_slug := REGEXP_REPLACE(player_slug, '-+', '-', 'g');
        
        -- Remove leading/trailing hyphens and spaces
        player_slug := TRIM(BOTH '-' FROM player_slug);
        
        -- Compare with input slug (case-insensitive)
        IF LOWER(player_slug) = LOWER(slug_param) THEN
            RETURN QUERY SELECT * FROM players WHERE players.id = player_record.id;
            RETURN; -- Exit early once found
        END IF;
    END LOOP;
    
    -- If no match found, return empty result
    RETURN;
END;
$$ LANGUAGE plpgsql STABLE PARALLEL SAFE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_player_by_slug(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_player_by_slug(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_player_by_slug(TEXT) TO service_role;

COMMENT ON FUNCTION get_player_by_slug(TEXT) IS 'Finds a player by matching a slug generated from first_name + last_name. Returns player record if slug matches.';
