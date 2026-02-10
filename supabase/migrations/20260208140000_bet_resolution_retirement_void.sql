-- When a match ends in retirement (match_result like '2-0 ret'), bets are still
-- resolved won/lost by match winner only. Payout uses base (winner) odds only;
-- no bonus for correct set winners, exact score, etc. (see resolve_bets_for_match).

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
    is_retirement BOOLEAN;
BEGIN
    actual_result := match_result.match_result;
    is_retirement := (actual_result IS NOT NULL AND TRIM(actual_result) ~ '\s+ret\s*$');

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
                    is_correct := (predicted_winner_id = actual_winner);
                EXCEPTION WHEN OTHERS THEN
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
            -- Retirement: award by winner only; ignore score/set predictions (payout capped in resolve_bets_for_match)
            IF is_retirement THEN
                RETURN 'won';
            END IF;

            predicted_result := prediction->>'matchResult';
            
            -- If no score was predicted (or empty), winner-only prediction is valid - bet WINS
            IF predicted_result IS NULL OR predicted_result = '' OR predicted_result = 'Not specified' THEN
                RETURN 'won';
            END IF;
            
            -- If score was predicted, it must match
            IF predicted_result IS NOT NULL AND predicted_result != '' AND actual_result IS NOT NULL THEN
                IF predicted_result != actual_result THEN
                    RETURN 'lost';
                ELSE
                    RETURN 'won';
                END IF;
            ELSE
                RETURN 'won';
            END IF;
        ELSE
            RETURN 'lost';
        END IF;
    ELSE
        -- Other prediction types: lost (or void if retirement, already handled at top)
        RETURN 'lost';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION determine_bet_outcome(JSONB, RECORD) IS 'Determines bet outcome. On retirement, won/lost by match winner only; payout is capped to base odds in resolve_bets_for_match.';

-- Resolve bets: on retirement, pay only base (winner) odds, not bonuses for score/set predictions
CREATE OR REPLACE FUNCTION resolve_bets_for_match(match_id_param UUID)
RETURNS void AS $$
DECLARE
    match_result_record RECORD;
    bet_record RECORD;
    prediction_data JSONB;
    bet_outcome TEXT;
    winnings_amount INTEGER;
    user_profile RECORD;
    match_details RECORD;
    match_display_text TEXT;
    transaction_description TEXT;
    is_retirement BOOLEAN;
    winner_odds NUMERIC;
BEGIN
    SELECT * INTO match_result_record
    FROM match_results
    WHERE match_id = match_id_param
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE NOTICE 'No match result found for match %', match_id_param;
        RETURN;
    END IF;

    is_retirement := (match_result_record.match_result IS NOT NULL AND TRIM(match_result_record.match_result) ~ '\s+ret\s*$');

    SELECT 
        m.match_type,
        m.odds_a,
        m.odds_b,
        m.player_a_id,
        m.player_b_id,
        COALESCE(pa.first_name || ' ' || pa.last_name, 'Player A') as player_a_name,
        COALESCE(pb.first_name || ' ' || pb.last_name, 'Player B') as player_b_name,
        COALESCE(pa1.first_name || ' ' || pa1.last_name, '') as player_a1_name,
        COALESCE(pa2.first_name || ' ' || pa2.last_name, '') as player_a2_name,
        COALESCE(pb1.first_name || ' ' || pb1.last_name, '') as player_b1_name,
        COALESCE(pb2.first_name || ' ' || pb2.last_name, '') as player_b2_name
    INTO match_details
    FROM matches m
        LEFT JOIN players pa ON m.player_a_id = pa.id
        LEFT JOIN players pb ON m.player_b_id = pb.id
        LEFT JOIN players pa1 ON m.player_a1_id = pa1.id
        LEFT JOIN players pa2 ON m.player_a2_id = pa2.id
        LEFT JOIN players pb1 ON m.player_b1_id = pb1.id
        LEFT JOIN players pb2 ON m.player_b2_id = pb2.id
    WHERE m.id = match_id_param;

    IF match_details.match_type = 'doubles' THEN
        match_display_text := COALESCE(match_details.player_a1_name || ' & ' || match_details.player_a2_name, 'Team A') || 
                             ' vs ' || 
                             COALESCE(match_details.player_b1_name || ' & ' || match_details.player_b2_name, 'Team B');
    ELSE
        match_display_text := match_details.player_a_name || ' vs ' || match_details.player_b_name;
    END IF;

    FOR bet_record IN
        SELECT * FROM bets
        WHERE match_id = match_id_param
        AND status = 'active'
    LOOP
        prediction_data := bet_record.prediction;
        bet_outcome := determine_bet_outcome(prediction_data, match_result_record);

        IF bet_outcome = 'won' THEN
            IF is_retirement THEN
                -- Pay only base (winner) odds; no bonus for set winners, exact score, etc.
                IF match_details.match_type = 'doubles' THEN
                    IF match_result_record.match_winner_team = 'team_a' THEN
                        winner_odds := COALESCE(match_details.odds_a, 2.0);
                    ELSE
                        winner_odds := COALESCE(match_details.odds_b, 2.0);
                    END IF;
                ELSE
                    IF match_result_record.winner_id = match_details.player_a_id THEN
                        winner_odds := COALESCE(match_details.odds_a, 2.0);
                    ELSE
                        winner_odds := COALESCE(match_details.odds_b, 2.0);
                    END IF;
                END IF;
                winnings_amount := (ROUND(bet_record.bet_amount * winner_odds))::INTEGER;
            ELSE
                winnings_amount := bet_record.potential_winnings;
            END IF;
        ELSE
            winnings_amount := 0;
        END IF;

        UPDATE bets
        SET 
            status = bet_outcome,
            outcome = bet_outcome,
            resolved_at = NOW(),
            winnings_paid = winnings_amount
        WHERE id = bet_record.id;

        SELECT * INTO user_profile
        FROM profiles
        WHERE id = bet_record.user_id;

        IF FOUND THEN
            IF bet_outcome = 'won' AND winnings_amount > 0 THEN
                UPDATE profiles
                SET 
                    balance = balance + winnings_amount,
                    total_winnings = COALESCE(total_winnings, 0) + winnings_amount,
                    updated_at = NOW()
                WHERE id = bet_record.user_id;

                transaction_description := 'Prediction won: ' || match_display_text;
                IF bet_record.description IS NOT NULL AND bet_record.description != '' THEN
                    transaction_description := transaction_description || ' (' || bet_record.description || ')';
                END IF;

                INSERT INTO public.transactions (
                    user_id,
                    type,
                    amount,
                    description,
                    created_at
                ) VALUES (
                    bet_record.user_id,
                    'win',
                    winnings_amount,
                    transaction_description,
                    NOW()
                );
            ELSIF bet_outcome = 'lost' THEN
                transaction_description := 'Prediction lost: ' || match_display_text;
                IF bet_record.description IS NOT NULL AND bet_record.description != '' THEN
                    transaction_description := transaction_description || ' (' || bet_record.description || ')';
                END IF;

                INSERT INTO public.transactions (
                    user_id,
                    type,
                    amount,
                    description,
                    created_at
                ) VALUES (
                    bet_record.user_id,
                    'loss',
                    -bet_record.bet_amount,
                    transaction_description,
                    NOW()
                );
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION resolve_bets_for_match(UUID) IS 
'Resolves all active bets for a match. On retirement, bets are still won/lost by match winner but only base (winner) odds are paid; no bonus for set/score predictions.';
