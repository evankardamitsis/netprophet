-- Add prediction result emails with detailed match results and loss reasons
-- This migration creates a function to send emails when predictions are resolved
-- Emails include detailed match results and explain why predictions were lost

-- Function to determine why a prediction was lost (language-aware)
CREATE OR REPLACE FUNCTION get_prediction_loss_reason(
    prediction JSONB,
    match_result_id UUID,
    user_language TEXT DEFAULT 'en'
)
RETURNS TEXT AS $$
DECLARE
    prediction_type TEXT;
    predicted_winner UUID;
    predicted_winner_name TEXT;
    predicted_winner_id UUID;
    actual_winner UUID;
    actual_winner_name TEXT;
    predicted_result TEXT;
    actual_result TEXT;
    loss_reasons TEXT[];
    reason TEXT;
    predicted_set TEXT;
    actual_set TEXT;
    actual_set_winner_id UUID;
    predicted_set_winner_name TEXT;
    predicted_set_winner_id UUID;
    set_num INTEGER;
    match_result_record RECORD;
    match_record RECORD;
    actual_team_a_name TEXT;
    actual_team_b_name TEXT;
    predicted_is_team_a BOOLEAN;
    predicted_is_team_b BOOLEAN;
    actual_is_team_a BOOLEAN;
    actual_is_team_b BOOLEAN;
    winner_correct BOOLEAN;
    predicted_normalized TEXT;
    team_a_normalized TEXT;
    team_b_normalized TEXT;
    team_a_player1 TEXT;
    team_a_player2 TEXT;
    team_b_player1 TEXT;
    team_b_player2 TEXT;
