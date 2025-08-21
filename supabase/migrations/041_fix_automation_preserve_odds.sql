-- Fix the automation function to properly preserve odds and add better logging
CREATE OR REPLACE FUNCTION process_match_automation
()
RETURNS void AS $$
DECLARE
    match_record RECORD;
    greece_time TIMESTAMP
WITH TIME ZONE;
    affected_count INTEGER := 0;
BEGIN
    -- Get current time in Greece timezone
    greece_time := NOW
() AT TIME ZONE 'Europe/Athens';
    
    RAISE NOTICE 'Starting match automation at % (Greece time)', greece_time;
    
    -- Process matches that need to be locked
    FOR match_record IN
SELECT id, lock_time, start_time, status, odds_a, odds_b, locked
FROM matches
WHERE status = 'upcoming'
    AND lock_time IS NOT NULL
    AND lock_time <= greece_time
    AND (locked IS NULL OR locked = false)
LOOP
-- Lock the match while preserving all existing data
UPDATE matches 
        SET 
            locked = true, 
            updated_at = NOW()
        WHERE id = match_record.id;

affected_count := affected_count + 1;
        RAISE NOTICE 'Locked match % (odds_a: %, odds_b: %) at %', 
            match_record.id, 
            match_record.odds_a, 
            match_record.odds_b, 
            greece_time;
END LOOP;
    
    RAISE NOTICE 'Locked % matches', affected_count;
    affected_count := 0;
    
    -- Process matches that should go live
    FOR match_record IN
SELECT id, start_time, status, odds_a, odds_b
FROM matches
WHERE status = 'upcoming'
    AND start_time IS NOT NULL
    AND start_time <= greece_time
LOOP
-- Make match live while preserving all existing data
UPDATE matches 
        SET 
            status = 'live', 
            updated_at = NOW()
        WHERE id = match_record.id;

affected_count := affected_count + 1;
        RAISE NOTICE 'Made match % live (odds_a: %, odds_b: %) at %', 
            match_record.id, 
            match_record.odds_a, 
            match_record.odds_b, 
            greece_time;
END LOOP;
    
    RAISE NOTICE 'Made % matches live', affected_count;
    RAISE NOTICE 'Match automation completed successfully';
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_match_automation
() TO authenticated;

-- Add a comment to document the function
COMMENT ON FUNCTION process_match_automation
() IS 'Automates match status changes (locking and going live) while preserving existing odds and other data';
