-- Fix bet resolution: If user only predicts winner (no score) and winner is correct, bet should be WON
-- This migration fixes the determine_bet_outcome function to handle winner-only predictions correctly

-- Function to determine bet outcome based on prediction and match result
CREATE OR REPLACE FUNCTION determine_bet_outcome(
    prediction JSONB,
    match_result RECORD
)
RETURNS TEXT AS $$
DECLARE
    prediction_type TEXT;
    predicted_winner TEXT;
    predicted_winner_name TEXT;
    predicted_winner_id UUID;
    actual_winner UUID;
    actual_winner_team TEXT;
    predicted_result TEXT;
    actual_result TEXT;
    is_correct BOOLEAN := false;
    match_record RECORD;
    actual_team_a_name TEXT;
    actual_team_b_name TEXT;
    predicted_is_team_a BOOLEAN;
    predicted_is_team_b BOOLEAN;
    actual_is_team_a BOOLEAN;
    actual_is_team_b BOOLEAN;
    predicted_normalized TEXT;
    team_a_normalized TEXT;
    team_b_normalized TEXT;
    team_a_player1 TEXT;
    team_a_player2 TEXT;
    team_b_player1 TEXT;
    team_b_player2 TEXT;
BEGIN
    -- Get match details to check if doubles
    SELECT 
        m.match_type,
        m.player_a_id,
        m.player_b_id,
        m.player_a1_id,
        m.player_a2_id,
        m.player_b1_id,
        m.player_b2_id,
        TRIM(COALESCE(pa1.first_name || ' ' || pa1.last_name, '') || ' & ' || COALESCE(pa2.first_name || ' ' || pa2.last_name, '')) as team_a_name,
        TRIM(COALESCE(pb1.first_name || ' ' || pb1.last_name, '') || ' & ' || COALESCE(pb2.first_name || ' ' || pb2.last_name, '')) as team_b_name
    INTO match_record
    FROM matches m
        LEFT JOIN players pa1 ON m.player_a1_id = pa1.id
        LEFT JOIN players pa2 ON m.player_a2_id = pa2.id
        LEFT JOIN players pb1 ON m.player_b1_id = pb1.id
        LEFT JOIN players pb2 ON m.player_b2_id = pb2.id
    WHERE m.id = match_result.match_id;

    IF NOT FOUND THEN
        RETURN 'lost';
    END IF;

    prediction_type := COALESCE(prediction->>'type', 'winner');
    actual_winner := match_result.winner_id;
    actual_winner_team := match_result.match_winner_team;
    actual_result := match_result.match_result;

    -- Check if user predicted winner
    IF prediction_type = 'winner' OR prediction ? 'winner' THEN
        predicted_winner_name := prediction->>'winner';
        
        IF predicted_winner_name IS NOT NULL AND predicted_winner_name != '' THEN
            -- Check winner prediction
            IF match_record.match_type = 'doubles' THEN
                -- For doubles, compare team names
                actual_team_a_name := TRIM(REPLACE(REPLACE(match_record.team_a_name, ' & ', ' & '), '  ', ' '));
                actual_team_b_name := TRIM(REPLACE(REPLACE(match_record.team_b_name, ' & ', ' & '), '  ', ' '));
                
                -- Determine which team actually won
                IF actual_winner_team = 'team_a' THEN
                    actual_is_team_a := true;
                    actual_is_team_b := false;
                ELSIF actual_winner_team = 'team_b' THEN
                    actual_is_team_a := false;
                    actual_is_team_b := true;
                ELSIF actual_winner IS NOT NULL THEN
                    actual_is_team_a := (actual_winner = match_record.player_a1_id OR actual_winner = match_record.player_a2_id);
                    actual_is_team_b := (actual_winner = match_record.player_b1_id OR actual_winner = match_record.player_b2_id);
                ELSE
                    actual_is_team_a := false;
                    actual_is_team_b := false;
                END IF;
                
                -- Normalize team names for comparison
                predicted_normalized := UPPER(TRIM(REPLACE(predicted_winner_name, '  ', ' ')));
                team_a_normalized := UPPER(TRIM(REPLACE(actual_team_a_name, '  ', ' ')));
                team_b_normalized := UPPER(TRIM(REPLACE(actual_team_b_name, '  ', ' ')));
                
                predicted_is_team_a := false;
                predicted_is_team_b := false;
                
                -- Check exact match
                IF predicted_normalized = team_a_normalized THEN
                    predicted_is_team_a := true;
                ELSIF predicted_normalized = team_b_normalized THEN
                    predicted_is_team_b := true;
                ELSE
                    -- Check if predicted winner contains both player names from a team
                    IF actual_team_a_name IS NOT NULL AND actual_team_a_name != '' THEN
                        team_a_player1 := TRIM(SPLIT_PART(actual_team_a_name, ' & ', 1));
                        team_a_player2 := TRIM(SPLIT_PART(actual_team_a_name, ' & ', 2));
                        
                        IF team_a_player1 != '' AND team_a_player2 != '' THEN
                            predicted_is_team_a := (
                                predicted_normalized LIKE '%' || UPPER(team_a_player1) || '%' AND
                                predicted_normalized LIKE '%' || UPPER(team_a_player2) || '%'
                            );
                        END IF;
                    END IF;
                    
                    IF NOT predicted_is_team_a AND actual_team_b_name IS NOT NULL AND actual_team_b_name != '' THEN
                        team_b_player1 := TRIM(SPLIT_PART(actual_team_b_name, ' & ', 1));
                        team_b_player2 := TRIM(SPLIT_PART(actual_team_b_name, ' & ', 2));
                        
                        IF team_b_player1 != '' AND team_b_player2 != '' THEN
                            predicted_is_team_b := (
                                predicted_normalized LIKE '%' || UPPER(team_b_player1) || '%' AND
                                predicted_normalized LIKE '%' || UPPER(team_b_player2) || '%'
                            );
                        END IF;
                    END IF;
                    
                    -- If still not matched, try player ID lookup
                    IF NOT predicted_is_team_a AND NOT predicted_is_team_b THEN
                        BEGIN
                            SELECT id INTO predicted_winner_id
                            FROM players
                            WHERE CONCAT(first_name, ' ', last_name) = predicted_winner_name
                            LIMIT 1;
                            
                            IF predicted_winner_id IS NOT NULL THEN
                                predicted_is_team_a := (predicted_winner_id = match_record.player_a1_id OR predicted_winner_id = match_record.player_a2_id);
                                predicted_is_team_b := (predicted_winner_id = match_record.player_b1_id OR predicted_winner_id = match_record.player_b2_id);
                            END IF;
                        EXCEPTION WHEN OTHERS THEN
                            NULL;
                        END;
                    END IF;
                END IF;
                
                -- Check if predicted team matches actual winning team
                is_correct := (
                    (predicted_is_team_a AND actual_is_team_a) OR
                    (predicted_is_team_b AND actual_is_team_b)
                );
            ELSE
                -- For singles matches, compare player names or IDs
                BEGIN
                    predicted_winner_id := predicted_winner_name::UUID;
                    -- It's a UUID, compare directly
                    is_correct := (predicted_winner_id = actual_winner);
                EXCEPTION WHEN OTHERS THEN
                    -- It's a name, look it up and compare
                    SELECT id INTO predicted_winner_id
                    FROM players
                    WHERE CONCAT(first_name, ' ', last_name) = predicted_winner_name
                    LIMIT 1;
                    
                    IF predicted_winner_id IS NOT NULL THEN
                        is_correct := (predicted_winner_id = actual_winner);
                    ELSE
                        is_correct := false;
                    END IF;
                END;
            END IF;
        ELSE
            is_correct := false;
        END IF;
        
        -- If winner is correct, check if score was also predicted
        IF is_correct THEN
            predicted_result := prediction->>'matchResult';
            
            -- If no score was predicted (or empty), winner-only prediction is valid - bet WINS
            IF predicted_result IS NULL OR predicted_result = '' OR predicted_result = 'Not specified' THEN
                RETURN 'won';
            END IF;
            
            -- If score was predicted, it must match
            IF predicted_result IS NOT NULL AND predicted_result != '' AND actual_result IS NOT NULL THEN
                IF predicted_result != actual_result THEN
                    -- Winner correct but score wrong - bet LOSES
                    RETURN 'lost';
                ELSE
                    -- Both winner and score correct - bet WINS
                    RETURN 'won';
                END IF;
            ELSE
                -- Score prediction exists but actual result is missing - assume winner-only prediction
                RETURN 'won';
            END IF;
        ELSE
            -- Winner is wrong - bet LOSES
            RETURN 'lost';
        END IF;
    ELSE
        -- Other prediction types (match_result, set_score, etc.) - use existing logic
        -- For now, default to lost if prediction type is not 'winner'
        RETURN 'lost';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to resolve all bets for a match
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
                    total_winnings = COALESCE(total_winnings, 0) + winnings_amount,
                    updated_at = NOW()
                WHERE id = bet_record.user_id;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically resolve bets when match results are added