BEGIN
    -- Get match result details
    SELECT *
    INTO match_result_record
    FROM match_results
    WHERE id = match_result_id;

    IF NOT FOUND THEN
        IF user_language = 'el' THEN
            RETURN 'Το αποτέλεσμα αγώνα δεν βρέθηκε';
        ELSE
            RETURN 'Match result not found';
        END IF;
    END IF;

    -- Get match details to check if doubles and get team info
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
    WHERE m.id = match_result_record.match_id;

    loss_reasons := ARRAY[]::TEXT[];
    prediction_type := COALESCE(prediction->>'type', 'winner');
    actual_winner := match_result_record.winner_id;
    actual_result := match_result_record.match_result;

    -- Build team names for doubles comparison (remove empty parts)
    IF match_record.match_type = 'doubles' THEN
        actual_team_a_name := TRIM(REPLACE(REPLACE(match_record.team_a_name, ' & ', ' & '), '  ', ' '));
        actual_team_b_name := TRIM(REPLACE(REPLACE(match_record.team_b_name, ' & ', ' & '), '  ', ' '));
        
        -- Determine which team actually won
        IF match_result_record.match_winner_team = 'team_a' THEN
            actual_is_team_a := true;
            actual_is_team_b := false;
        ELSIF match_result_record.match_winner_team = 'team_b' THEN
            actual_is_team_a := false;
            actual_is_team_b := true;
        ELSIF actual_winner IS NOT NULL THEN
            -- Use winner_id to determine team
            actual_is_team_a := (actual_winner = match_record.player_a1_id OR actual_winner = match_record.player_a2_id);
            actual_is_team_b := (actual_winner = match_record.player_b1_id OR actual_winner = match_record.player_b2_id);
        ELSE
            actual_is_team_a := false;
            actual_is_team_b := false;
        END IF;
    END IF;

    -- Check winner prediction
    -- Note: Predictions store winner as player/team names (strings), not UUIDs
    IF prediction_type = 'winner' OR prediction ? 'winner' THEN
        predicted_winner_name := prediction->>'winner';
        
        IF predicted_winner_name IS NOT NULL AND actual_winner IS NOT NULL THEN
            winner_correct := false;
            
            IF match_record.match_type = 'doubles' THEN
                -- For doubles, compare team names or check if predicted winner is on the actual winning team
                predicted_is_team_a := false;
                predicted_is_team_b := false;
                
                -- Normalize team names for comparison (case-insensitive)
                BEGIN
                    predicted_normalized := UPPER(TRIM(REPLACE(predicted_winner_name, '  ', ' ')));
                    team_a_normalized := UPPER(TRIM(REPLACE(actual_team_a_name, '  ', ' ')));
                    team_b_normalized := UPPER(TRIM(REPLACE(actual_team_b_name, '  ', ' ')));
                    
                    -- Check exact match first
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
                        
                        -- Check team B if not team A
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
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    -- If comparison fails, try simple partial match
                    predicted_is_team_a := (UPPER(predicted_winner_name) LIKE '%' || UPPER(actual_team_a_name) || '%');
                    IF NOT predicted_is_team_a THEN
                        predicted_is_team_b := (UPPER(predicted_winner_name) LIKE '%' || UPPER(actual_team_b_name) || '%');
                    END IF;
                END;
                
                -- If still not matched, try to find if predicted winner is a player on one of the teams
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
                
                -- Compare predicted team with actual team
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
                        -- Couldn't find player, assume incorrect
                        winner_correct := false;
                    END IF;
                END;
            END IF;
            
            -- Only add to loss reasons if winner is actually incorrect
            IF NOT winner_correct THEN
                IF user_language = 'el' THEN
                    loss_reasons := array_append(loss_reasons, 'Ο νικητής ήταν λανθασμένος');
                ELSE
                    loss_reasons := array_append(loss_reasons, 'Winner was incorrect');
                END IF;
            END IF;
        END IF;
    END IF;

    -- Check match result prediction (e.g., "2-1", "3-0")
    IF prediction_type = 'match_result' OR prediction ? 'matchResult' THEN
        predicted_result := prediction->>'matchResult';
        IF predicted_result IS NOT NULL AND predicted_result != actual_result THEN
            IF user_language = 'el' THEN
                loss_reasons := array_append(loss_reasons, 
                    format('Το σκορ ήταν λανθασμένο: πρόβλεψες %s, πραγματικό %s', predicted_result, actual_result));
            ELSE
                loss_reasons := array_append(loss_reasons, 
                    format('Score was incorrect: predicted %s, actual %s', predicted_result, actual_result));
            END IF;
        END IF;
    END IF;

    -- Check set score predictions
    IF prediction_type = 'set_score' OR prediction ? 'setScores' THEN
        -- Check each set score
        FOR set_num IN 1..5 LOOP
            IF prediction ? ('set' || set_num::TEXT || 'Score') THEN
                predicted_set := prediction->>('set' || set_num::TEXT || 'Score');
                
                -- Get actual set score
                CASE set_num
                    WHEN 1 THEN actual_set := match_result_record.set1_score;
                    WHEN 2 THEN actual_set := match_result_record.set2_score;
                    WHEN 3 THEN actual_set := match_result_record.set3_score;
                    WHEN 4 THEN actual_set := match_result_record.set4_score;
                    WHEN 5 THEN actual_set := match_result_record.set5_score;
                END CASE;

                IF actual_set IS NOT NULL AND predicted_set != actual_set THEN
                    IF user_language = 'el' THEN
                        loss_reasons := array_append(loss_reasons, 
                            format('Set %s ήταν λανθασμένο: πρόβλεψες %s, πραγματικό %s', set_num::TEXT, predicted_set, actual_set));
                    ELSE
                        loss_reasons := array_append(loss_reasons, 
                            format('Set %s was incorrect: predicted %s, actual %s', set_num::TEXT, predicted_set, actual_set));
                    END IF;
                END IF;
            END IF;
        END LOOP;

        -- Also check match result if provided
        IF prediction ? 'matchResult' THEN
            predicted_result := prediction->>'matchResult';
            IF predicted_result != actual_result THEN
                IF user_language = 'el' THEN
                    loss_reasons := array_append(loss_reasons, 
                        format('Το αποτέλεσμα αγώνα ήταν λανθασμένο: πρόβλεψες %s, πραγματικό %s', predicted_result, actual_result));
                ELSE
                    loss_reasons := array_append(loss_reasons, 
                        format('Match result was incorrect: predicted %s, actual %s', predicted_result, actual_result));
                END IF;
            END IF;
        END IF;
    END IF;

    -- Check set winner predictions
    -- Note: Predictions store set winners as player names (strings), not UUIDs
    IF prediction_type = 'set_winner' OR prediction ? 'setWinners' THEN
        FOR set_num IN 1..5 LOOP
            IF prediction ? ('set' || set_num::TEXT || 'Winner') THEN
                predicted_set_winner_name := prediction->>('set' || set_num::TEXT || 'Winner');
                
                IF predicted_set_winner_name IS NOT NULL THEN
                    -- Try to convert to UUID first
                    BEGIN
                        predicted_set_winner_id := predicted_set_winner_name::UUID;
                    EXCEPTION WHEN OTHERS THEN
                        -- If it's not a UUID, it's a player name - look it up
                        SELECT id INTO predicted_set_winner_id
                        FROM players
                        WHERE CONCAT(first_name, ' ', last_name) = predicted_set_winner_name
                        LIMIT 1;
                    END;
                    
                    -- Get actual set winner
                    CASE set_num
                        WHEN 1 THEN actual_set_winner_id := match_result_record.set1_winner_id;
                        WHEN 2 THEN actual_set_winner_id := match_result_record.set2_winner_id;
                        WHEN 3 THEN actual_set_winner_id := match_result_record.set3_winner_id;
                        WHEN 4 THEN actual_set_winner_id := match_result_record.set4_winner_id;
                        WHEN 5 THEN actual_set_winner_id := match_result_record.set5_winner_id;
                    END CASE;

                    IF actual_set_winner_id IS NOT NULL AND 
                       predicted_set_winner_id IS NOT NULL AND 
                       predicted_set_winner_id != actual_set_winner_id THEN
                        IF user_language = 'el' THEN
                            loss_reasons := array_append(loss_reasons, 
                                format('Ο νικητής Set %s ήταν λανθασμένος', set_num::TEXT));
                        ELSE
                            loss_reasons := array_append(loss_reasons, 
                                format('Set %s winner was incorrect', set_num::TEXT));
                        END IF;
                    END IF;
                END IF;
            END IF;
        END LOOP;
    END IF;

    -- Check super tiebreak prediction
    IF prediction_type = 'super_tiebreak' OR prediction ? 'superTiebreakScore' THEN
        predicted_set := prediction->>'superTiebreakScore';
        actual_set := match_result_record.super_tiebreak_score;
        
        IF actual_set IS NOT NULL AND predicted_set != actual_set THEN
            IF user_language = 'el' THEN
                loss_reasons := array_append(loss_reasons, 
                    format('Το super tiebreak ήταν λανθασμένο: πρόβλεψες %s, πραγματικό %s', predicted_set, actual_set));
            ELSE
                loss_reasons := array_append(loss_reasons, 
                    format('Super tiebreak was incorrect: predicted %s, actual %s', predicted_set, actual_set));
            END IF;
        END IF;
    END IF;

    -- Combine all reasons
    IF array_length(loss_reasons, 1) > 0 THEN
        RETURN array_to_string(loss_reasons, '; ');
    ELSE
        RETURN 'Prediction details incorrect';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to format match result details for email
