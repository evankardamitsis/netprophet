-- Fix bet resolution player comparison logic
CREATE OR REPLACE FUNCTION determine_bet_outcome(prediction JSONB, match_result RECORD)
RETURNS TEXT AS $$
DECLARE
    prediction_type TEXT;
    predicted_winner TEXT;
    actual_winner TEXT;
    predicted_result TEXT;
    actual_result TEXT;
    is_correct BOOLEAN := false;
    prediction_text TEXT;
    player_id_from_name UUID;
BEGIN
    -- Handle both string and JSONB predictions
    -- If prediction is a string (old format), try to parse it
    IF jsonb_typeof(prediction) = 'string' THEN
        prediction_text := prediction::TEXT;
        -- Try to extract winner from string like "Winner: Player Name | Result: 2-0"
        IF prediction_text LIKE '%Winner:%' THEN
            predicted_winner := substring(prediction_text from 'Winner: ([^|]+)');
            predicted_winner := trim(predicted_winner);

            -- Convert player name to UUID by looking up in players table
            SELECT id INTO player_id_from_name
            FROM players
            WHERE CONCAT(first_name, ' ', last_name) = predicted_winner
            LIMIT 1;
            
            -- Check if lookup was successful and compare
            is_correct := (player_id_from_name IS NOT NULL AND player_id_from_name = match_result.winner_id);
        ELSE
            -- Fallback: assume it's a winner prediction
            is_correct := false;
        END IF;
    ELSE
        -- JSONB format (new format)
        prediction_type := COALESCE(prediction->>'type', 'winner');
        
        -- Get actual winner
        actual_winner := match_result.winner_id::TEXT;
        actual_result := match_result.match_result;

        CASE prediction_type
            WHEN 'winner' THEN
                -- Simple winner prediction - convert name to UUID
                predicted_winner := prediction->>'winner';
                IF predicted_winner IS NOT NULL AND predicted_winner != '' THEN
                    -- Convert player name to UUID by looking up in players table
                    SELECT id INTO player_id_from_name
                    FROM players
                    WHERE CONCAT(first_name, ' ', last_name) = predicted_winner
                    LIMIT 1;
                    
                    -- Check if lookup was successful and compare
                    is_correct := (player_id_from_name IS NOT NULL AND player_id_from_name = match_result.winner_id);
                ELSE
                    is_correct := false;
                END IF;
                
            WHEN 'match_result' THEN
                -- Match result prediction (e.g., "2-1", "3-0")
                predicted_result := prediction->>'matchResult';
                is_correct := (predicted_result = actual_result);
                
            WHEN 'set_score' THEN
                -- Set score prediction - check both match result and set scores
                predicted_result := prediction->>'matchResult';
                IF predicted_result IS NOT NULL AND predicted_result != actual_result THEN
                    is_correct := false;
                ELSE
                    is_correct := check_set_score_prediction(prediction, match_result);
                END IF;
                
            WHEN 'set_winner' THEN
                -- Set winner prediction
                is_correct := check_set_winner_prediction(prediction, match_result);
                
            WHEN 'tiebreak' THEN
                -- Tiebreak prediction
                is_correct := check_tiebreak_prediction(prediction, match_result);
                
            WHEN 'super_tiebreak' THEN
                -- Super tiebreak prediction (for amateur format)
                is_correct := check_super_tiebreak_prediction(prediction, match_result);
                
            WHEN 'parlay' THEN
                -- Parlay bet - this is handled separately by the parlay trigger
                RETURN 'pending';
                
            ELSE
                -- Default to winner prediction - convert name to UUID
                predicted_winner := prediction->>'winner';
                IF predicted_winner IS NOT NULL AND predicted_winner != '' THEN
                    -- Convert player name to UUID by looking up in players table
                    SELECT id INTO player_id_from_name
                    FROM players
                    WHERE CONCAT(first_name, ' ', last_name) = predicted_winner
                    LIMIT 1;
                    
                    -- Check if lookup was successful and compare
                    is_correct := (player_id_from_name IS NOT NULL AND player_id_from_name = match_result.winner_id);
                ELSE
                    is_correct := false;
                END IF;
        END CASE;
    END IF;

    RETURN CASE WHEN is_correct THEN 'won' ELSE 'lost' END;
END;
$$ LANGUAGE plpgsql;

-- Add debugging function to help troubleshoot bet resolution issues
CREATE OR REPLACE FUNCTION debug_bet_resolution(match_id_param UUID)
RETURNS TABLE(
    bet_id UUID,
    user_id UUID,
    prediction_type TEXT,
    predicted_winner TEXT,
    actual_winner TEXT,
    player_lookup_result UUID,
    is_correct BOOLEAN,
    outcome TEXT
) AS $$
DECLARE
    bet_record RECORD;
    prediction_data JSONB;
    prediction_type TEXT;
    predicted_winner TEXT;
    actual_winner TEXT;
    player_id_from_name UUID;
    is_correct BOOLEAN;
    match_result_record RECORD;
BEGIN
    -- Get the match result
    SELECT * INTO match_result_record
    FROM match_results
    WHERE match_id = match_id_param
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE NOTICE 'No match result found for match %', match_id_param;
        RETURN;
    END IF;

    -- Process all bets for this match
    FOR bet_record IN
        SELECT * FROM bets
        WHERE match_id = match_id_param
    LOOP
        prediction_data := bet_record.prediction;
        prediction_type := COALESCE(prediction_data->>'type', 'winner');
        predicted_winner := prediction_data->>'winner';
        actual_winner := match_result_record.winner_id::TEXT;
        
        -- Try to convert predicted winner name to UUID
        IF predicted_winner IS NOT NULL AND predicted_winner != '' THEN
            SELECT id INTO player_id_from_name
            FROM players
            WHERE CONCAT(first_name, ' ', last_name) = predicted_winner
            LIMIT 1;
        ELSE
            player_id_from_name := NULL;
        END IF;
        
        -- Check if prediction is correct
        is_correct := (player_id_from_name IS NOT NULL AND player_id_from_name = match_result_record.winner_id);
        
        RETURN QUERY SELECT
            bet_record.id,
            bet_record.user_id,
            prediction_type,
            predicted_winner,
            actual_winner,
            player_id_from_name,
            is_correct,
            bet_record.outcome;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION determine_bet_outcome(JSONB, RECORD) TO authenticated;
GRANT EXECUTE ON FUNCTION debug_bet_resolution(UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION determine_bet_outcome(JSONB, RECORD) IS 'Determines if a bet prediction matches the actual match result with improved player name handling';
COMMENT ON FUNCTION debug_bet_resolution(UUID) IS 'Debug function to help troubleshoot bet resolution issues';
