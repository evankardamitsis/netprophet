-- ============================================================================
-- Delete Test Users from Authentication
-- ============================================================================
-- This script safely deletes test users from auth.users and cleans up
-- related data in profiles and players tables.
--
-- Usage:
--   1. Run in Supabase SQL Editor
--   2. Modify the email patterns or specific emails as needed
--   3. Review the verification query at the end to confirm deletions
--
-- Safety Features:
--   - Handles foreign key constraints
--   - Cleans up player claims before deletion
--   - Provides detailed logging
--   - Uses transactions for safety
-- ============================================================================

-- Option 1: Delete by email pattern (recommended for bulk test user cleanup)
-- Modify the patterns below to match your test user emails
DO $
$
DECLARE
    test_user RECORD;
    deleted_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    -- Loop through test users matching the pattern
    FOR test_user IN
    SELECT id, email
    FROM auth.users
    WHERE email LIKE '%test%'
        OR email LIKE '%@example.com'
        OR email LIKE 'test-%'
        OR email LIKE 'test.%'
    ORDER BY created_at DESC
    LOOP
        BEGIN
            -- 1. Clear any player claims (set to NULL and deactivate)
            UPDATE players
    SET claimed_by_user_id
    = NULL,
                is_active = FALSE
            WHERE claimed_by_user_id = test_user.id;

    -- 2. Delete from profiles (if exists)
    DELETE FROM profiles
            WHERE id = test_user.id;

    -- 3. Delete from auth.users (must be last due to foreign keys)
    DELETE FROM auth.users
            WHERE id = test_user.id;

    deleted_count := deleted_count + 1;
RAISE NOTICE '✅ Deleted user: % (ID: %)', test_user.email, test_user.id;
        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                RAISE WARNING '❌ Failed to delete user %: %', test_user.email, SQLERRM;
END;
END LOOP;

    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE 'Deletion Summary:';
    RAISE NOTICE '  ✅ Successfully deleted: % users', deleted_count;
    RAISE NOTICE '  ❌ Failed: % users', error_count;
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

-- Option 2: Delete specific test users by email (safer, more controlled)
-- Uncomment and modify the emails array as needed:
/*
DO $$
DECLARE
    test_emails TEXT[] := ARRAY[
        'test-no-name@example.com',
        'test-with-name@example.com',
        'test-creation@example.com',
        'test-skipped@example.com',
        'test.profile.creation@example.com',
        'test.athlete@example.com',
        'test.oauth@example.com',
        'test.user@example.com'
    ];
    test_email TEXT;
    test_user_id UUID;
    deleted_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    FOREACH test_email IN ARRAY test_emails
    LOOP
        -- Get user ID
        SELECT id INTO test_user_id
        FROM auth.users
        WHERE email = test_email;

        IF test_user_id IS NOT NULL THEN
            BEGIN
                -- 1. Clear player claims
                UPDATE players
                SET claimed_by_user_id = NULL,
                    is_active = FALSE
                WHERE claimed_by_user_id = test_user_id;

                -- 2. Delete profile
                DELETE FROM profiles
                WHERE id = test_user_id;

                -- 3. Delete auth user
                DELETE FROM auth.users
                WHERE id = test_user_id;

                deleted_count := deleted_count + 1;
                RAISE NOTICE '✅ Deleted: %', test_email;
            EXCEPTION
                WHEN OTHERS THEN
                    error_count := error_count + 1;
                    RAISE WARNING '❌ Failed to delete %: %', test_email, SQLERRM;
            END;
        ELSE
            RAISE NOTICE 'ℹ️  User not found: %', test_email;
        END IF;
    END LOOP;

    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE 'Deletion Summary:';
    RAISE NOTICE '  ✅ Successfully deleted: % users', deleted_count;
    RAISE NOTICE '  ❌ Failed: % users', error_count;
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
*/

-- Option 3: Delete by user ID (if you know the specific IDs)
-- Replace the UUIDs with your test user IDs:
/*
DO $$
DECLARE
    test_user_ids UUID[] := ARRAY[
        'YOUR_USER_ID_1'::UUID,
        'YOUR_USER_ID_2'::UUID,
        'YOUR_USER_ID_3'::UUID
    ];
    test_user_id UUID;
    deleted_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    FOREACH test_user_id IN ARRAY test_user_ids
    LOOP
        BEGIN
            -- 1. Clear player claims
            UPDATE players
            SET claimed_by_user_id = NULL,
                is_active = FALSE
            WHERE claimed_by_user_id = test_user_id;

            -- 2. Delete profile
            DELETE FROM profiles
            WHERE id = test_user_id;

            -- 3. Delete auth user
            DELETE FROM auth.users
            WHERE id = test_user_id;

            deleted_count := deleted_count + 1;
            RAISE NOTICE '✅ Deleted user ID: %', test_user_id;
        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                RAISE WARNING '❌ Failed to delete user ID %: %', test_user_id, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE 'Deletion Summary:';
    RAISE NOTICE '  ✅ Successfully deleted: % users', deleted_count;
    RAISE NOTICE '  ❌ Failed: % users', error_count;
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
*/

-- ============================================================================
-- Verification: Check remaining test users
-- ============================================================================
-- Run this query after deletion to verify and see what test users remain
SELECT
    u.id,
    u.email,
    u.created_at,
    p.profile_claim_status,
    p.first_name,
    p.last_name,
    (SELECT COUNT(*)
    FROM players
    WHERE claimed_by_user_id = u.id) as linked_players
FROM auth.users u
    LEFT JOIN profiles p ON p.id = u.id
WHERE u.email LIKE '%test%'
    OR u.email LIKE '%@example.com'
    OR u.email LIKE 'test-%'
    OR u.email LIKE 'test.%'
ORDER BY u.created_at DESC;

-- ============================================================================
-- Notes:
-- ============================================================================
-- 1. The script handles foreign key constraints by deleting in the correct order:
--    - First: Clear player claims (UPDATE players)
--    - Second: Delete profiles (DELETE FROM profiles)
--    - Third: Delete auth users (DELETE FROM auth.users)
--
-- 2. Player records are NOT deleted, only their claimed_by_user_id is set to NULL
--    and is_active is set to FALSE. This preserves the player data.
--
-- 3. If you encounter errors, check:
--    - Foreign key constraints (the script handles these)
--    - RLS policies (may need to run as service_role)
--    - User permissions (must have DELETE on auth.users)
--
-- 4. To run as service_role in Supabase SQL Editor:
--    - The SQL Editor already runs with elevated privileges
--    - If using a client, ensure you're using the service_role key
-- ============================================================================