CREATE OR REPLACE FUNCTION format_match_result_details(
    match_result_id UUID
)
RETURNS TEXT AS $$
DECLARE
    result_text TEXT := '';
    set_scores TEXT[] := ARRAY[]::TEXT[];
    set_num INTEGER;
    set_score TEXT;
    match_result_record RECORD;
BEGIN
    -- Get match result details
    SELECT *
    INTO match_result_record
    FROM match_results
    WHERE id = match_result_id;

    IF NOT FOUND THEN
        RETURN 'Match result not found';
    END IF;

    -- Add match result (e.g., "2-1")
    result_text := format('Match Result: %s', match_result_record.match_result);

    -- Add set scores
    FOR set_num IN 1..5 LOOP
        CASE set_num
            WHEN 1 THEN set_score := match_result_record.set1_score;
            WHEN 2 THEN set_score := match_result_record.set2_score;
            WHEN 3 THEN set_score := match_result_record.set3_score;
            WHEN 4 THEN set_score := match_result_record.set4_score;
            WHEN 5 THEN set_score := match_result_record.set5_score;
        END CASE;

        IF set_score IS NOT NULL AND set_score != '' THEN
            set_scores := array_append(set_scores, format('Set %s: %s', set_num::TEXT, set_score));
        END IF;
    END LOOP;

    IF array_length(set_scores, 1) > 0 THEN
        result_text := result_text || E'\n' || array_to_string(set_scores, E'\n');
    END IF;

    -- Add super tiebreak if exists
    IF match_result_record.super_tiebreak_score IS NOT NULL THEN
        result_text := result_text || E'\n' || format('Super Tiebreak: %s', match_result_record.super_tiebreak_score);
    END IF;

    RETURN result_text;
END;
$$ LANGUAGE plpgsql;

