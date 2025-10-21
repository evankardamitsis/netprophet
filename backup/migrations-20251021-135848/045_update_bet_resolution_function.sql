-- Update bet resolution function to handle both string and JSONB prediction formats
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
BEGIN
    -- Handle both string and JSONB predictions
    -- If prediction is a string (old format), try to parse it
    IF jsonb_typeof(prediction) = 'string' THEN
        prediction_text := prediction::TEXT;
        -- Try to extract winner from string like "Winner: Player Name | Result: 2-0"
        IF prediction_text LIKE '%Winner:%' THEN
            predicted_winner := substring(prediction_text from 'Winner: ([^|]+)');
            predicted_winner := trim(predicted_winner);
            is_correct := (predicted_winner = match_result.winner_id::TEXT);
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
                -- Simple winner prediction
                predicted_winner := prediction->>'winner';
                is_correct := (predicted_winner = actual_winner);
                
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
                -- Default to winner prediction
                predicted_winner := prediction->>'winner';
                is_correct := (predicted_winner = actual_winner);
        END CASE;
    END IF;

    RETURN CASE WHEN is_correct THEN 'won' ELSE 'lost' END;
END;
$$ LANGUAGE plpgsql;
