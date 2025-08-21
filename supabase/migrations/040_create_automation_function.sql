-- Create a function to handle match automation directly in the database
CREATE OR REPLACE FUNCTION process_match_automation
()
RETURNS void AS $$
DECLARE
    match_record RECORD;
    greece_time TIMESTAMP
WITH TIME ZONE;
BEGIN
    -- Get current time in Greece timezone
    greece_time := NOW
() AT TIME ZONE 'Europe/Athens';
    
    -- Process matches that need to be locked
    FOR match_record IN
SELECT id, lock_time, start_time, status, odds_a, odds_b
FROM matches
WHERE status = 'upcoming'
    AND lock_time IS NOT NULL
    AND lock_time <= greece_time
    AND (locked IS NULL OR locked = false)
LOOP
-- Lock the match while preserving odds
UPDATE matches 
        SET locked = true, updated_at = NOW()
        WHERE id = match_record.id;

RAISE NOTICE 'Locked match % at %', match_record.id, greece_time;
END LOOP;
    
    -- Process matches that should go live
    FOR match_record IN
SELECT id, start_time, status, odds_a, odds_b
FROM matches
WHERE status = 'upcoming'
    AND start_time IS NOT NULL
    AND start_time <= greece_time
LOOP
-- Make match live while preserving odds
UPDATE matches 
        SET status = 'live', updated_at = NOW()
        WHERE id = match_record.id;

RAISE NOTICE 'Made match % live at %', match_record.id, greece_time;
END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_match_automation
() TO authenticated;
