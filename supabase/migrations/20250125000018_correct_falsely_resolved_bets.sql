-- Correct falsely resolved bets where user only predicted winner (no score) and winner was correct
-- These bets were incorrectly marked as 'lost' but should be 'won'

-- Function to correct a single bet if it was falsely resolved
CREATE OR REPLACE FUNCTION correct_falsely_resolved_bet(bet_id_param UUID)
RETURNS TABLE(
    bet_id UUID,
    was_corrected BOOLEAN,
    old_status TEXT,
    new_status TEXT,
    winnings_awarded INTEGER
) AS $$
DECLARE
    bet_record RECORD;
    match_result_record RECORD;
    prediction_data JSONB;
    predicted_winner_name TEXT;
    predicted_result TEXT;
    actual_winner UUID;
    actual_winner_team TEXT;
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
    predicted_winner_id UUID;
    winner_correct BOOLEAN;
    should_be_won BOOLEAN;
    winnings INTEGER;
    user_profile RECORD;
BEGIN
    -- Get bet record
    SELECT * INTO bet_record
    FROM bets
    WHERE id = bet_id_param;

    IF NOT FOUND THEN
        RETURN QUERY SELECT bet_id_param, false, NULL::TEXT, NULL::TEXT, 0;
        RETURN;
    END IF;

    -- Only process bets that are currently 'lost'
    IF bet_record.status != 'lost' THEN
        RETURN QUERY SELECT bet_id_param, false, bet_record.status, bet_record.status, 0;
        RETURN;
    END IF;

    -- Get match result
    SELECT * INTO match_result_record
    FROM match_results
    WHERE match_id = bet_record.match_id
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN QUERY SELECT bet_id_param, false, 'lost', 'lost', 0;
        RETURN;
    END IF;

    -- Get match details
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
    WHERE m.id = bet_record.match_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT bet_id_param, false, 'lost', 'lost', 0;
        RETURN;
    END IF;

    prediction_data := bet_record.prediction;
    predicted_winner_name := prediction_data->>'winner';
    predicted_result := prediction_data->>'matchResult';
    actual_winner := match_result_record.winner_id;
    actual_winner_team := match_result_record.match_winner_team;

    -- Check if prediction only has winner (no score or empty score)
    IF (predicted_result IS NULL OR predicted_result = '' OR predicted_result = 'Not specified') AND
       predicted_winner_name IS NOT NULL AND predicted_winner_name != '' THEN
        
        -- Check if winner prediction is correct
        winner_correct := false;
        
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
            winner_correct := (
                (predicted_is_team_a AND actual_is_team_a) OR
                (predicted_is_team_b AND actual_is_team_b)
            );
        ELSE
            -- For singles matches, compare player names or IDs
            BEGIN
                predicted_winner_id := predicted_winner_name::UUID;
                -- It's a UUID, compare directly
                winner_correct := (predicted_winner_id = actual_winner);
            EXCEPTION WHEN OTHERS THEN
                -- It's a name, look it up and compare
                SELECT id INTO predicted_winner_id
                FROM players
                WHERE CONCAT(first_name, ' ', last_name) = predicted_winner_name
                LIMIT 1;
                
                IF predicted_winner_id IS NOT NULL THEN
                    winner_correct := (predicted_winner_id = actual_winner);
                ELSE
                    winner_correct := false;
                END IF;
            END;
        END IF;
        
        -- If winner is correct and no score was predicted, bet should be won
        should_be_won := winner_correct;
    ELSE
        -- Score was predicted or no winner prediction - don't correct
        should_be_won := false;
    END IF;
    
    -- If bet should be won, correct it
    IF should_be_won THEN
        winnings := bet_record.potential_winnings;
        
        -- Update bet status
        UPDATE bets
        SET 
            status = 'won',
            outcome = 'won',
            winnings_paid = winnings,
            updated_at = NOW()
        WHERE id = bet_id_param;
        
        -- Update user's balance if winnings > 0
        IF winnings > 0 THEN
            SELECT * INTO user_profile
            FROM profiles
            WHERE id = bet_record.user_id;

            IF FOUND THEN
                UPDATE profiles
                SET 
                    balance = balance + winnings,
                    total_winnings = COALESCE(total_winnings, 0) + winnings,
                    updated_at = NOW()
                WHERE id = bet_record.user_id;
            END IF;
        END IF;
        
        RETURN QUERY SELECT bet_id_param, true, 'lost', 'won', winnings;
    ELSE
        RETURN QUERY SELECT bet_id_param, false, 'lost', 'lost', 0;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to correct all falsely resolved bets
CREATE OR REPLACE FUNCTION correct_all_falsely_resolved_bets()
RETURNS TABLE(
    total_checked INTEGER,
    total_corrected INTEGER,
    total_winnings_awarded BIGINT
) AS $$
DECLARE
    bet_record RECORD;
    correction_result RECORD;
    checked_count INTEGER := 0;
    corrected_count INTEGER := 0;
    total_winnings BIGINT := 0;
BEGIN
    -- Find all lost bets that have match results
    FOR bet_record IN
        SELECT b.id
        FROM bets b
        INNER JOIN match_results mr ON b.match_id = mr.match_id
        WHERE b.status = 'lost'
          AND b.resolved_at IS NOT NULL
        ORDER BY b.resolved_at DESC
    LOOP
        checked_count := checked_count + 1;
        
        -- Try to correct this bet
        SELECT * INTO correction_result
        FROM correct_falsely_resolved_bet(bet_record.id);
        
        IF correction_result.was_corrected THEN
            corrected_count := corrected_count + 1;
            total_winnings := total_winnings + correction_result.winnings_awarded;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT checked_count, corrected_count, total_winnings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION correct_falsely_resolved_bet(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION correct_all_falsely_resolved_bets() TO service_role;

-- Add comments
COMMENT ON FUNCTION correct_falsely_resolved_bet(UUID) IS 'Corrects a single bet that was falsely marked as lost when user only predicted winner correctly';
COMMENT ON FUNCTION correct_all_falsely_resolved_bets() IS 'Corrects all falsely resolved bets where user only predicted winner (no score) and winner was correct';

-- Run the correction automatically (optional - comment out if you want to run manually)
-- SELECT * FROM correct_all_falsely_resolved_bets();