-- Main function to send prediction result emails
CREATE OR REPLACE FUNCTION send_prediction_result_email(
    user_uuid UUID,
    bet_id UUID,
    bet_status TEXT,
    winnings_amount INTEGER DEFAULT 0
)
RETURNS void AS $$
DECLARE
    user_email TEXT;
    user_language TEXT;
    user_name TEXT;
    bet_record RECORD;
    match_result_record RECORD;
    match_details RECORD;
    match_display_text TEXT;
    player_a_name TEXT;
    player_b_name TEXT;
    player_a1_name TEXT;
    player_a2_name TEXT;
    player_b1_name TEXT;
    player_b2_name TEXT;
    tournament_name TEXT;
    template_name TEXT;
    template_variables JSONB;
    match_result_details TEXT;
    loss_reason TEXT;
    prediction_summary TEXT;
    predicted_winner_name TEXT;
    actual_winner_name TEXT;
    winnings_formatted TEXT;
    predicted_result TEXT;
    predicted_winner_text TEXT;
    predicted_winner_id UUID;
    actual_result TEXT;
    match_player_a_id UUID;
    match_player_b_id UUID;
    match_player_a1_id UUID;
    match_player_a2_id UUID;
    match_player_b1_id UUID;
    match_player_b2_id UUID;
