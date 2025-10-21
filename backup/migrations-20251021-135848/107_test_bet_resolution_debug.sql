-- Test and debug bet resolution issues
-- This migration helps identify why bets are being marked as lost when they should be won

-- Function to test player name lookup
CREATE OR REPLACE FUNCTION test_player_name_lookup
(player_name TEXT)
RETURNS TABLE
(
    input_name TEXT,
    found_player_id UUID,
    found_first_name TEXT,
    found_last_name TEXT,
    concatenated_name TEXT,
    match_found BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        player_name as input_name,
        p.id as found_player_id,
        p.first_name as found_first_name,
        p.last_name as found_last_name,
        CONCAT(p.first_name, ' ', p.last_name) as concatenated_name,
        (CONCAT(p.first_name, ' ', p.last_name) = player_name
    ) as match_found
    FROM players p
    WHERE CONCAT
    (p.first_name, ' ', p.last_name) = player_name
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to test bet resolution for a specific match
CREATE OR REPLACE FUNCTION test_match_bet_resolution
(match_id_param UUID)
RETURNS TABLE
(
    bet_id UUID,
    prediction_type TEXT,
    predicted_winner TEXT,
    actual_winner_id UUID,
    actual_winner_name TEXT,
    player_lookup_id UUID,
    player_lookup_name TEXT,
    lookup_successful BOOLEAN,
    comparison_result BOOLEAN,
    expected_outcome TEXT,
    actual_outcome TEXT
) AS $$
DECLARE
    bet_record RECORD;
    match_result_record RECORD;
    prediction_data JSONB;
    player_id_from_name UUID;
    actual_winner_name TEXT;
BEGIN
    -- Get the match result
    SELECT *
    INTO match_result_record
    FROM match_results
    WHERE match_id = match_id_param
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE NOTICE 'No match result found for match %', match_id_param;
    RETURN;
END
IF;

    -- Get actual winner name
    SELECT CONCAT(first_name, ' ', last_name)
INTO actual_winner_name
FROM players
WHERE id = match_result_record.winner_id;

-- Process all bets for this match
FOR bet_record IN
SELECT *
FROM bets
WHERE match_id = match_id_param
LOOP
        prediction_data := bet_record.prediction;

-- Try to convert predicted winner name to UUID
IF prediction_data->>'winner' IS NOT NULL AND prediction_data->>'winner' != '' THEN
SELECT id
INTO player_id_from_name
FROM players
WHERE CONCAT(first_name, ' ', last_name) = prediction_data->>'winner'
LIMIT 1;
        ELSE
            player_id_from_name := NULL;
END
IF;
        
        RETURN QUERY
SELECT
    bet_record.id,
    COALESCE(prediction_data->>'type', 'winner') as prediction_type,
    prediction_data->>'winner' as predicted_winner,
    match_result_record.winner_id as actual_winner_id,
    actual_winner_name as actual_winner_name,
    player_id_from_name as player_lookup_id,
    (SELECT CONCAT(first_name, ' ', last_name)
    FROM players
    WHERE id = player_id_from_name) as player_lookup_name,
    (player_id_from_name IS NOT NULL) as lookup_successful,
    (player_id_from_name IS NOT NULL AND player_id_from_name
= match_result_record.winner_id) as comparison_result,
            CASE 
                WHEN
(player_id_from_name IS NOT NULL AND player_id_from_name = match_result_record.winner_id) 
                THEN 'won' 
                ELSE 'lost'
END as expected_outcome,
            bet_record.outcome as actual_outcome;
END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION test_player_name_lookup
(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION test_match_bet_resolution
(UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION test_player_name_lookup
(TEXT) IS 'Test function to debug player name lookup issues';
COMMENT ON FUNCTION test_match_bet_resolution
(UUID) IS 'Test function to debug bet resolution issues for a specific match';
