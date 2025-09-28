-- Make John Doe matchable for testing purposes
-- This migration updates John Doe to be a matchable player

UPDATE players 
SET 
    is_demo_player = false,
    is_hidden = true,
    is_active = true,
    claimed_by_user_id = NULL
WHERE 
    LOWER(first_name) = 'john' 
    AND LOWER(last_name) = 'doe';

-- Also make any other test players matchable if they exist
UPDATE players 
SET 
    is_demo_player = false,
    is_hidden = true,
    is_active = true,
    claimed_by_user_id = NULL
WHERE 
    LOWER(first_name) = 'jane' 
    AND LOWER(last_name) = 'doe';

-- Add a comment to document this change
COMMENT ON TABLE players IS 'Updated John Doe and Jane Doe to be matchable for testing purposes';