BEGIN
    RAISE LOG '[send_prediction_result_email] Starting for bet %, user %', bet_id, user_uuid;
    
    -- Get user email, name, and language preference
    SELECT 
        email, 
        COALESCE(preferred_language, 'en'),
        COALESCE(NULLIF(first_name, ''), SPLIT_PART(email, '@', 1))
    INTO user_email, user_language, user_name
    FROM profiles
    WHERE id = user_uuid;

    IF user_email IS NULL THEN
        RAISE LOG '[send_prediction_result_email] User email not found for user %', user_uuid;
        RAISE EXCEPTION 'User email not found for user %', user_uuid;
        RETURN;
    END IF;
    
    RAISE LOG '[send_prediction_result_email] User email found: % (language: %, name: %)', user_email, user_language, user_name;

    -- Get bet details
    SELECT b.*, b.prediction as bet_prediction
    INTO bet_record
    FROM bets b
    WHERE b.id = bet_id;

    IF NOT FOUND THEN
        RAISE LOG '[send_prediction_result_email] Bet not found: %', bet_id;
        RAISE EXCEPTION 'Bet not found: %', bet_id;
        RETURN;
    END IF;
    
    RAISE LOG '[send_prediction_result_email] Bet found: match_id=%, status=%', bet_record.match_id, bet_record.status;

    -- Get match details including all players and their IDs
    SELECT 
        m.id as match_id,
        m.match_type,
        m.player_a_id,
        m.player_b_id,
        m.player_a1_id,
        m.player_a2_id,
        m.player_b1_id,
        m.player_b2_id,
        t.name as tournament_name,
        COALESCE(pa.first_name || ' ' || pa.last_name, 'Player A') as player_a_name,
        COALESCE(pb.first_name || ' ' || pb.last_name, 'Player B') as player_b_name,
        COALESCE(pa1.first_name || ' ' || pa1.last_name, '') as player_a1_name,
        COALESCE(pa2.first_name || ' ' || pa2.last_name, '') as player_a2_name,
        COALESCE(pb1.first_name || ' ' || pb1.last_name, '') as player_b1_name,
        COALESCE(pb2.first_name || ' ' || pb2.last_name, '') as player_b2_name
    INTO match_details
    FROM matches m
        LEFT JOIN tournaments t ON m.tournament_id = t.id
        LEFT JOIN players pa ON m.player_a_id = pa.id
        LEFT JOIN players pb ON m.player_b_id = pb.id
        LEFT JOIN players pa1 ON m.player_a1_id = pa1.id
        LEFT JOIN players pa2 ON m.player_a2_id = pa2.id
        LEFT JOIN players pb1 ON m.player_b1_id = pb1.id
        LEFT JOIN players pb2 ON m.player_b2_id = pb2.id
    WHERE m.id = bet_record.match_id;
    
    -- Store player IDs for easier access
    match_player_a_id := match_details.player_a_id;
    match_player_b_id := match_details.player_b_id;
    match_player_a1_id := match_details.player_a1_id;
    match_player_a2_id := match_details.player_a2_id;
    match_player_b1_id := match_details.player_b1_id;
    match_player_b2_id := match_details.player_b2_id;

    IF NOT FOUND THEN
        RAISE LOG '[send_prediction_result_email] Match not found for bet % (match_id: %)', bet_id, bet_record.match_id;
        RAISE EXCEPTION 'Match not found for match_id: %', bet_record.match_id;
        RETURN;
    END IF;
    
    RAISE LOG '[send_prediction_result_email] Match found: type=%, tournament=%', match_details.match_type, match_details.tournament_name;

    -- Build match display text
    IF match_details.match_type = 'doubles' THEN
        match_display_text := COALESCE(match_details.player_a1_name || ' & ' || match_details.player_a2_name, 'Team A') || 
                             ' vs ' || 
                             COALESCE(match_details.player_b1_name || ' & ' || match_details.player_b2_name, 'Team B');
    ELSE
        match_display_text := match_details.player_a_name || ' vs ' || match_details.player_b_name;
    END IF;

    -- Get match result details
    SELECT *
    INTO match_result_record
    FROM match_results
    WHERE match_id = bet_record.match_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE LOG '[send_prediction_result_email] Match result not found for match %', bet_record.match_id;
        RAISE EXCEPTION 'Match result not found for match_id: %', bet_record.match_id;
        RETURN;
    END IF;
    
    RAISE LOG '[send_prediction_result_email] Match result found: result=%, winner_id=%', match_result_record.match_result, match_result_record.winner_id;

    -- Format match result details
    match_result_details := format_match_result_details(match_result_record.id);

    -- Get actual winner name
    actual_winner_name := NULL;
    
    -- For doubles matches, check match_winner_team first (if available)
    IF match_details.match_type = 'doubles' AND match_result_record.match_winner_team IS NOT NULL THEN
        IF match_result_record.match_winner_team = 'team_a' THEN
            actual_winner_name := COALESCE(
                NULLIF(TRIM(match_details.player_a1_name || ' & ' || match_details.player_a2_name), '&'),
                'Team A'
            );
        ELSIF match_result_record.match_winner_team = 'team_b' THEN
            actual_winner_name := COALESCE(
                NULLIF(TRIM(match_details.player_b1_name || ' & ' || match_details.player_b2_name), '&'),
                'Team B'
            );
        END IF;
    ELSIF match_result_record.winner_id IS NOT NULL THEN
        -- First try to find the winner in players table
        SELECT first_name || ' ' || last_name
        INTO actual_winner_name
        FROM players
        WHERE id = match_result_record.winner_id;
        
        -- If not found, check which team/player the winner belongs to
        IF actual_winner_name IS NULL OR actual_winner_name = '' THEN
            IF match_details.match_type = 'doubles' THEN
                -- Check which team the winner belongs to using stored IDs
                IF match_result_record.winner_id = match_player_a1_id OR match_result_record.winner_id = match_player_a2_id THEN
                    actual_winner_name := COALESCE(
                        NULLIF(TRIM(match_details.player_a1_name || ' & ' || match_details.player_a2_name), '&'),
                        'Team A'
                    );
                ELSIF match_result_record.winner_id = match_player_b1_id OR match_result_record.winner_id = match_player_b2_id THEN
                    actual_winner_name := COALESCE(
                        NULLIF(TRIM(match_details.player_b1_name || ' & ' || match_details.player_b2_name), '&'),
                        'Team B'
                    );
                END IF;
            ELSE
                -- For singles matches, use stored IDs
                IF match_result_record.winner_id = match_player_a_id THEN
                    actual_winner_name := match_details.player_a_name;
                ELSIF match_result_record.winner_id = match_player_b_id THEN
                    actual_winner_name := match_details.player_b_name;
                END IF;
            END IF;
        END IF;
    END IF;
    
    -- Fallback if still NULL
    IF actual_winner_name IS NULL OR actual_winner_name = '' THEN
        -- Try to get from match result based on match_result (e.g., "2-1" means player A won)
        IF match_result_record.match_result IS NOT NULL THEN
            -- Parse match result to determine winner
            IF match_details.match_type = 'doubles' THEN
                actual_winner_name := COALESCE(
                    NULLIF(match_details.player_a1_name || ' & ' || match_details.player_a2_name, ' & '),
                    'Team A'
                );
            ELSE
                actual_winner_name := COALESCE(match_details.player_a_name, 'Player A');
            END IF;
        ELSE
            actual_winner_name := 'Winner';
        END IF;
    END IF;

    -- Get predicted winner name from prediction
    predicted_winner_name := NULL;
    predicted_result := NULL;
    IF bet_record.bet_prediction IS NOT NULL THEN
        IF jsonb_typeof(bet_record.bet_prediction::JSONB) = 'object' THEN
            -- Try to get winner name from prediction
            IF (bet_record.bet_prediction::JSONB) ? 'winner' THEN
                predicted_winner_text := (bet_record.bet_prediction::JSONB)->>'winner';
                -- Try to parse as UUID first
                BEGIN
                    predicted_winner_id := predicted_winner_text::UUID;
                    SELECT COALESCE(first_name || ' ' || last_name, 'Predicted Winner')
                    INTO predicted_winner_name
                    FROM players
                    WHERE id = predicted_winner_id;
                EXCEPTION WHEN OTHERS THEN
                    -- If not UUID, it's a name - use it directly
                    predicted_winner_name := predicted_winner_text;
                END;
            END IF;
            
            -- Get predicted result
            IF (bet_record.bet_prediction::JSONB) ? 'matchResult' THEN
                predicted_result := (bet_record.bet_prediction::JSONB)->>'matchResult';
            END IF;
        END IF;
    END IF;

    -- Get loss reason if bet was lost (pass language for localized messages)
    loss_reason := NULL;
    IF bet_status = 'lost' AND bet_record.bet_prediction IS NOT NULL AND match_result_record.id IS NOT NULL THEN
        loss_reason := get_prediction_loss_reason(
            bet_record.bet_prediction::JSONB,
            match_result_record.id,
            user_language
        );
    END IF;

    -- Format prediction summary
    IF bet_record.bet_prediction IS NOT NULL THEN
        IF jsonb_typeof(bet_record.bet_prediction::JSONB) = 'object' THEN
            IF predicted_result IS NOT NULL THEN
                prediction_summary := format('Predicted: %s', predicted_result);
            ELSIF predicted_winner_name IS NOT NULL THEN
                prediction_summary := format('Predicted Winner: %s', predicted_winner_name);
            ELSE
                prediction_summary := 'See prediction details below';
            END IF;
        ELSE
            prediction_summary := 'See prediction details below';
        END IF;
    ELSE
        prediction_summary := 'No prediction details available';
    END IF;

    -- Format winnings as currency (assuming cents, convert to euros)
    IF winnings_amount > 0 THEN
        winnings_formatted := format('€%.2f', winnings_amount / 100.0);
    ELSE
        winnings_formatted := '€0.00';
    END IF;

    -- Determine template name
    template_name := CASE 
        WHEN bet_status = 'won' THEN 'prediction_result_won'
        ELSE 'prediction_result_lost'
    END;

    tournament_name := COALESCE(match_details.tournament_name, '');

    -- Ensure all variables have proper fallbacks
    IF user_name IS NULL OR user_name = '' THEN
        user_name := SPLIT_PART(user_email, '@', 1);
    END IF;
    
    IF predicted_winner_name IS NULL OR predicted_winner_name = '' THEN
        predicted_winner_name := 'Not specified';
    END IF;
    
    IF actual_winner_name IS NULL OR actual_winner_name = '' THEN
        actual_winner_name := 'Winner';
    END IF;
    
    IF predicted_result IS NULL OR predicted_result = '' THEN
        predicted_result := 'Not specified';
    END IF;
    
    -- Set actual_result
    actual_result := COALESCE(match_result_record.match_result, '');
    IF actual_result = '' THEN
        actual_result := 'See details below';
    END IF;

    -- Build template variables with explicit non-null values
    template_variables := jsonb_build_object(
        'user_name', user_name,
        'match_name', match_display_text,
        'tournament_name', tournament_name,
        'match_result', COALESCE(match_result_record.match_result, ''),
        'match_result_details', COALESCE(match_result_details, ''),
        'predicted_winner', predicted_winner_name,
        'actual_winner', actual_winner_name,
        'predicted_result', predicted_result,
        'actual_result', actual_result,
        'prediction_summary', COALESCE(prediction_summary, ''),
        'loss_reason', COALESCE(loss_reason, ''),
        'winnings', winnings_amount,
        'winnings_formatted', winnings_formatted,
        'bet_amount', bet_record.bet_amount,
        'prediction_details', COALESCE(bet_record.bet_prediction::TEXT, '')
    );

    -- Insert email log for processing
    BEGIN
        INSERT INTO email_logs (
            user_id,
            to_email,
            template,
            type,
            language,
            variables,
            status,
            sent_at  -- sent_at has NOT NULL constraint, set it explicitly
        ) VALUES (
            user_uuid,
            user_email,
            template_name,
            'user',
            user_language,
            template_variables,
            'pending',
            NOW()  -- Set sent_at to current timestamp
        );
        
        RAISE LOG '[send_prediction_result_email] SUCCESS: Email logged for user % (bet %, status %, template: %)', 
            user_email, bet_id, bet_status, template_name;
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG '[send_prediction_result_email] ERROR inserting email log for user % (bet %): % (SQLSTATE: %)', 
            user_email, bet_id, SQLERRM, SQLSTATE;
        RAISE;  -- Re-raise the exception so it can be caught by caller
    END;
    
    RAISE LOG '[send_prediction_result_email] Function completed successfully for bet %', bet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION send_prediction_result_email(UUID, UUID, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_prediction_loss_reason(JSONB, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION format_match_result_details(UUID) TO service_role;

-- Add comments
COMMENT ON FUNCTION send_prediction_result_email(UUID, UUID, TEXT, INTEGER) IS 
'Sends email to user when their prediction is resolved. Includes detailed match results and explains why predictions were lost.';
COMMENT ON FUNCTION get_prediction_loss_reason(JSONB, UUID, TEXT) IS 
'Determines why a prediction was lost by comparing predicted values with actual match results. Returns language-aware error messages (en/el).';
COMMENT ON FUNCTION format_match_result_details(UUID) IS 
'Formats match result details (set scores, super tiebreak) for display in emails.';

-- Update the existing create_bet_notification function to also send emails
-- We'll preserve the original notification creation and add email sending
-- This will be called from wherever create_bet_notification is currently called
-- (likely in the bet resolution function)

-- Update create_bet_notification to also send emails
-- This preserves the original notification creation and adds email sending
CREATE OR REPLACE FUNCTION create_bet_notification
(
    user_uuid UUID,
    bet_id UUID,
    bet_status TEXT,
    winnings_amount INTEGER DEFAULT 0,
    user_language TEXT DEFAULT 'en'
)
RETURNS void AS $$
DECLARE
    notification_title TEXT;
    notification_message TEXT;
    notification_data JSONB;
    match_details RECORD;
    match_display_text TEXT;
    player_a_name TEXT;
    player_b_name TEXT;
    player_a1_name TEXT;
    player_a2_name TEXT;
    player_b1_name TEXT;
    player_b2_name TEXT;
    tournament_name TEXT;
BEGIN
    -- Get match details including all players and match type
    SELECT 
        m.id as match_id,
        m.match_type,
        t.name as tournament_name,
        pa.first_name || ' ' || pa.last_name as player_a_name,
        pb.first_name || ' ' || pb.last_name as player_b_name,
        pa1.first_name || ' ' || pa1.last_name as player_a1_name,
        pa2.first_name || ' ' || pa2.last_name as player_a2_name,
        pb1.first_name || ' ' || pb1.last_name as player_b1_name,
        pb2.first_name || ' ' || pb2.last_name as player_b2_name
    INTO match_details
    FROM bets b
        JOIN matches m ON b.match_id = m.id
        LEFT JOIN tournaments t ON m.tournament_id = t.id
        LEFT JOIN players pa ON m.player_a_id = pa.id
        LEFT JOIN players pb ON m.player_b_id = pb.id
        LEFT JOIN players pa1 ON m.player_a1_id = pa1.id
        LEFT JOIN players pa2 ON m.player_a2_id = pa2.id
        LEFT JOIN players pb1 ON m.player_b1_id = pb1.id
        LEFT JOIN players pb2 ON m.player_b2_id = pb2.id
    WHERE b.id = bet_id;

    -- Build match display text based on match type
    IF match_details.match_type = 'doubles' THEN
        player_a1_name := COALESCE(match_details.player_a1_name, 'Player A1');
        player_a2_name := COALESCE(match_details.player_a2_name, 'Player A2');
        player_b1_name := COALESCE(match_details.player_b1_name, 'Player B1');
        player_b2_name := COALESCE(match_details.player_b2_name, 'Player B2');
        
        match_display_text := player_a1_name || ' & ' || player_a2_name || ' vs ' || 
                             player_b1_name || ' & ' || player_b2_name;
    ELSE
        player_a_name := COALESCE(match_details.player_a_name, 'Player A');
        player_b_name := COALESCE(match_details.player_b_name, 'Player B');
        
        match_display_text := player_a_name || ' vs ' || player_b_name;
    END IF;

    tournament_name := COALESCE(match_details.tournament_name, '');

    -- Determine notification content based on bet status and language
    CASE bet_status
        WHEN 'won' THEN
            IF user_language = 'el' THEN
                notification_title := '🎉 Η πρόβλεψη σου κέρδισε!';
                notification_message := CONCAT('Συγχαρητήρια! Η πρόβλεψη σου για ', match_display_text);
                IF tournament_name != '' THEN
                    notification_message := notification_message || CONCAT(' (', tournament_name, ')');
                END IF;
                notification_message := notification_message || ' κέρδισε.';
            ELSE
                notification_title := '🎉 Your prediction won!';
                notification_message := CONCAT('Congratulations! Your prediction on ', match_display_text);
                IF tournament_name != '' THEN
                    notification_message := notification_message || CONCAT(' (', tournament_name, ')');
                END IF;
                notification_message := notification_message || ' has been won.';
            END IF;
            notification_data := jsonb_build_object(
                'bet_id', bet_id,
                'match_id', match_details.match_id,
                'winnings', winnings_amount,
                'type', 'bet_won',
                'match_details', jsonb_build_object(
                    'match_type', match_details.match_type,
                    'player_a', player_a_name,
                    'player_b', player_b_name,
                    'player_a1', player_a1_name,
                    'player_a2', player_a2_name,
                    'player_b1', player_b1_name,
                    'player_b2', player_b2_name,
                    'tournament_name', tournament_name
                )
            );
        WHEN 'lost' THEN
            IF user_language = 'el' THEN
                notification_title := '❌ Η πρόβλεψη σου έχασε';
                notification_message := CONCAT('Η πρόβλεψη σου για ', match_display_text);
                IF tournament_name != '' THEN
                    notification_message := notification_message || CONCAT(' (', tournament_name, ')');
                END IF;
                notification_message := notification_message || ' έχασε. Καλή τύχη την επόμενη φορά!';
            ELSE
                notification_title := '❌ Your prediction lost';
                notification_message := CONCAT('Your prediction on ', match_display_text);
                IF tournament_name != '' THEN
                    notification_message := notification_message || CONCAT(' (', tournament_name, ')');
                END IF;
                notification_message := notification_message || ' has been lost. Better luck next time!';
            END IF;
            notification_data := jsonb_build_object(
                'bet_id', bet_id,
                'match_id', match_details.match_id,
                'type', 'bet_lost',
                'match_details', jsonb_build_object(
                    'match_type', match_details.match_type,
                    'player_a', player_a_name,
                    'player_b', player_b_name,
                    'player_a1', player_a1_name,
                    'player_a2', player_a2_name,
                    'player_b1', player_b1_name,
                    'player_b2', player_b2_name,
                    'tournament_name', tournament_name
                )
            );
        ELSE
            IF user_language = 'el' THEN
                notification_title := '📊 Η πρόβλεψη σου επιλύθηκε';
                notification_message := CONCAT('Η πρόβλεψη σου για ', match_display_text);
                IF tournament_name != '' THEN
                    notification_message := notification_message || CONCAT(' (', tournament_name, ')');
                END IF;
                notification_message := notification_message || ' επιλύθηκε.';
            ELSE
                notification_title := '📊 Prediction Resolved';
                notification_message := CONCAT('Your prediction on ', match_display_text);
                IF tournament_name != '' THEN
                    notification_message := notification_message || CONCAT(' (', tournament_name, ')');
                END IF;
                notification_message := notification_message || ' has been resolved.';
            END IF;
            notification_data := jsonb_build_object(
                'bet_id', bet_id,
                'match_id', match_details.match_id,
                'type', 'bet_resolved',
                'match_details', jsonb_build_object(
                    'match_type', match_details.match_type,
                    'player_a', player_a_name,
                    'player_b', player_b_name,
                    'player_a1', player_a1_name,
                    'player_a2', player_a2_name,
                    'player_b1', player_b1_name,
                    'player_b2', player_b2_name,
                    'tournament_name', tournament_name
                )
            );
    END CASE;

    -- Insert the notification
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        data
    ) VALUES (
        user_uuid,
        CASE bet_status
            WHEN 'won' THEN 'bet_won'
            WHEN 'lost' THEN 'bet_lost'
            ELSE 'bet_resolved'
        END,
        notification_title,
        notification_message,
        notification_data
    );

    -- Send email notification
    BEGIN
        PERFORM send_prediction_result_email(
            user_uuid,
            bet_id,
            bet_status,
            winnings_amount
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Error sending prediction result email for bet %: %', bet_id, SQLERRM;
        -- Don't fail notification creation if email fails
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update comment
COMMENT ON FUNCTION create_bet_notification(UUID, UUID, TEXT, INTEGER, TEXT) IS 
'Creates a notification for a user when their bet is resolved and sends a detailed email with match results and loss reasons. Shows actual match details including singles and doubles matches.';
