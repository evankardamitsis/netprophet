-- Add transaction creation for bet wins and losses
-- This ensures bet results appear in wallet recent activity

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

    -- Get match details for transaction descriptions
    SELECT 
        m.match_type,
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

    -- Build match display text
    IF match_details.match_type = 'doubles' THEN
        match_display_text := COALESCE(match_details.player_a1_name || ' & ' || match_details.player_a2_name, 'Team A') || 
                             ' vs ' || 
                             COALESCE(match_details.player_b1_name || ' & ' || match_details.player_b2_name, 'Team B');
    ELSE
        match_display_text := match_details.player_a_name || ' vs ' || match_details.player_b_name;
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

        -- Get user profile
        SELECT * INTO user_profile
        FROM profiles
        WHERE id = bet_record.user_id;

        IF FOUND THEN
            IF bet_outcome = 'won' AND winnings_amount > 0 THEN
                -- Update user's balance and stats
                UPDATE profiles
                SET 
                    balance = balance + winnings_amount,
                    total_winnings = COALESCE(total_winnings, 0) + winnings_amount,
                    updated_at = NOW()
                WHERE id = bet_record.user_id;

                -- Create transaction for win
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
                -- Create transaction for loss (negative amount)
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
                    -bet_record.bet_amount,  -- Negative amount for loss
                    transaction_description,
                    NOW()
                );
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION resolve_bets_for_match(UUID) TO service_role;

COMMENT ON FUNCTION resolve_bets_for_match(UUID) IS 
'Resolves all active bets for a match based on the match result. Creates transactions for wins and losses to show in wallet recent activity.';