CREATE OR REPLACE FUNCTION trigger_resolve_bets_on_match_result()
RETURNS TRIGGER AS $$
BEGIN
    -- Resolve all bets for this match
    PERFORM resolve_bets_for_match(NEW.match_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_resolve_bets_on_match_result_insert ON match_results;
DROP TRIGGER IF EXISTS trigger_resolve_bets_on_match_result_update ON match_results;

-- Create triggers
CREATE TRIGGER trigger_resolve_bets_on_match_result_insert
    AFTER INSERT ON match_results
    FOR EACH ROW
    EXECUTE FUNCTION trigger_resolve_bets_on_match_result();

CREATE TRIGGER trigger_resolve_bets_on_match_result_update
    AFTER UPDATE ON match_results
    FOR EACH ROW
    WHEN (OLD.winner_id IS DISTINCT FROM NEW.winner_id OR OLD.match_winner_team IS DISTINCT FROM NEW.match_winner_team OR OLD.match_result IS DISTINCT FROM NEW.match_result)
    EXECUTE FUNCTION trigger_resolve_bets_on_match_result();

-- Grant permissions
GRANT EXECUTE ON FUNCTION determine_bet_outcome(JSONB, RECORD) TO service_role;
GRANT EXECUTE ON FUNCTION resolve_bets_for_match(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION trigger_resolve_bets_on_match_result() TO service_role;

-- Add comments
COMMENT ON FUNCTION determine_bet_outcome(JSONB, RECORD) IS 'Determines if a bet prediction matches the actual match result. If only winner is predicted (no score) and winner is correct, bet wins.';
COMMENT ON FUNCTION resolve_bets_for_match(UUID) IS 'Resolves all active bets for a match based on the match result';
COMMENT ON FUNCTION trigger_resolve_bets_on_match_result() IS 'Automatically resolves bets when match results are added or updated';
