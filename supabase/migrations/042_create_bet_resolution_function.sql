-- Create bet resolution function to automatically resolve bets when match results are added
CREATE OR REPLACE FUNCTION resolve_bets_for_match(match_id_param UUID)
RETURNS void AS $$
DECLARE
    match_result_record RECORD;
    bet_record RECORD;
    prediction_data JSONB;
    bet_outcome TEXT;
    winnings_amount INTEGER;
    user_profile RECORD;
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

    -- Process all active bets for this match
    FOR bet_record IN
        SELECT * FROM bets
        WHERE match_id = match_id_param
        AND status = 'active'
    LOOP
        prediction_data := bet_record.prediction;
        
        -- Determine bet outcome based on prediction type
        bet_outcome := determine_bet_outcome(prediction_data, match_result_record);
        
        -- Calculate winnings if bet is won
        IF bet_outcome = 'won' THEN
            winnings_amount := bet_record.potential_winnings;
        ELSE
            winnings_amount := 0;
        END IF;

        -- Update bet status
        UPDATE bets
        SET 
            status = bet_outcome,
            outcome = bet_outcome,
            resolved_at = NOW(),
            winnings_paid = winnings_amount
        WHERE id = bet_record.id;

        -- If bet is won, update user's wallet
        IF bet_outcome = 'won' AND winnings_amount > 0 THEN
            -- Get user profile
            SELECT * INTO user_profile
            FROM profiles
            WHERE id = bet_record.user_id;

            IF FOUND THEN
                -- Update user's balance and stats
                UPDATE profiles
                SET 
                    balance = balance + winnings_amount,
                    total_winnings = total_winnings + winnings_amount,
                    won_bets = won_bets + 1
                WHERE id = bet_record.user_id;

                -- Record transaction
                INSERT INTO transactions (
                    user_id,
                    type,
                    amount,
                    description
                ) VALUES (
                    bet_record.user_id,
                    'win',
                    winnings_amount,
                    'Bet winnings: ' || bet_record.description
                );
            END IF;
        ELSIF bet_outcome = 'lost' THEN
            -- Update lost bets count
            UPDATE profiles
            SET lost_bets = lost_bets + 1
            WHERE id = bet_record.user_id;
        END IF;

        -- Create notification for the user
        PERFORM create_bet_notification(
            bet_record.user_id,
            bet_record.id,
            bet_outcome,
            winnings_amount
        );

        RAISE NOTICE 'Resolved bet %: % (winnings: %)', bet_record.id, bet_outcome, winnings_amount;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to determine bet outcome based on prediction and actual result
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
                -- Set score prediction
                is_correct := check_set_score_prediction(prediction, match_result);
                
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

-- Helper function to check set score predictions
CREATE OR REPLACE FUNCTION check_set_score_prediction(prediction JSONB, match_result RECORD)
RETURNS BOOLEAN AS $$
DECLARE
    set_num INTEGER;
    predicted_score TEXT;
    actual_score TEXT;
BEGIN
    -- Check each set score prediction
    FOR set_num IN 1..5 LOOP
        predicted_score := prediction->>('set' || set_num || 'Score');
        actual_score := CASE set_num
            WHEN 1 THEN match_result.set1_score
            WHEN 2 THEN match_result.set2_score
            WHEN 3 THEN match_result.set3_score
            WHEN 4 THEN match_result.set4_score
            WHEN 5 THEN match_result.set5_score
        END;
        
        -- If there's a prediction for this set, check if it matches
        IF predicted_score IS NOT NULL AND predicted_score != '' THEN
            IF actual_score IS NULL OR actual_score != predicted_score THEN
                RETURN false;
            END IF;
        END IF;
    END LOOP;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Helper function to check set winner predictions
CREATE OR REPLACE FUNCTION check_set_winner_prediction(prediction JSONB, match_result RECORD)
RETURNS BOOLEAN AS $$
DECLARE
    set_num INTEGER;
    predicted_winner TEXT;
    actual_winner TEXT;
BEGIN
    -- Check each set winner prediction
    FOR set_num IN 1..5 LOOP
        predicted_winner := prediction->>('set' || set_num || 'Winner');
        actual_winner := CASE set_num
            WHEN 1 THEN match_result.set1_winner_id::TEXT
            WHEN 2 THEN match_result.set2_winner_id::TEXT
            WHEN 3 THEN match_result.set3_winner_id::TEXT
            WHEN 4 THEN match_result.set4_winner_id::TEXT
            WHEN 5 THEN match_result.set5_winner_id::TEXT
        END;
        
        -- If there's a prediction for this set, check if it matches
        IF predicted_winner IS NOT NULL AND predicted_winner != '' THEN
            IF actual_winner IS NULL OR actual_winner != predicted_winner THEN
                RETURN false;
            END IF;
        END IF;
    END LOOP;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Helper function to check tiebreak predictions
CREATE OR REPLACE FUNCTION check_tiebreak_prediction(prediction JSONB, match_result RECORD)
RETURNS BOOLEAN AS $$
DECLARE
    set_num INTEGER;
    predicted_tiebreak TEXT;
    actual_tiebreak TEXT;
