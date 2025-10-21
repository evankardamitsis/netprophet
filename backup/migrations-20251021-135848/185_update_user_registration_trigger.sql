-- Update the user registration trigger to use the new profile claim system
-- This migration updates the trigger to handle demo players and profile claims

-- 1. Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created
ON auth.users;

-- 2. Create the new trigger that handles demo player assignment
CREATE TRIGGER on_auth_user_created
    AFTER
INSERT ON
auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user_with_profile_claim
();

-- 3. Update existing users who don't have a claimed player to get a demo player
-- This ensures all existing users can continue using the app
DO $$
DECLARE
    user_record RECORD;
    demo_assigned BOOLEAN;
BEGIN
    -- Loop through all users who don't have a claimed player
    FOR user_record IN
    SELECT id, email
    FROM profiles
    WHERE claimed_player_id IS NULL
    LOOP
    -- Assign a demo player to this user
    SELECT assign_demo_player_to_user(user_record.id)
    INTO demo_assigned;

    -- Log the assignment
    RAISE NOTICE 'Assigned demo player to user: %', user_record.email;
END
LOOP;
END $$;