BEGIN
    -- Check each set tiebreak prediction
    FOR set_num IN 1..5 LOOP
        predicted_tiebreak := prediction->>('set' || set_num || 'TieBreak');
        actual_tiebreak := CASE set_num
            WHEN 1 THEN match_result.set1_tiebreak_score
            WHEN 2 THEN match_result.set2_tiebreak_score
            WHEN 3 THEN match_result.set3_tiebreak_score
            WHEN 4 THEN match_result.set4_tiebreak_score
            WHEN 5 THEN match_result.set5_tiebreak_score
        END;
        
        -- If there's a prediction for this set, check if it matches
        IF predicted_tiebreak IS NOT NULL AND predicted_tiebreak != '' THEN
            IF predicted_tiebreak = 'yes' THEN
                -- Predicted tiebreak, check if there actually was one
                IF actual_tiebreak IS NULL OR actual_tiebreak = 'none' THEN
                    RETURN false;
                END IF;
            ELSIF predicted_tiebreak = 'no' THEN
                -- Predicted no tiebreak, check if there wasn't one
                IF actual_tiebreak IS NOT NULL AND actual_tiebreak != 'none' THEN
                    RETURN false;
                END IF;
            END IF;
        END IF;
    END LOOP;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Helper function to check super tiebreak predictions
CREATE OR REPLACE FUNCTION check_super_tiebreak_prediction(prediction JSONB, match_result RECORD)
RETURNS BOOLEAN AS $$
DECLARE
    predicted_super_tiebreak TEXT;
    predicted_super_tiebreak_score TEXT;
    predicted_super_tiebreak_winner TEXT;
    actual_super_tiebreak_score TEXT;
    actual_super_tiebreak_winner TEXT;
BEGIN
    predicted_super_tiebreak := prediction->>'superTieBreak';
    predicted_super_tiebreak_score := prediction->>'superTieBreakScore';
    predicted_super_tiebreak_winner := prediction->>'superTieBreakWinner';
    actual_super_tiebreak_score := match_result.super_tiebreak_score;
    actual_super_tiebreak_winner := match_result.super_tiebreak_winner_id::TEXT;
    
    -- Check if super tiebreak was predicted
    IF predicted_super_tiebreak IS NOT NULL AND predicted_super_tiebreak != '' THEN
        IF predicted_super_tiebreak = 'yes' THEN
            -- Predicted super tiebreak, check if there actually was one
            IF actual_super_tiebreak_score IS NULL OR actual_super_tiebreak_score = 'none' THEN
                RETURN false;
            END IF;
            
            -- Check super tiebreak score if predicted
            IF predicted_super_tiebreak_score IS NOT NULL AND predicted_super_tiebreak_score != '' THEN
                IF actual_super_tiebreak_score != predicted_super_tiebreak_score THEN
                    RETURN false;
                END IF;
            END IF;
            
            -- Check super tiebreak winner if predicted
            IF predicted_super_tiebreak_winner IS NOT NULL AND predicted_super_tiebreak_winner != '' THEN
                IF actual_super_tiebreak_winner != predicted_super_tiebreak_winner THEN
                    RETURN false;
                END IF;
            END IF;
        ELSIF predicted_super_tiebreak = 'no' THEN
            -- Predicted no super tiebreak, check if there wasn't one
            IF actual_super_tiebreak_score IS NOT NULL AND actual_super_tiebreak_score != 'none' THEN
                RETURN false;
            END IF;
        END IF;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically resolve bets when match results are added
CREATE OR REPLACE FUNCTION trigger_resolve_bets()
RETURNS TRIGGER AS $$
BEGIN
    -- Resolve bets for the match when a result is added
    PERFORM resolve_bets_for_match(NEW.match_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_resolve_bets_on_match_result ON match_results;
CREATE TRIGGER trigger_resolve_bets_on_match_result
    AFTER INSERT OR UPDATE ON match_results
    FOR EACH ROW
    EXECUTE FUNCTION trigger_resolve_bets();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION resolve_bets_for_match(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION determine_bet_outcome(JSONB, RECORD) TO authenticated;
GRANT EXECUTE ON FUNCTION check_set_score_prediction(JSONB, RECORD) TO authenticated;
GRANT EXECUTE ON FUNCTION check_set_winner_prediction(JSONB, RECORD) TO authenticated;
GRANT EXECUTE ON FUNCTION check_tiebreak_prediction(JSONB, RECORD) TO authenticated;
GRANT EXECUTE ON FUNCTION check_super_tiebreak_prediction(JSONB, RECORD) TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_resolve_bets() TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION resolve_bets_for_match(UUID) IS 'Automatically resolves all active bets for a match when results are added';
COMMENT ON FUNCTION determine_bet_outcome(JSONB, RECORD) IS 'Determines if a bet prediction matches the actual match result';
COMMENT ON FUNCTION trigger_resolve_bets() IS 'Trigger function to automatically resolve bets when match results are added or updated';
